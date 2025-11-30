-- ============================================================================
-- Update post_sales_invoice to use new GL system with account mappings
-- ============================================================================

CREATE OR REPLACE FUNCTION post_sales_invoice(p_invoice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice RECORD;
  v_item RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_current_stock NUMERIC;
  v_batch RECORD;
  v_remaining_qty NUMERIC;
  v_allocated_qty NUMERIC;
  v_result JSONB;
  v_operation TEXT;
  v_mapping RECORD;
  v_line_no INTEGER := 0;
BEGIN
  -- التحقق من صلاحيات المستخدم
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[]) THEN
    RAISE EXCEPTION 'Unauthorized: Posting permission required';
  END IF;

  -- جلب بيانات الفاتورة
  SELECT * INTO v_invoice
  FROM sales_invoices
  WHERE id = p_invoice_id AND status = 'draft';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found or already posted';
  END IF;

  -- التحقق من وجود مستودع
  IF v_invoice.warehouse_id IS NULL THEN
    RAISE EXCEPTION 'Warehouse is required for posting invoice';
  END IF;

  -- التحقق من وجود عناصر في الفاتورة
  IF NOT EXISTS (SELECT 1 FROM sales_invoice_items WHERE invoice_id = p_invoice_id) THEN
    RAISE EXCEPTION 'Invoice must have at least one item';
  END IF;

  -- التحقق من المخزون وتحديثه
  FOR v_item IN 
    SELECT sii.*, p.name as product_name
    FROM sales_invoice_items sii
    JOIN products p ON p.id = sii.item_id
    WHERE sii.invoice_id = p_invoice_id
  LOOP
    -- التحقق من توفر الكمية في المخزون
    SELECT COALESCE(SUM(qty_on_hand), 0) INTO v_current_stock
    FROM warehouse_stock
    WHERE item_id = v_item.item_id 
      AND warehouse_id = v_invoice.warehouse_id;
    
    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product: %. Available: %, Required: %', 
        v_item.product_name, v_current_stock, v_item.quantity;
    END IF;

    -- تخصيص المخزون من الدفعات (FIFO)
    v_remaining_qty := v_item.quantity;
    
    FOR v_batch IN
      SELECT pb.*
      FROM product_batches pb
      WHERE pb.product_id = v_item.item_id
        AND pb.quantity > 0
        AND pb.expiry_date > CURRENT_DATE
      ORDER BY pb.expiry_date ASC, pb.created_at ASC
    LOOP
      EXIT WHEN v_remaining_qty <= 0;
      
      v_allocated_qty := LEAST(v_remaining_qty, v_batch.quantity);
      
      UPDATE product_batches
      SET quantity = quantity - v_allocated_qty,
          updated_at = NOW()
      WHERE id = v_batch.id;
      
      INSERT INTO stock_ledger (
        product_id,
        warehouse_id,
        transaction_type,
        reference_type,
        reference_id,
        quantity_change,
        balance_after,
        unit_cost,
        batch_number,
        expiry_date,
        notes
      ) VALUES (
        v_item.item_id,
        v_invoice.warehouse_id,
        'OUT',
        'sales_invoice',
        p_invoice_id,
        -v_allocated_qty,
        v_batch.quantity - v_allocated_qty,
        v_item.unit_price,
        v_batch.batch_number,
        v_batch.expiry_date,
        'Sales Invoice: ' || v_invoice.invoice_number
      );
      
      v_remaining_qty := v_remaining_qty - v_allocated_qty;
    END LOOP;
    
    UPDATE warehouse_stock
    SET qty_on_hand = qty_on_hand - v_item.quantity,
        last_updated = NOW()
    WHERE item_id = v_item.item_id 
      AND warehouse_id = v_invoice.warehouse_id;
  END LOOP;

  -- ============================================================================
  -- إنشاء قيد محاسبي تلقائي باستخدام النظام المحاسبي الجديد
  -- ============================================================================

  -- تحديد نوع العملية (نقدي أو آجل)
  IF v_invoice.paid_amount >= v_invoice.total_amount THEN
    v_operation := 'invoice_cash';
  ELSE
    v_operation := 'invoice_credit';
  END IF;

  -- الحصول على ربط الحسابات من erp_account_mappings
  SELECT * INTO v_mapping
  FROM get_account_mapping('sales', v_operation, v_invoice.warehouse_id);

  IF v_mapping.debit_account_id IS NULL OR v_mapping.credit_account_id IS NULL THEN
    RAISE EXCEPTION 'Account mapping not configured for sales operation: %. Please configure in erp_account_mappings.', v_operation;
  END IF;

  -- توليد رقم القيد باستخدام الدالة الجديدة
  SELECT generate_journal_entry_number() INTO v_je_number;

  -- إنشاء رأس القيد المحاسبي في gl_journal_entries
  INSERT INTO gl_journal_entries (
    entry_no,
    entry_date,
    posting_date,
    description,
    source_module,
    source_document_id,
    branch_id,
    is_posted,
    is_reversed,
    created_by
  ) VALUES (
    v_je_number,
    v_invoice.invoice_date,
    CURRENT_DATE,
    'فاتورة مبيعات رقم: ' || v_invoice.invoice_number,
    'sales',
    p_invoice_id::TEXT,
    v_invoice.warehouse_id,
    TRUE,
    FALSE,
    auth.uid()
  ) RETURNING id INTO v_je_id;

  -- سطر 1: مدين (حسابات العملاء أو النقدية)
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (
    journal_id,
    account_id,
    debit,
    credit,
    description,
    branch_id,
    line_no
  )
  SELECT 
    v_je_id,
    v_mapping.debit_account_id,
    v_invoice.total_amount,
    0,
    'فاتورة مبيعات - عميل: ' || c.name,
    v_invoice.warehouse_id,
    v_line_no
  FROM customers c
  WHERE c.id = v_invoice.customer_id;

  -- سطر 2: دائن (الإيرادات)
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (
    journal_id,
    account_id,
    debit,
    credit,
    description,
    branch_id,
    line_no
  ) VALUES (
    v_je_id,
    v_mapping.credit_account_id,
    0,
    v_invoice.subtotal,
    'إيرادات مبيعات',
    v_invoice.warehouse_id,
    v_line_no
  );

  -- سطر 3: دائن (ضريبة القيمة المضافة إذا وجدت)
  IF v_invoice.tax_amount > 0 THEN
    v_line_no := v_line_no + 1;
    
    -- الحصول على حساب ضريبة المبيعات
    SELECT * INTO v_mapping
    FROM get_account_mapping('sales', 'sales_tax', v_invoice.warehouse_id);
    
    IF v_mapping.credit_account_id IS NOT NULL THEN
      INSERT INTO gl_journal_lines (
        journal_id,
        account_id,
        debit,
        credit,
        description,
        branch_id,
        line_no
      ) VALUES (
        v_je_id,
        v_mapping.credit_account_id,
        0,
        v_invoice.tax_amount,
        'ضريبة القيمة المضافة',
        v_invoice.warehouse_id,
        v_line_no
      );
    END IF;
  END IF;

  -- تحديث حالة الفاتورة
  UPDATE sales_invoices
  SET 
    status = 'posted',
    posted_by = auth.uid(),
    posted_at = NOW(),
    payment_status = CASE 
      WHEN paid_amount >= total_amount THEN 'paid'
      WHEN paid_amount > 0 THEN 'partial'
      ELSE 'unpaid'
    END
  WHERE id = p_invoice_id;

  v_result := jsonb_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'message', 'Invoice posted successfully with automatic GL entry'
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION post_sales_invoice IS 'ترحيل فاتورة مبيعات مع إنشاء قيد محاسبي تلقائي باستخدام erp_account_mappings';