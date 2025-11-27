-- إصلاح خطأ أسماء الأعمدة في دالة post_sales_invoice
-- المشكلة: استخدام أسماء أعمدة خاطئة في journal_entry_lines
-- الصحيح: entry_id, debit_amount, credit_amount
-- الخطأ: journal_entry_id, debit, credit

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

  -- إنشاء قيد محاسبي تلقائي
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
         LPAD(NEXTVAL('journal_entry_sequence')::TEXT, 6, '0')
  INTO v_je_number;

  INSERT INTO journal_entries (
    entry_number,
    entry_date,
    posting_date,
    reference_type,
    reference_id,
    description,
    total_debit,
    total_credit,
    status,
    created_by,
    posted_by,
    posted_at
  ) VALUES (
    v_je_number,
    v_invoice.invoice_date,
    CURRENT_DATE,
    'sales_invoice',
    p_invoice_id,
    'Sales Invoice: ' || v_invoice.invoice_number,
    v_invoice.total_amount,
    v_invoice.total_amount,
    'posted',
    auth.uid(),
    auth.uid(),
    NOW()
  ) RETURNING id INTO v_je_id;

  -- إنشاء سطور القيد المحاسبي (تم تصحيح أسماء الأعمدة)
  -- مدين: حسابات العملاء
  INSERT INTO journal_entry_lines (
    entry_id,          -- ✅ تصحيح من journal_entry_id
    line_no,
    account_id,
    description,
    debit_amount,      -- ✅ تصحيح من debit
    credit_amount      -- ✅ تصحيح من credit
  )
  SELECT 
    v_je_id,
    1,
    (SELECT id FROM gl_accounts WHERE account_code = '1210' LIMIT 1),
    'Sales Invoice - Customer: ' || c.name,
    v_invoice.total_amount,
    0
  FROM customers c
  WHERE c.id = v_invoice.customer_id;

  -- دائن: الإيرادات
  INSERT INTO journal_entry_lines (
    entry_id,          -- ✅ تصحيح من journal_entry_id
    line_no,
    account_id,
    description,
    debit_amount,      -- ✅ تصحيح من debit
    credit_amount      -- ✅ تصحيح من credit
  ) VALUES (
    v_je_id,
    2,
    (SELECT id FROM gl_accounts WHERE account_code = '4100' LIMIT 1),
    'Sales Revenue',
    0,
    v_invoice.subtotal
  );

  -- دائن: الضرائب (إذا وجدت)
  IF v_invoice.tax_amount > 0 THEN
    INSERT INTO journal_entry_lines (
      entry_id,        -- ✅ تصحيح من journal_entry_id
      line_no,
      account_id,
      description,
      debit_amount,    -- ✅ تصحيح من debit
      credit_amount    -- ✅ تصحيح من credit
    ) VALUES (
      v_je_id,
      3,
      (SELECT id FROM gl_accounts WHERE account_code = '2310' LIMIT 1),
      'Sales Tax',
      0,
      v_invoice.tax_amount
    );
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
    'message', 'Invoice posted successfully'
  );

  RETURN v_result;
END;
$$;