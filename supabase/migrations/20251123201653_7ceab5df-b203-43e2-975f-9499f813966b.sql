-- إصلاح خطأ توليد رقم المرتجع في دالة create_sales_return
DROP FUNCTION IF EXISTS create_sales_return(UUID, TEXT, TEXT, TEXT, JSONB, TEXT);

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

  -- توليد رقم المرتجع (تم إصلاح تحويل الأنواع)
  SELECT 'SR-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(return_number FROM 4) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
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

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_sales_return(UUID, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;