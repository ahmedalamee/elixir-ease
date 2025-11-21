
-- تحديث دالة ترحيل فواتير المبيعات لتتوافق مع بنية الجداول الفعلية
CREATE OR REPLACE FUNCTION public.post_sales_invoice(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات الترحيل';
  END IF;

  -- جلب بيانات الفاتورة
  SELECT * INTO v_invoice
  FROM sales_invoices
  WHERE id = p_invoice_id AND status = 'draft';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الفاتورة غير موجودة أو مرحلة مسبقاً';
  END IF;

  -- التحقق من وجود مستودع
  IF v_invoice.warehouse_id IS NULL THEN
    RAISE EXCEPTION 'المستودع مطلوب لترحيل الفاتورة';
  END IF;

  -- التحقق من وجود بنود
  IF NOT EXISTS (SELECT 1 FROM sales_invoice_items WHERE invoice_id = p_invoice_id) THEN
    RAISE EXCEPTION 'يجب أن تحتوي الفاتورة على بند واحد على الأقل';
  END IF;

  -- التحقق من المخزون وتحديثه
  FOR v_item IN 
    SELECT sii.*, p.name as product_name
    FROM sales_invoice_items sii
    JOIN products p ON p.id = sii.item_id
    WHERE sii.invoice_id = p_invoice_id
  LOOP
    -- التحقق من توفر الكمية في المستودع
    SELECT COALESCE(qty_on_hand, 0) INTO v_current_stock
    FROM warehouse_stock
    WHERE item_id = v_item.item_id 
      AND warehouse_id = v_invoice.warehouse_id;
    
    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'كمية غير كافية للمنتج: %. المتوفر: %, المطلوب: %', 
        v_item.product_name, COALESCE(v_current_stock, 0), v_item.quantity;
    END IF;

    -- تخصيص المخزون من الدفعات (FIFO - حسب تاريخ الصلاحية)
    v_remaining_qty := v_item.quantity;
    
    FOR v_batch IN
      SELECT *
      FROM product_batches
      WHERE product_id = v_item.item_id
        AND quantity > 0
        AND expiry_date > CURRENT_DATE
        AND is_expired = false
      ORDER BY expiry_date ASC, created_at ASC
    LOOP
      EXIT WHEN v_remaining_qty <= 0;
      
      v_allocated_qty := LEAST(v_remaining_qty, v_batch.quantity);
      
      -- تحديث كمية الدفعة
      UPDATE product_batches
      SET quantity = quantity - v_allocated_qty,
          updated_at = NOW()
      WHERE id = v_batch.id;
      
      v_remaining_qty := v_remaining_qty - v_allocated_qty;
    END LOOP;
    
    -- تحديث المخزون الإجمالي
    UPDATE warehouse_stock
    SET qty_on_hand = qty_on_hand - v_item.quantity,
        last_updated = NOW()
    WHERE item_id = v_item.item_id 
      AND warehouse_id = v_invoice.warehouse_id;
      
    -- تحديث كمية المنتج الإجمالية
    UPDATE products
    SET quantity = quantity - v_item.quantity,
        updated_at = NOW()
    WHERE id = v_item.item_id;
  END LOOP;

  -- تحديث رصيد العميل ونقاط الولاء
  IF v_invoice.customer_id IS NOT NULL THEN
    UPDATE customers
    SET balance = balance + v_invoice.total_amount,
        loyalty_points = loyalty_points + FLOOR(v_invoice.total_amount / 10),
        last_transaction_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = v_invoice.customer_id;
  END IF;

  -- إنشاء رقم القيد المحاسبي
  v_je_number := 'JE-' || LPAD(
    (SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1 
     FROM journal_entries WHERE entry_number LIKE 'JE-%')::TEXT, 
    6, '0'
  );

  -- إنشاء القيد المحاسبي
  INSERT INTO journal_entries (
    entry_number,
    entry_date,
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
    'SALES_INVOICE',
    p_invoice_id,
    'قيد فاتورة مبيعات: ' || v_invoice.invoice_number,
    v_invoice.total_amount,
    v_invoice.total_amount,
    'posted',
    auth.uid(),
    auth.uid(),
    NOW()
  ) RETURNING id INTO v_je_id;

  -- سطور القيد - مدين (حساب العميل)
  INSERT INTO journal_entry_lines (
    entry_id,
    line_no,
    account_id,
    description,
    debit_amount,
    credit_amount
  )
  SELECT 
    v_je_id,
    1,
    (SELECT id FROM gl_accounts WHERE account_code = '1210' LIMIT 1),
    'فاتورة مبيعات: ' || v_invoice.invoice_number,
    v_invoice.total_amount,
    0
  WHERE EXISTS (SELECT 1 FROM gl_accounts WHERE account_code = '1210');

  -- دائن (حساب المبيعات)
  INSERT INTO journal_entry_lines (
    entry_id,
    line_no,
    account_id,
    description,
    debit_amount,
    credit_amount
  )
  SELECT 
    v_je_id,
    2,
    (SELECT id FROM gl_accounts WHERE account_code = '4010' LIMIT 1),
    'فاتورة مبيعات: ' || v_invoice.invoice_number,
    0,
    v_invoice.subtotal
  WHERE EXISTS (SELECT 1 FROM gl_accounts WHERE account_code = '4010');

  -- سطر الضريبة
  IF v_invoice.tax_amount > 0 THEN
    INSERT INTO journal_entry_lines (
      entry_id,
      line_no,
      account_id,
      description,
      debit_amount,
      credit_amount
    )
    SELECT 
      v_je_id,
      3,
      (SELECT id FROM gl_accounts WHERE account_code = '2310' LIMIT 1),
      'ضريبة فاتورة: ' || v_invoice.invoice_number,
      0,
      v_invoice.tax_amount
    WHERE EXISTS (SELECT 1 FROM gl_accounts WHERE account_code = '2310');
  END IF;

  -- ربط القيد بالفاتورة
  INSERT INTO document_gl_entries (
    document_type,
    document_id,
    document_number,
    document_amount,
    journal_entry_id,
    status
  ) VALUES (
    'SALES_INVOICE',
    p_invoice_id,
    v_invoice.invoice_number,
    v_invoice.total_amount,
    v_je_id,
    'success'
  );

  -- تحديث حالة الفاتورة
  UPDATE sales_invoices
  SET status = 'posted',
      posted_by = auth.uid(),
      posted_at = NOW(),
      payment_status = CASE 
        WHEN paid_amount >= total_amount THEN 'paid'
        WHEN paid_amount > 0 THEN 'partial'
        ELSE 'unpaid'
      END,
      updated_at = NOW()
  WHERE id = p_invoice_id;

  v_result := jsonb_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'message', 'تم ترحيل الفاتورة بنجاح'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- تسجيل الخطأ
    INSERT INTO document_gl_entries (
      document_type,
      document_id,
      document_number,
      document_amount,
      status,
      error_message
    ) VALUES (
      'SALES_INVOICE',
      p_invoice_id,
      COALESCE(v_invoice.invoice_number, 'UNKNOWN'),
      COALESCE(v_invoice.total_amount, 0),
      'failed',
      SQLERRM
    );
    RAISE;
END;
$function$;
