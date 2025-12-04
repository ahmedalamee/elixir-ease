
-- Phase 7: POS Auto GL Posting Implementation
-- ============================================

-- 1. Add pos_session_id to sales_invoices to link POS sales to sessions
ALTER TABLE sales_invoices 
ADD COLUMN IF NOT EXISTS pos_session_id UUID REFERENCES pos_sessions(id);

-- 2. Add is_posted column to pos_sessions
ALTER TABLE pos_sessions 
ADD COLUMN IF NOT EXISTS is_posted BOOLEAN DEFAULT FALSE;

-- 3. Add journal_entry_id to pos_sessions for audit trail
ALTER TABLE pos_sessions 
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES gl_journal_entries(id);

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_sales_invoices_pos_session 
ON sales_invoices(pos_session_id) WHERE pos_session_id IS NOT NULL;

-- 5. Drop and recreate the post_pos_session function with FIFO integration
DROP FUNCTION IF EXISTS post_pos_session(UUID, NUMERIC);
DROP FUNCTION IF EXISTS close_pos_session_with_gl(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION post_pos_session(
  p_session_id UUID,
  p_closing_cash NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_total_cash NUMERIC := 0;
  v_total_card NUMERIC := 0;
  v_total_tax NUMERIC := 0;
  v_total_revenue NUMERIC := 0;
  v_total_cogs NUMERIC := 0;
  v_mapping_cash RECORD;
  v_mapping_card RECORD;
  v_mapping_tax RECORD;
  v_mapping_cogs RECORD;
  v_line_no INTEGER := 0;
  v_invoice RECORD;
  v_item RECORD;
  v_item_cogs NUMERIC;
  v_cash_account_id UUID;
  v_card_account_id UUID;
  v_revenue_account_id UUID;
  v_tax_account_id UUID;
  v_cogs_account_id UUID;
  v_inventory_account_id UUID;
BEGIN
  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات إغلاق الجلسة';
  END IF;

  -- Get session details
  SELECT * INTO v_session FROM pos_sessions WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الجلسة غير موجودة: %', p_session_id;
  END IF;
  
  IF v_session.status = 'closed' THEN
    RAISE EXCEPTION 'الجلسة مغلقة مسبقاً';
  END IF;
  
  IF v_session.is_posted = TRUE THEN
    RAISE EXCEPTION 'الجلسة مرحلة مسبقاً';
  END IF;

  -- Validate posting period
  BEGIN
    PERFORM validate_posting_period(COALESCE(v_session.session_date, CURRENT_DATE));
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'فترة الترحيل مغلقة: %', SQLERRM;
  END;

  -- Get account mappings for POS
  SELECT * INTO v_mapping_cash FROM erp_account_mappings 
  WHERE module = 'pos' AND operation = 'cash_sale' AND is_active = true LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على ربط حساب المبيعات النقدية لـ POS';
  END IF;
  
  SELECT * INTO v_mapping_card FROM erp_account_mappings 
  WHERE module = 'pos' AND operation = 'card_sale' AND is_active = true LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على ربط حساب المبيعات بالبطاقة لـ POS';
  END IF;
  
  SELECT * INTO v_mapping_tax FROM erp_account_mappings 
  WHERE module = 'pos' AND operation = 'sales_tax' AND is_active = true LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على ربط حساب ضريبة المبيعات لـ POS';
  END IF;
  
  SELECT * INTO v_mapping_cogs FROM erp_account_mappings 
  WHERE module = 'pos' AND operation = 'cost_of_goods_sold' AND is_active = true LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على ربط حساب تكلفة البضاعة المباعة لـ POS';
  END IF;

  -- Set account IDs
  v_cash_account_id := v_mapping_cash.debit_account_id;
  v_card_account_id := v_mapping_card.debit_account_id;
  v_revenue_account_id := v_mapping_cash.credit_account_id;
  v_tax_account_id := v_mapping_tax.credit_account_id;
  v_cogs_account_id := v_mapping_cogs.debit_account_id;
  v_inventory_account_id := v_mapping_cogs.credit_account_id;

  -- Calculate totals from sales_invoices linked to this session
  -- OR invoices created during session period if not linked
  FOR v_invoice IN
    SELECT 
      si.id,
      si.invoice_number,
      si.total_amount,
      si.tax_amount,
      si.discount_amount,
      si.subtotal,
      si.warehouse_id,
      pm.name as payment_method_name
    FROM sales_invoices si
    LEFT JOIN payment_methods pm ON si.payment_method_id = pm.id
    WHERE si.pos_session_id = p_session_id
      AND si.status = 'posted'
  LOOP
    -- Calculate totals by payment type
    IF LOWER(COALESCE(v_invoice.payment_method_name, 'نقدي')) IN ('نقدي', 'cash', 'نقد') THEN
      v_total_cash := v_total_cash + v_invoice.total_amount;
    ELSE
      v_total_card := v_total_card + v_invoice.total_amount;
    END IF;
    
    v_total_tax := v_total_tax + COALESCE(v_invoice.tax_amount, 0);
    v_total_revenue := v_total_revenue + (v_invoice.total_amount - COALESCE(v_invoice.tax_amount, 0));
    
    -- Calculate COGS using FIFO for each item in the invoice
    FOR v_item IN
      SELECT 
        sii.item_id,
        sii.quantity,
        p.name as product_name
      FROM sales_invoice_items sii
      JOIN products p ON sii.item_id = p.id
      WHERE sii.invoice_id = v_invoice.id
    LOOP
      -- Use FIFO to calculate cost for this item
      BEGIN
        SELECT COALESCE(SUM(layer_cost), 0) INTO v_item_cogs
        FROM (
          SELECT 
            CASE 
              WHEN running_qty <= v_item.quantity THEN remaining_quantity * unit_cost
              ELSE (v_item.quantity - (running_qty - remaining_quantity)) * unit_cost
            END as layer_cost
          FROM (
            SELECT 
              icl.id,
              icl.unit_cost,
              icl.remaining_quantity,
              SUM(icl.remaining_quantity) OVER (ORDER BY icl.received_date, icl.created_at) as running_qty
            FROM inventory_cost_layers icl
            WHERE icl.product_id = v_item.item_id
              AND icl.warehouse_id = v_invoice.warehouse_id
              AND icl.remaining_quantity > 0
            ORDER BY icl.received_date, icl.created_at
          ) layers
          WHERE running_qty - remaining_quantity < v_item.quantity
        ) cost_calc;
        
        v_total_cogs := v_total_cogs + COALESCE(v_item_cogs, 0);
      EXCEPTION WHEN OTHERS THEN
        -- Log error but continue with zero cost for this item
        RAISE WARNING 'خطأ في حساب تكلفة المنتج %: %', v_item.product_name, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  -- Skip GL if no transactions
  IF v_total_cash + v_total_card = 0 THEN
    UPDATE pos_sessions 
    SET status = 'closed',
        end_time = NOW(),
        closing_cash = p_closing_cash,
        is_posted = TRUE
    WHERE id = p_session_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'session_id', p_session_id,
      'message', 'تم إغلاق الجلسة بدون حركات مبيعات'
    );
  END IF;

  -- Generate journal entry number
  v_je_number := generate_journal_entry_number();

  -- Create journal entry header
  INSERT INTO gl_journal_entries (
    entry_no, 
    entry_date, 
    posting_date, 
    description,
    source_module, 
    source_document_id, 
    is_posted, 
    is_reversed, 
    created_by
  ) VALUES (
    v_je_number,
    COALESCE(v_session.session_date, CURRENT_DATE),
    CURRENT_DATE,
    'إغلاق جلسة POS رقم: ' || v_session.session_number,
    'pos',
    p_session_id::TEXT,
    true, 
    false, 
    auth.uid()
  ) RETURNING id INTO v_je_id;

  -- ==========================================
  -- Journal Lines - Debit Side
  -- ==========================================
  
  -- 1. Cash sales (Debit: Cash)
  IF v_total_cash > 0 AND v_cash_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_cash_account_id, v_total_cash, 0, 'مبيعات نقدية POS');
  END IF;
  
  -- 2. Card sales (Debit: Card Receivables)
  IF v_total_card > 0 AND v_card_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_card_account_id, v_total_card, 0, 'مبيعات بطاقة POS');
  END IF;
  
  -- 3. COGS (Debit: Cost of Goods Sold)
  IF v_total_cogs > 0 AND v_cogs_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_cogs_account_id, v_total_cogs, 0, 'تكلفة البضاعة المباعة POS');
  END IF;

  -- ==========================================
  -- Journal Lines - Credit Side
  -- ==========================================
  
  -- 4. Revenue (Credit: Sales Revenue)
  IF v_total_revenue > 0 AND v_revenue_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_revenue_account_id, 0, v_total_revenue, 'إيرادات مبيعات POS');
  END IF;
  
  -- 5. VAT (Credit: VAT Payable)
  IF v_total_tax > 0 AND v_tax_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_tax_account_id, 0, v_total_tax, 'ضريبة مخرجات POS');
  END IF;
  
  -- 6. Inventory (Credit: Inventory for COGS)
  IF v_total_cogs > 0 AND v_inventory_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_inventory_account_id, 0, v_total_cogs, 'تخفيض المخزون POS');
  END IF;

  -- Update session status
  UPDATE pos_sessions 
  SET status = 'closed',
      end_time = NOW(),
      closing_cash = p_closing_cash,
      expected_cash = v_session.opening_cash + v_total_cash,
      cash_difference = p_closing_cash - (v_session.opening_cash + v_total_cash),
      total_sales = v_total_cash + v_total_card,
      is_posted = TRUE,
      journal_entry_id = v_je_id,
      closed_by = auth.uid()
  WHERE id = p_session_id;

  -- Write audit log
  INSERT INTO audit_log (table_name, record_id, operation, changed_by, old_data, new_data)
  VALUES (
    'pos_sessions',
    p_session_id::TEXT,
    'POST',
    auth.uid(),
    jsonb_build_object('status', v_session.status, 'is_posted', v_session.is_posted),
    jsonb_build_object(
      'status', 'closed',
      'is_posted', true,
      'journal_entry_id', v_je_id,
      'total_cash', v_total_cash,
      'total_card', v_total_card,
      'total_cogs', v_total_cogs,
      'total_revenue', v_total_revenue,
      'total_tax', v_total_tax
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'total_cash_sales', v_total_cash,
    'total_card_sales', v_total_card,
    'total_cogs', v_total_cogs,
    'total_revenue', v_total_revenue,
    'total_tax', v_total_tax,
    'message', 'تم إغلاق وترحيل جلسة POS بنجاح'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'فشل ترحيل جلسة POS: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION post_pos_session(UUID, NUMERIC) TO authenticated;
