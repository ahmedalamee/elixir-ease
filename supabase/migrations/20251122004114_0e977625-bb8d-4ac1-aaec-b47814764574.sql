-- حذف جميع نسخ الدوال القديمة
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure as func_signature
        FROM pg_proc 
        WHERE proname IN ('get_returnable_sales_invoices', 'get_returnable_invoice_items', 'create_sales_return', 'post_sales_return')
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;
END $$;

-- دالة جلب الفواتير المؤهلة للإرجاع
CREATE FUNCTION get_returnable_sales_invoices(p_search TEXT DEFAULT NULL)
RETURNS TABLE (
  invoice_id UUID,
  invoice_number TEXT,
  invoice_date DATE,
  customer_name TEXT,
  total_amount NUMERIC,
  has_returns BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    si.id,
    si.invoice_number,
    si.invoice_date,
    c.name,
    si.total_amount,
    EXISTS(SELECT 1 FROM sales_returns sr WHERE sr.sales_invoice_id = si.id) as has_returns
  FROM sales_invoices si
  INNER JOIN customers c ON c.id = si.customer_id
  WHERE si.status = 'posted'
    AND (p_search IS NULL OR 
         si.invoice_number ILIKE '%' || p_search || '%' OR
         c.name ILIKE '%' || p_search || '%')
  ORDER BY si.invoice_date DESC
  LIMIT 50;
END;
$$;

-- دالة جلب عناصر الفاتورة المؤهلة للإرجاع
CREATE FUNCTION get_returnable_invoice_items(p_invoice_id UUID)
RETURNS TABLE (
  item_id UUID,
  product_id UUID,
  product_name TEXT,
  quantity NUMERIC,
  returned_qty NUMERIC,
  returnable_qty NUMERIC,
  unit_price NUMERIC,
  discount_percentage NUMERIC,
  tax_percentage NUMERIC,
  line_total NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sii.id,
    sii.item_id,
    p.name,
    sii.quantity,
    COALESCE(SUM(sri.quantity), 0) as returned_qty,
    sii.quantity - COALESCE(SUM(sri.quantity), 0) as returnable_qty,
    sii.unit_price,
    sii.discount_percentage,
    sii.tax_percentage,
    sii.line_total
  FROM sales_invoice_items sii
  INNER JOIN products p ON p.id = sii.item_id
  LEFT JOIN sales_return_items sri ON sri.invoice_item_id = sii.id
  WHERE sii.invoice_id = p_invoice_id
  GROUP BY sii.id, sii.item_id, p.name, sii.quantity, sii.unit_price, 
           sii.discount_percentage, sii.tax_percentage, sii.line_total
  HAVING sii.quantity - COALESCE(SUM(sri.quantity), 0) > 0;
END;
$$;

-- دالة إنشاء مرتجع مبيعات
CREATE FUNCTION create_sales_return(
  p_sales_invoice_id UUID,
  p_return_type TEXT,
  p_reason TEXT,
  p_refund_method TEXT,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_return_id UUID;
  v_return_number TEXT;
  v_customer_id UUID;
  v_warehouse_id UUID;
  v_subtotal NUMERIC := 0;
  v_tax_amount NUMERIC := 0;
  v_total_amount NUMERIC := 0;
  v_item JSONB;
BEGIN
  -- التحقق من صلاحيات المستخدم
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]) THEN
    RAISE EXCEPTION 'غير مصرح لك بإنشاء مرتجعات';
  END IF;

  -- جلب بيانات الفاتورة الأصلية
  SELECT customer_id, warehouse_id
  INTO v_customer_id, v_warehouse_id
  FROM sales_invoices
  WHERE id = p_sales_invoice_id AND status = 'posted';

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'الفاتورة غير موجودة أو غير مرحلة';
  END IF;

  -- توليد رقم المرتجع
  SELECT 'SR-' || LPAD(COALESCE(MAX(CAST(SUBSTRING(return_number FROM 4) AS INTEGER)), 0) + 1::TEXT, 6, '0')
  INTO v_return_number
  FROM sales_returns;

  -- حساب المبالغ
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := v_subtotal + (v_item->>'line_total')::NUMERIC;
    v_tax_amount := v_tax_amount + ((v_item->>'line_total')::NUMERIC * (v_item->>'tax_percentage')::NUMERIC / 100);
  END LOOP;

  v_total_amount := v_subtotal + v_tax_amount;

  -- إنشاء المرتجع
  INSERT INTO sales_returns (
    return_number,
    sales_invoice_id,
    customer_id,
    warehouse_id,
    return_date,
    return_type,
    reason,
    refund_method,
    subtotal,
    tax_amount,
    total_amount,
    refund_amount,
    status,
    notes,
    created_by
  ) VALUES (
    v_return_number,
    p_sales_invoice_id,
    v_customer_id,
    v_warehouse_id,
    CURRENT_DATE,
    p_return_type,
    p_reason,
    p_refund_method,
    v_subtotal,
    v_tax_amount,
    v_total_amount,
    v_total_amount,
    'draft',
    p_notes,
    auth.uid()
  ) RETURNING id INTO v_return_id;

  -- إضافة بنود المرتجع
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO sales_return_items (
      return_id,
      invoice_item_id,
      item_id,
      quantity,
      unit_price,
      discount_percentage,
      tax_percentage,
      line_total,
      condition
    ) VALUES (
      v_return_id,
      (v_item->>'invoice_item_id')::UUID,
      (v_item->>'item_id')::UUID,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'discount_percentage')::NUMERIC,
      (v_item->>'tax_percentage')::NUMERIC,
      (v_item->>'line_total')::NUMERIC,
      v_item->>'condition'
    );
  END LOOP;

  RETURN v_return_id;
END;
$$;

-- دالة ترحيل مرتجع مبيعات
CREATE FUNCTION post_sales_return(p_return_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_return RECORD;
  v_item RECORD;
  v_je_id UUID;
  v_je_number TEXT;
BEGIN
  -- التحقق من الصلاحيات
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]) THEN
    RAISE EXCEPTION 'غير مصرح لك بترحيل المرتجعات';
  END IF;

  -- جلب بيانات المرتجع
  SELECT * INTO v_return
  FROM sales_returns
  WHERE id = p_return_id AND status = 'draft';

  IF v_return.id IS NULL THEN
    RAISE EXCEPTION 'المرتجع غير موجود أو مرحل مسبقاً';
  END IF;

  -- تحديث المخزون - إعادة المنتجات للمخزون
  FOR v_item IN 
    SELECT sri.*, p.name as product_name
    FROM sales_return_items sri
    INNER JOIN products p ON p.id = sri.item_id
    WHERE sri.return_id = p_return_id
  LOOP
    -- تحديث المخزون في المستودع
    INSERT INTO warehouse_stock (warehouse_id, product_id, quantity, reserved_qty)
    VALUES (v_return.warehouse_id, v_item.item_id, v_item.quantity, 0)
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET 
      quantity = warehouse_stock.quantity + v_item.quantity,
      updated_at = NOW();

    -- تسجيل حركة المخزون
    INSERT INTO stock_ledger (
      product_id,
      warehouse_id,
      transaction_type,
      reference_type,
      reference_id,
      quantity,
      unit_cost,
      notes
    ) VALUES (
      v_item.item_id,
      v_return.warehouse_id,
      'in',
      'sales_return',
      p_return_id,
      v_item.quantity,
      v_item.unit_price,
      'إرجاع من مرتجع رقم: ' || v_return.return_number
    );
  END LOOP;

  -- تحديث رصيد العميل
  UPDATE customers
  SET balance = balance - v_return.refund_amount
  WHERE id = v_return.customer_id;

  -- إنشاء قيد محاسبي
  SELECT 'JE-' || LPAD(COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1::TEXT, 6, '0')
  INTO v_je_number
  FROM journal_entries;

  INSERT INTO journal_entries (
    entry_number,
    entry_date,
    reference_type,
    reference_id,
    description,
    status,
    created_by
  ) VALUES (
    v_je_number,
    CURRENT_DATE,
    'sales_return',
    p_return_id,
    'قيد مرتجع مبيعات رقم: ' || v_return.return_number,
    'posted',
    auth.uid()
  ) RETURNING id INTO v_je_id;

  -- بنود القيد المحاسبي
  -- مدين: مرتجعات المبيعات (تقليل الإيرادات)
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
  VALUES (v_je_id, '4010', v_return.subtotal, 0, 'مرتجعات مبيعات');

  -- مدين: ضريبة مرتجعة
  IF v_return.tax_amount > 0 THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
    VALUES (v_je_id, '2310', v_return.tax_amount, 0, 'ضريبة مرتجعة');
  END IF;

  -- دائن: العملاء (تقليل المدينة)
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
  VALUES (v_je_id, '1210', 0, v_return.total_amount, 'حساب العميل');

  -- تحديث حالة المرتجع
  UPDATE sales_returns
  SET 
    status = 'posted',
    posted_by = auth.uid(),
    posted_at = NOW()
  WHERE id = p_return_id;

  RETURN TRUE;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_returnable_sales_invoices(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_returnable_invoice_items(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_sales_return(UUID, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION post_sales_return(UUID) TO authenticated;