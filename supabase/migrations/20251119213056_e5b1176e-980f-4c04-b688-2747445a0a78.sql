-- =========================================
-- إكمال نظام المبيعات والتكامل مع الأنظمة الأخرى
-- =========================================

-- 1. إضافة عمود warehouse_id إلى جدول sales_invoices
ALTER TABLE public.sales_invoices 
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id);

-- 2. إضافة أعمدة للترحيل والمدفوعات
ALTER TABLE public.sales_invoices 
ADD COLUMN IF NOT EXISTS posted_by UUID,
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE;

-- 3. إنشاء دالة لترحيل فاتورة المبيعات
CREATE OR REPLACE FUNCTION public.post_sales_invoice(p_invoice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- التحقق من صلاحيات المستخدم (فقط admin و pharmacist و cashier)
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

  -- البدء في معاملة قاعدة البيانات
  -- التحقق من المخزون وتحديثه
  FOR v_item IN 
    SELECT sii.*, p.name as product_name
    FROM sales_invoice_items sii
    JOIN products p ON p.id = sii.product_id
    WHERE sii.invoice_id = p_invoice_id
  LOOP
    -- التحقق من توفر الكمية في المخزون
    SELECT COALESCE(SUM(current_quantity), 0) INTO v_current_stock
    FROM warehouse_stock
    WHERE product_id = v_item.product_id 
      AND warehouse_id = v_invoice.warehouse_id;
    
    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product: %. Available: %, Required: %', 
        v_item.product_name, v_current_stock, v_item.quantity;
    END IF;

    -- تخصيص المخزون من الدفعات (FIFO - أقدم دفعة أولاً)
    v_remaining_qty := v_item.quantity;
    
    FOR v_batch IN
      SELECT pb.*, ws.current_quantity
      FROM product_batches pb
      JOIN warehouse_stock ws ON ws.product_id = pb.product_id 
        AND ws.warehouse_id = v_invoice.warehouse_id
      WHERE pb.product_id = v_item.product_id
        AND pb.warehouse_id = v_invoice.warehouse_id
        AND ws.current_quantity > 0
        AND pb.expiry_date > CURRENT_DATE
      ORDER BY pb.expiry_date ASC, pb.created_at ASC
    LOOP
      EXIT WHEN v_remaining_qty <= 0;
      
      -- حساب الكمية المخصصة من هذه الدفعة
      v_allocated_qty := LEAST(v_remaining_qty, v_batch.current_quantity);
      
      -- تحديث كمية الدفعة
      UPDATE product_batches
      SET current_quantity = current_quantity - v_allocated_qty,
          updated_at = NOW()
      WHERE id = v_batch.id;
      
      -- تسجيل حركة المخزون
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
        v_item.product_id,
        v_invoice.warehouse_id,
        'OUT',
        'SALES_INVOICE',
        p_invoice_id,
        -v_allocated_qty,
        v_batch.current_quantity - v_allocated_qty,
        v_item.unit_price,
        v_batch.batch_number,
        v_batch.expiry_date,
        'Sales Invoice: ' || v_invoice.invoice_number
      );
      
      v_remaining_qty := v_remaining_qty - v_allocated_qty;
    END LOOP;
    
    -- تحديث المخزون الإجمالي
    UPDATE warehouse_stock
    SET current_quantity = current_quantity - v_item.quantity,
        last_update_date = NOW()
    WHERE product_id = v_item.product_id 
      AND warehouse_id = v_invoice.warehouse_id;
  END LOOP;

  -- تحديث رصيد العميل
  UPDATE customers
  SET balance = balance + v_invoice.total_amount,
      last_transaction_date = CURRENT_DATE
  WHERE id = v_invoice.customer_id;

  -- إنشاء قيد محاسبي تلقائي
  -- توليد رقم قيد
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
         LPAD(NEXTVAL('journal_entry_sequence')::TEXT, 6, '0')
  INTO v_je_number;

  -- إنشاء القيد
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
    'SALES_INVOICE',
    p_invoice_id,
    'قيد فاتورة مبيعات رقم: ' || v_invoice.invoice_number,
    v_invoice.total_amount,
    v_invoice.total_amount,
    'posted',
    auth.uid(),
    auth.uid(),
    NOW()
  ) RETURNING id INTO v_je_id;

  -- إضافة سطور القيد (مدين - حساب العميل)
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
    (SELECT id FROM gl_accounts WHERE account_code = '1210' LIMIT 1), -- حساب العملاء
    'فاتورة مبيعات رقم: ' || v_invoice.invoice_number,
    v_invoice.total_amount,
    0;

  -- إضافة سطور القيد (دائن - حساب المبيعات)
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
    (SELECT id FROM gl_accounts WHERE account_code = '4010' LIMIT 1), -- حساب المبيعات
    'فاتورة مبيعات رقم: ' || v_invoice.invoice_number,
    0,
    v_invoice.subtotal;

  -- إضافة سطر الضريبة إذا وجدت
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
      (SELECT id FROM gl_accounts WHERE account_code = '2310' LIMIT 1), -- ضريبة القيمة المضافة
      'ضريبة فاتورة مبيعات رقم: ' || v_invoice.invoice_number,
      0,
      v_invoice.tax_amount;
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

  -- تحديث حالة الفاتورة إلى posted
  UPDATE sales_invoices
  SET status = 'posted',
      posted_by = auth.uid(),
      posted_at = NOW(),
      payment_status = CASE 
        WHEN paid_amount >= total_amount THEN 'paid'
        WHEN paid_amount > 0 THEN 'partial'
        ELSE 'unpaid'
      END
  WHERE id = p_invoice_id;

  -- إرجاع النتيجة
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
      v_invoice.invoice_number,
      v_invoice.total_amount,
      'failed',
      SQLERRM
    );
    
    RAISE;
END;
$$;

-- 4. إنشاء دالة لتوليد رقم فاتورة المبيعات
CREATE OR REPLACE FUNCTION public.generate_si_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_next_number INTEGER;
  v_number_length INTEGER;
  v_result TEXT;
BEGIN
  -- محاولة الحصول على القاعدة النشطة
  SELECT prefix, next_number, number_length 
  INTO v_prefix, v_next_number, v_number_length
  FROM document_numbering_rules
  WHERE document_type = 'SALES_INVOICE' 
    AND is_active = true
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    -- إنشاء قاعدة افتراضية إذا لم توجد
    INSERT INTO document_numbering_rules (
      document_type,
      prefix,
      next_number,
      number_length,
      is_active,
      description
    ) VALUES (
      'SALES_INVOICE',
      'SI-',
      1,
      6,
      true,
      'أرقام فواتير المبيعات'
    )
    RETURNING prefix, next_number, number_length 
    INTO v_prefix, v_next_number, v_number_length;
  END IF;

  -- توليد الرقم
  v_result := v_prefix || LPAD(v_next_number::TEXT, v_number_length, '0');

  -- تحديث العداد
  UPDATE document_numbering_rules
  SET next_number = next_number + 1,
      updated_at = NOW()
  WHERE document_type = 'SALES_INVOICE' 
    AND is_active = true;

  RETURN v_result;
END;
$$;

-- 5. إنشاء sequence لأرقام القيود إذا لم يكن موجوداً
CREATE SEQUENCE IF NOT EXISTS journal_entry_sequence START 1;

-- 6. إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_sales_invoices_warehouse ON sales_invoices(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_status ON sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_posted_at ON sales_invoices(posted_at);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_product ON sales_invoice_items(product_id);

-- 7. تحديث RLS policies لتشمل warehouse_id
-- السياسات موجودة بالفعل وستعمل مع الحقل الجديد

COMMENT ON COLUMN sales_invoices.warehouse_id IS 'المستودع الذي تم البيع منه';
COMMENT ON COLUMN sales_invoices.posted_by IS 'المستخدم الذي قام بترحيل الفاتورة';
COMMENT ON COLUMN sales_invoices.posted_at IS 'تاريخ ووقت ترحيل الفاتورة';
COMMENT ON FUNCTION post_sales_invoice IS 'دالة ترحيل فاتورة مبيعات مع التحديثات التلقائية للمخزون والحسابات';
