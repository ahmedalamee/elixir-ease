-- المرحلة 1: إصلاح وتحسين البنية التحتية لنظام المرتجعات

-- 1. إصلاح جدول sales_returns (تصحيح الخطأ في اسم العمود)
ALTER TABLE sales_returns 
DROP COLUMN IF EXISTS purchase_invoice_id;

ALTER TABLE sales_returns 
ADD COLUMN IF NOT EXISTS sales_invoice_id UUID REFERENCES sales_invoices(id);

-- 2. إضافة علاقات إضافية لتتبع بنود المرتجعات
ALTER TABLE sales_return_items
ADD COLUMN IF NOT EXISTS invoice_item_id UUID REFERENCES sales_invoice_items(id),
ADD COLUMN IF NOT EXISTS max_returnable_qty NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS already_returned_qty NUMERIC DEFAULT 0;

ALTER TABLE purchase_return_items
ADD COLUMN IF NOT EXISTS invoice_item_id UUID REFERENCES pi_items(id),
ADD COLUMN IF NOT EXISTS max_returnable_qty NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS already_returned_qty NUMERIC DEFAULT 0;

-- 3. إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_sales_returns_invoice ON sales_returns(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_customer ON sales_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_date ON sales_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_sales_returns_status ON sales_returns(status);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_invoice ON purchase_returns(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier ON purchase_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_date ON purchase_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_status ON purchase_returns(status);

-- 4. دالة للحصول على الفواتير المؤهلة للإرجاع (مبيعات)
CREATE OR REPLACE FUNCTION get_returnable_sales_invoices(
  p_search TEXT DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_days_limit INTEGER DEFAULT 90
)
RETURNS TABLE (
  invoice_id UUID,
  invoice_number TEXT,
  invoice_date DATE,
  customer_id UUID,
  customer_name TEXT,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  has_returns BOOLEAN,
  days_since_invoice INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    si.id as invoice_id,
    si.invoice_number,
    si.invoice_date,
    si.customer_id,
    c.name as customer_name,
    si.total_amount,
    si.paid_amount,
    EXISTS(SELECT 1 FROM sales_returns sr WHERE sr.sales_invoice_id = si.id) as has_returns,
    EXTRACT(DAY FROM CURRENT_DATE - si.invoice_date)::INTEGER as days_since_invoice
  FROM sales_invoices si
  JOIN customers c ON c.id = si.customer_id
  WHERE si.status = 'posted'
    AND si.invoice_date >= CURRENT_DATE - (p_days_limit || ' days')::INTERVAL
    AND (p_customer_id IS NULL OR si.customer_id = p_customer_id)
    AND (p_search IS NULL OR 
         si.invoice_number ILIKE '%' || p_search || '%' OR
         c.name ILIKE '%' || p_search || '%')
  ORDER BY si.invoice_date DESC;
END;
$$;

-- 5. دالة للحصول على عناصر الفاتورة مع الكميات المتاحة للإرجاع
CREATE OR REPLACE FUNCTION get_returnable_invoice_items(p_invoice_id UUID)
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sii.id as item_id,
    sii.item_id as product_id,
    p.name as product_name,
    sii.quantity,
    COALESCE(SUM(sri.quantity), 0) as returned_qty,
    sii.quantity - COALESCE(SUM(sri.quantity), 0) as returnable_qty,
    sii.unit_price,
    sii.discount_percentage,
    sii.tax_percentage,
    sii.line_total
  FROM sales_invoice_items sii
  JOIN products p ON p.id = sii.item_id
  LEFT JOIN sales_return_items sri ON sri.invoice_item_id = sii.id 
    AND sri.return_id IN (SELECT id FROM sales_returns WHERE status != 'cancelled')
  WHERE sii.invoice_id = p_invoice_id
  GROUP BY sii.id, sii.item_id, p.name, sii.quantity, sii.unit_price, 
           sii.discount_percentage, sii.tax_percentage, sii.line_total
  HAVING sii.quantity - COALESCE(SUM(sri.quantity), 0) > 0;
END;
$$;

-- 6. دالة مماثلة لمرتجعات المشتريات
CREATE OR REPLACE FUNCTION get_returnable_purchase_invoices(
  p_search TEXT DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_days_limit INTEGER DEFAULT 90
)
RETURNS TABLE (
  invoice_id UUID,
  invoice_number TEXT,
  invoice_date DATE,
  supplier_id UUID,
  supplier_name TEXT,
  total_amount NUMERIC,
  has_returns BOOLEAN,
  days_since_invoice INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.id as invoice_id,
    pi.pi_number as invoice_number,
    pi.invoice_date,
    pi.supplier_id,
    s.name as supplier_name,
    pi.total_amount,
    EXISTS(SELECT 1 FROM purchase_returns pr WHERE pr.purchase_invoice_id = pi.id) as has_returns,
    EXTRACT(DAY FROM CURRENT_DATE - pi.invoice_date)::INTEGER as days_since_invoice
  FROM purchase_invoices pi
  JOIN suppliers s ON s.id = pi.supplier_id
  WHERE pi.status = 'posted'
    AND pi.invoice_date >= CURRENT_DATE - (p_days_limit || ' days')::INTERVAL
    AND (p_supplier_id IS NULL OR pi.supplier_id = p_supplier_id)
    AND (p_search IS NULL OR 
         pi.pi_number ILIKE '%' || p_search || '%' OR
         s.name ILIKE '%' || p_search || '%')
  ORDER BY pi.invoice_date DESC;
END;
$$;

-- 7. دالة إنشاء مرتجع مبيعات متكامل
CREATE OR REPLACE FUNCTION create_sales_return(
  p_sales_invoice_id UUID,
  p_return_type TEXT,
  p_reason TEXT,
  p_refund_method TEXT,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_return_id UUID;
  v_return_number TEXT;
  v_invoice RECORD;
  v_item JSONB;
  v_subtotal NUMERIC := 0;
  v_tax_amount NUMERIC := 0;
  v_total_amount NUMERIC := 0;
  v_result JSONB;
BEGIN
  -- التحقق من الصلاحيات
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات إنشاء مرتجعات';
  END IF;

  -- جلب بيانات الفاتورة
  SELECT si.*, c.name as customer_name, si.warehouse_id
  INTO v_invoice
  FROM sales_invoices si
  JOIN customers c ON c.id = si.customer_id
  WHERE si.id = p_sales_invoice_id AND si.status = 'posted';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الفاتورة غير موجودة أو غير مرحلة';
  END IF;

  -- توليد رقم المرتجع
  v_return_number := generate_sales_return_number();

  -- إنشاء المرتجع
  INSERT INTO sales_returns (
    return_number, sales_invoice_id, customer_id, warehouse_id,
    return_type, reason, refund_method, status, notes, created_by
  ) VALUES (
    v_return_number, p_sales_invoice_id, v_invoice.customer_id, v_invoice.warehouse_id,
    p_return_type, p_reason, p_refund_method, 'draft', p_notes, auth.uid()
  ) RETURNING id INTO v_return_id;

  -- إضافة بنود المرتجع
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO sales_return_items (
      return_id, item_id, invoice_item_id, quantity, unit_price,
      discount_percentage, tax_percentage, line_total, condition
    ) VALUES (
      v_return_id,
      (v_item->>'item_id')::UUID,
      (v_item->>'invoice_item_id')::UUID,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'discount_percentage')::NUMERIC, 0),
      COALESCE((v_item->>'tax_percentage')::NUMERIC, 0),
      (v_item->>'line_total')::NUMERIC,
      COALESCE(v_item->>'condition', 'good')
    );
    
    v_subtotal := v_subtotal + (v_item->>'line_total')::NUMERIC;
  END LOOP;

  -- حساب الضريبة والإجمالي
  v_tax_amount := v_subtotal * (v_invoice.tax_amount / NULLIF(v_invoice.subtotal, 0));
  v_total_amount := v_subtotal + v_tax_amount;

  -- تحديث إجماليات المرتجع
  UPDATE sales_returns
  SET subtotal = v_subtotal,
      tax_amount = v_tax_amount,
      total_amount = v_total_amount,
      refund_amount = v_total_amount
  WHERE id = v_return_id;

  v_result := jsonb_build_object(
    'success', true,
    'return_id', v_return_id,
    'return_number', v_return_number,
    'message', 'تم إنشاء المرتجع بنجاح'
  );

  RETURN v_result;
END;
$$;

-- 8. تحديث صلاحيات الدوال الجديدة
GRANT EXECUTE ON FUNCTION get_returnable_sales_invoices TO authenticated;
GRANT EXECUTE ON FUNCTION get_returnable_invoice_items TO authenticated;
GRANT EXECUTE ON FUNCTION get_returnable_purchase_invoices TO authenticated;
GRANT EXECUTE ON FUNCTION create_sales_return TO authenticated;