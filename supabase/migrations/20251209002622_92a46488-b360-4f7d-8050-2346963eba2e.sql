-- Fix post_goods_receipt function to use correct column names
CREATE OR REPLACE FUNCTION post_goods_receipt(p_grn_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grn RECORD;
  v_item RECORD;
  v_batch_id UUID;
  v_total_ordered NUMERIC;
  v_total_received NUMERIC;
  v_result JSONB;
BEGIN
  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'inventory_manager']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات الترحيل';
  END IF;

  -- Get GRN details with supplier currency
  SELECT gr.*, s.currency_code as supplier_currency
  INTO v_grn 
  FROM goods_receipts gr
  LEFT JOIN suppliers s ON s.id = gr.supplier_id
  WHERE gr.id = p_grn_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'استلام البضاعة غير موجود';
  END IF;
  
  IF v_grn.status = 'posted' THEN
    RAISE EXCEPTION 'تم ترحيل استلام البضاعة مسبقاً';
  END IF;
  
  -- Update GRN status
  UPDATE goods_receipts 
  SET status = 'posted',
      posted_at = now(),
      posted_by = auth.uid()
  WHERE id = p_grn_id;
  
  -- Process each GRN item
  FOR v_item IN 
    SELECT gi.*, p.name as product_name
    FROM grn_items gi
    JOIN products p ON p.id = gi.item_id
    WHERE gi.grn_id = p_grn_id
  LOOP
    -- Calculate BC cost if not set
    IF v_item.unit_cost_bc IS NULL OR v_item.unit_cost_bc = 0 THEN
      UPDATE grn_items 
      SET unit_cost_bc = unit_cost * COALESCE(v_grn.exchange_rate, 1),
          unit_cost_fc = unit_cost,
          line_total_fc = qty_received * unit_cost,
          line_total_bc = qty_received * unit_cost * COALESCE(v_grn.exchange_rate, 1)
      WHERE id = v_item.id;
    END IF;
    
    -- Create inventory cost layer (FIFO) with correct column names
    INSERT INTO inventory_cost_layers (
      product_id,
      warehouse_id,
      batch_number,
      expiry_date,
      quantity_original,
      quantity_remaining,
      unit_cost,
      unit_cost_fc,
      currency_code,
      exchange_rate_at_receipt,
      source_document_type,
      source_document_id,
      source_document_number,
      received_date,
      created_at,
      created_by
    ) VALUES (
      v_item.item_id,
      v_grn.warehouse_id,
      v_item.lot_no,
      v_item.expiry_date,
      v_item.qty_received,
      v_item.qty_received,
      COALESCE(v_item.unit_cost_bc, v_item.unit_cost * COALESCE(v_grn.exchange_rate, 1)),
      v_item.unit_cost,
      COALESCE(v_grn.currency_code, 'YER'),
      COALESCE(v_grn.exchange_rate, 1),
      'grn',
      p_grn_id,
      v_grn.grn_number,
      COALESCE(v_grn.received_at::date, CURRENT_DATE),
      now(),
      auth.uid()
    ) RETURNING id INTO v_batch_id;
    
    -- Update warehouse stock
    INSERT INTO warehouse_stock (
      warehouse_id,
      item_id,
      uom_id,
      qty_on_hand,
      qty_reserved,
      qty_inbound,
      qty_outbound,
      last_updated
    ) VALUES (
      v_grn.warehouse_id,
      v_item.item_id,
      v_item.uom_id,
      v_item.qty_received,
      0,
      0,
      0,
      now()
    )
    ON CONFLICT (warehouse_id, item_id, uom_id) 
    DO UPDATE SET
      qty_on_hand = warehouse_stock.qty_on_hand + EXCLUDED.qty_on_hand,
      last_updated = now();
    
    -- Create stock ledger entry with BC cost
    INSERT INTO stock_ledger (
      warehouse_id,
      item_id,
      batch_id,
      ref_type,
      ref_id,
      qty_in,
      qty_out,
      unit_cost,
      currency,
      created_by,
      created_at,
      note
    ) VALUES (
      v_grn.warehouse_id,
      v_item.item_id,
      v_batch_id,
      'grn',
      p_grn_id,
      v_item.qty_received,
      0,
      COALESCE(v_item.unit_cost_bc, v_item.unit_cost * COALESCE(v_grn.exchange_rate, 1)),
      'YER',
      auth.uid(),
      now(),
      'استلام بضاعة: ' || v_grn.grn_number
    );
    
    -- Update PO item received quantity
    IF v_item.po_item_id IS NOT NULL THEN
      UPDATE po_items
      SET qty_received = COALESCE(qty_received, 0) + v_item.qty_received
      WHERE id = v_item.po_item_id;
    END IF;
  END LOOP;
  
  -- Update PO status if linked
  IF v_grn.po_id IS NOT NULL THEN
    -- Get total ordered and received
    SELECT 
      COALESCE(SUM(qty_ordered), 0),
      COALESCE(SUM(qty_received), 0)
    INTO v_total_ordered, v_total_received
    FROM po_items 
    WHERE po_id = v_grn.po_id;
    
    -- Update PO status based on received quantities
    IF v_total_received >= v_total_ordered THEN
      UPDATE purchase_orders SET status = 'completed' WHERE id = v_grn.po_id;
    ELSIF v_total_received > 0 THEN
      UPDATE purchase_orders SET status = 'partial' WHERE id = v_grn.po_id;
    END IF;
  END IF;
  
  -- Calculate and update GRN totals
  UPDATE goods_receipts gr
  SET total_amount_fc = (
        SELECT COALESCE(SUM(gi.qty_received * gi.unit_cost), 0) 
        FROM grn_items gi WHERE gi.grn_id = gr.id
      ),
      total_amount_bc = (
        SELECT COALESCE(SUM(gi.qty_received * gi.unit_cost * COALESCE(gr.exchange_rate, 1)), 0) 
        FROM grn_items gi WHERE gi.grn_id = gr.id
      )
  WHERE gr.id = p_grn_id;
  
  v_result := jsonb_build_object(
    'success', true,
    'grn_id', p_grn_id,
    'grn_number', v_grn.grn_number,
    'message', 'تم ترحيل استلام البضاعة وتحديث المخزون بنجاح'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في ترحيل استلام البضاعة: %', SQLERRM;
END;
$$;

-- Fix post_purchase_return to update inventory (consume FIFO layers and reduce stock)
CREATE OR REPLACE FUNCTION post_purchase_return(p_return_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_return RECORD;
  v_item RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_mapping_return RECORD;
  v_mapping_tax RECORD;
  v_line_no INTEGER := 0;
  v_total_cost_reversed NUMERIC := 0;
  v_item_cost NUMERIC;
  v_debit_note_number TEXT;
BEGIN
  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'inventory_manager']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات إدارة المشتريات';
  END IF;

  -- Get return details
  SELECT pr.*, s.name as supplier_name, pi.currency_code, pi.exchange_rate
  INTO v_return 
  FROM purchase_returns pr
  LEFT JOIN suppliers s ON s.id = pr.supplier_id
  LEFT JOIN purchase_invoices pi ON pi.id = pr.purchase_invoice_id
  WHERE pr.id = p_return_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'مرتجع المشتريات غير موجود';
  END IF;
  
  IF v_return.status = 'posted' THEN
    RAISE EXCEPTION 'المرتجع مرحّل مسبقاً';
  END IF;

  -- Validate posting period
  PERFORM validate_posting_period(v_return.return_date);

  -- Check for existing GL entry
  IF EXISTS (SELECT 1 FROM gl_journal_entries WHERE source_document_id = p_return_id::text AND source_module = 'purchase_returns') THEN
    RAISE EXCEPTION 'تم إنشاء قيد محاسبي لهذا المرتجع مسبقاً';
  END IF;

  -- Generate debit note number
  SELECT 'DN-' || LPAD((COALESCE(MAX(CAST(NULLIF(REPLACE(debit_note_number, 'DN-', ''), '') AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  INTO v_debit_note_number
  FROM purchase_returns
  WHERE debit_note_number IS NOT NULL;

  -- Process each return item - update inventory
  FOR v_item IN 
    SELECT pri.*, p.name as product_name
    FROM purchase_return_items pri
    JOIN products p ON p.id = pri.item_id
    WHERE pri.return_id = p_return_id
  LOOP
    -- Calculate item cost (use FIFO layer cost if available)
    SELECT COALESCE(AVG(unit_cost), v_item.unit_cost)
    INTO v_item_cost
    FROM inventory_cost_layers
    WHERE product_id = v_item.item_id 
      AND warehouse_id = v_return.warehouse_id
      AND quantity_remaining > 0;

    -- Reduce inventory cost layers (FIFO consumption in reverse)
    -- For returns, we remove from the most recent layers first (LIFO for returns)
    WITH layers_to_consume AS (
      SELECT id, quantity_remaining, unit_cost,
             LEAST(quantity_remaining, 
               v_item.quantity - COALESCE(
                 (SELECT SUM(quantity_remaining) 
                  FROM inventory_cost_layers icl2 
                  WHERE icl2.product_id = v_item.item_id 
                    AND icl2.warehouse_id = v_return.warehouse_id
                    AND icl2.created_at > inventory_cost_layers.created_at
                    AND icl2.quantity_remaining > 0), 0)) as qty_to_consume
      FROM inventory_cost_layers
      WHERE product_id = v_item.item_id 
        AND warehouse_id = v_return.warehouse_id
        AND quantity_remaining > 0
      ORDER BY created_at DESC
    )
    UPDATE inventory_cost_layers icl
    SET quantity_remaining = quantity_remaining - ltc.qty_to_consume
    FROM layers_to_consume ltc
    WHERE icl.id = ltc.id AND ltc.qty_to_consume > 0;

    -- Update warehouse stock - reduce quantity
    UPDATE warehouse_stock
    SET qty_on_hand = qty_on_hand - v_item.quantity,
        last_updated = now()
    WHERE warehouse_id = v_return.warehouse_id 
      AND item_id = v_item.item_id;

    -- Create stock ledger entry for the return
    INSERT INTO stock_ledger (
      warehouse_id,
      item_id,
      ref_type,
      ref_id,
      qty_in,
      qty_out,
      unit_cost,
      currency,
      created_by,
      created_at,
      note
    ) VALUES (
      v_return.warehouse_id,
      v_item.item_id,
      'purchase_return',
      p_return_id,
      0,
      v_item.quantity,
      v_item_cost,
      'YER',
      auth.uid(),
      now(),
      'مرتجع مشتريات: ' || v_return.return_number
    );

    -- Track total cost reversed
    v_total_cost_reversed := v_total_cost_reversed + (v_item.quantity * v_item_cost);
  END LOOP;

  -- Get account mappings
  SELECT * INTO v_mapping_return FROM erp_account_mappings 
  WHERE module = 'purchase_returns' AND operation = 'purchase_return' AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_tax FROM erp_account_mappings 
  WHERE module = 'purchase_returns' AND operation = 'return_tax' AND is_active = true LIMIT 1;

  IF v_mapping_return.debit_account_id IS NULL OR v_mapping_return.credit_account_id IS NULL THEN
    RAISE EXCEPTION 'ربط الحسابات غير مكوّن لمرتجعات المشتريات';
  END IF;

  -- Generate journal entry number
  v_je_number := (SELECT generate_journal_entry_number());

  -- Create journal entry
  INSERT INTO gl_journal_entries (
    entry_no, entry_date, posting_date, description,
    source_module, source_document_id, is_posted, is_reversed, created_by
  ) VALUES (
    v_je_number,
    v_return.return_date,
    CURRENT_DATE,
    'مرتجع مشتريات رقم: ' || v_return.return_number || ' - ' || COALESCE(v_return.supplier_name, ''),
    'purchase_returns',
    p_return_id::TEXT,
    true, false, auth.uid()
  ) RETURNING id INTO v_je_id;

  -- Journal lines
  -- Debit: Accounts Payable (reduce supplier balance)
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
  VALUES (v_je_id, v_line_no, v_mapping_return.debit_account_id, v_return.total_amount, 0, 'تخفيض ذمم دائنة');

  -- Credit: Inventory/Purchases (reduce inventory value)
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
  VALUES (v_je_id, v_line_no, v_mapping_return.credit_account_id, 0, 
    v_return.total_amount - COALESCE(v_return.tax_amount, 0), 'مرتجع مشتريات');

  -- Credit: VAT Input (reverse input tax if any)
  IF COALESCE(v_return.tax_amount, 0) > 0 AND v_mapping_tax.credit_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_mapping_tax.credit_account_id, 0, v_return.tax_amount, 'عكس ضريبة مدخلات');
  END IF;

  -- Update return status with debit note number
  UPDATE purchase_returns 
  SET status = 'posted', 
      posted_at = NOW(), 
      posted_by = auth.uid(),
      debit_note_number = v_debit_note_number,
      total_cost_reversed = v_total_cost_reversed,
      journal_entry_id = v_je_id
  WHERE id = p_return_id;

  -- Update supplier balance
  IF v_return.supplier_id IS NOT NULL THEN
    UPDATE suppliers
    SET balance = balance - v_return.total_amount
    WHERE id = v_return.supplier_id;
  END IF;

  -- Link document to GL
  INSERT INTO document_gl_entries (
    document_type, document_id, document_number, document_amount, journal_entry_id, status
  ) VALUES (
    'purchase_return', p_return_id, v_return.return_number, v_return.total_amount, v_je_id, 'posted'
  );

  RETURN jsonb_build_object(
    'success', true,
    'return_id', p_return_id,
    'debit_note_number', v_debit_note_number,
    'total_cost_reversed', v_total_cost_reversed,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'total_amount', v_return.total_amount,
    'message', 'تم ترحيل مرتجع المشتريات بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في ترحيل مرتجع المشتريات: %', SQLERRM;
END;
$$;

-- Add missing columns to purchase_returns if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_returns' AND column_name = 'debit_note_number') THEN
    ALTER TABLE purchase_returns ADD COLUMN debit_note_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_returns' AND column_name = 'total_cost_reversed') THEN
    ALTER TABLE purchase_returns ADD COLUMN total_cost_reversed NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_returns' AND column_name = 'journal_entry_id') THEN
    ALTER TABLE purchase_returns ADD COLUMN journal_entry_id UUID REFERENCES gl_journal_entries(id);
  END IF;
END$$;

-- Add period validation to post_purchase_invoice
CREATE OR REPLACE FUNCTION post_purchase_invoice(p_invoice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_mapping_purchase RECORD;
  v_mapping_tax RECORD;
  v_mapping_payable RECORD;
  v_line_no INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'inventory_manager']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات الترحيل';
  END IF;

  -- Get invoice details
  SELECT pi.*, s.name as supplier_name 
  INTO v_invoice 
  FROM purchase_invoices pi
  LEFT JOIN suppliers s ON s.id = pi.supplier_id
  WHERE pi.id = p_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'فاتورة الشراء غير موجودة';
  END IF;
  
  IF v_invoice.status = 'posted' THEN
    RAISE EXCEPTION 'الفاتورة مرحّلة مسبقاً';
  END IF;

  -- Validate posting period
  PERFORM validate_posting_period(v_invoice.invoice_date);

  -- Check for existing GL entry
  IF EXISTS (SELECT 1 FROM gl_journal_entries WHERE source_document_id = p_invoice_id::text AND source_module = 'purchase_invoices') THEN
    RAISE EXCEPTION 'تم إنشاء قيد محاسبي لهذه الفاتورة مسبقاً';
  END IF;

  -- Get account mappings
  SELECT * INTO v_mapping_purchase FROM erp_account_mappings 
  WHERE module = 'purchases' AND operation = 'purchase_invoice' AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_tax FROM erp_account_mappings 
  WHERE module = 'purchases' AND operation = 'purchase_tax' AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_payable FROM erp_account_mappings 
  WHERE module = 'purchases' AND operation = 'accounts_payable' AND is_active = true LIMIT 1;

  IF v_mapping_purchase.debit_account_id IS NULL THEN
    -- Fallback to default accounts
    SELECT id INTO v_mapping_purchase.debit_account_id FROM gl_accounts WHERE account_code = '1310' LIMIT 1;
  END IF;
  
  IF v_mapping_payable.credit_account_id IS NULL THEN
    SELECT id INTO v_mapping_payable.credit_account_id FROM gl_accounts WHERE account_code = '2110' LIMIT 1;
  END IF;

  -- Generate journal entry number
  v_je_number := (SELECT generate_journal_entry_number());

  -- Create journal entry with dual currency support
  INSERT INTO gl_journal_entries (
    entry_no, entry_date, posting_date, description,
    source_module, source_document_id, is_posted, is_reversed, created_by
  ) VALUES (
    v_je_number,
    v_invoice.invoice_date,
    CURRENT_DATE,
    'فاتورة شراء رقم: ' || v_invoice.pi_number || ' - ' || COALESCE(v_invoice.supplier_name, ''),
    'purchase_invoices',
    p_invoice_id::TEXT,
    true, false, auth.uid()
  ) RETURNING id INTO v_je_id;

  -- Debit: Inventory/Purchases (subtotal in BC)
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (
    journal_id, line_no, account_id, 
    debit, credit, 
    debit_fc, credit_fc, debit_bc, credit_bc,
    currency_code, exchange_rate, description
  ) VALUES (
    v_je_id, v_line_no, v_mapping_purchase.debit_account_id,
    COALESCE(v_invoice.subtotal_bc, v_invoice.subtotal), 0,
    v_invoice.subtotal_fc, 0, COALESCE(v_invoice.subtotal_bc, v_invoice.subtotal), 0,
    COALESCE(v_invoice.currency_code, 'YER'), COALESCE(v_invoice.exchange_rate, 1),
    'مشتريات'
  );

  -- Debit: VAT Input (tax amount in BC)
  IF COALESCE(v_invoice.tax_amount, 0) > 0 THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (
      journal_id, line_no, account_id, 
      debit, credit,
      debit_fc, credit_fc, debit_bc, credit_bc,
      currency_code, exchange_rate, description
    ) VALUES (
      v_je_id, v_line_no, 
      COALESCE(v_mapping_tax.debit_account_id, (SELECT id FROM gl_accounts WHERE account_code = '1320' LIMIT 1)),
      COALESCE(v_invoice.tax_amount_bc, v_invoice.tax_amount), 0,
      v_invoice.tax_amount_fc, 0, COALESCE(v_invoice.tax_amount_bc, v_invoice.tax_amount), 0,
      COALESCE(v_invoice.currency_code, 'YER'), COALESCE(v_invoice.exchange_rate, 1),
      'ضريبة مدخلات'
    );
  END IF;

  -- Credit: Accounts Payable (total in BC)
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (
    journal_id, line_no, account_id, 
    debit, credit,
    debit_fc, credit_fc, debit_bc, credit_bc,
    currency_code, exchange_rate, description
  ) VALUES (
    v_je_id, v_line_no, v_mapping_payable.credit_account_id,
    0, COALESCE(v_invoice.total_amount_bc, v_invoice.total_amount),
    0, v_invoice.total_amount_fc, 0, COALESCE(v_invoice.total_amount_bc, v_invoice.total_amount),
    COALESCE(v_invoice.currency_code, 'YER'), COALESCE(v_invoice.exchange_rate, 1),
    'ذمم دائنة'
  );

  -- Update invoice status
  UPDATE purchase_invoices 
  SET status = 'posted', posted_at = NOW(), posted_by = auth.uid()
  WHERE id = p_invoice_id;

  -- Update supplier balance (in BC)
  IF v_invoice.supplier_id IS NOT NULL THEN
    UPDATE suppliers
    SET balance = balance + COALESCE(v_invoice.total_amount_bc, v_invoice.total_amount)
    WHERE id = v_invoice.supplier_id;
  END IF;

  -- Link document to GL
  INSERT INTO document_gl_entries (
    document_type, document_id, document_number, document_amount, journal_entry_id, status
  ) VALUES (
    'purchase_invoice', p_invoice_id, v_invoice.pi_number, 
    COALESCE(v_invoice.total_amount_bc, v_invoice.total_amount), v_je_id, 'posted'
  );

  v_result := jsonb_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'pi_number', v_invoice.pi_number,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'total_amount', v_invoice.total_amount,
    'total_amount_bc', COALESCE(v_invoice.total_amount_bc, v_invoice.total_amount),
    'message', 'تم ترحيل فاتورة الشراء بنجاح'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في ترحيل فاتورة الشراء: %', SQLERRM;
END;
$$;

-- Create helper function to check duplicate supplier invoice
CREATE OR REPLACE FUNCTION check_duplicate_supplier_invoice(
  p_supplier_id UUID,
  p_supplier_invoice_no TEXT,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM purchase_invoices 
    WHERE supplier_id = p_supplier_id 
      AND supplier_invoice_no = p_supplier_invoice_no
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
  );
END;
$$;

-- Create function to get tax rate dynamically
CREATE OR REPLACE FUNCTION get_default_tax_rate()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  SELECT rate INTO v_rate
  FROM taxes
  WHERE is_active = true AND tax_code = 'VAT15'
  LIMIT 1;
  
  RETURN COALESCE(v_rate, 15) / 100;
END;
$$;