
-- Fix Security Definer Views - Convert to SECURITY INVOKER
DROP VIEW IF EXISTS public.v_stock_levels;
CREATE VIEW public.v_stock_levels 
WITH (security_invoker = true)
AS
SELECT 
  ws.warehouse_id,
  w.name AS warehouse_name,
  ws.item_id AS product_id,
  p.name AS product_name,
  p.barcode,
  p.sku,
  COALESCE(ws.qty_on_hand, 0) AS total_quantity,
  COALESCE(ws.qty_reserved, 0) AS reserved_quantity,
  COALESCE(ws.qty_on_hand, 0) - COALESCE(ws.qty_reserved, 0) AS available_quantity,
  COALESCE(ws.qty_inbound, 0) AS inbound_quantity,
  COALESCE(ws.qty_outbound, 0) AS outbound_quantity,
  CASE 
    WHEN COALESCE(ws.qty_on_hand, 0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(ws.qty_on_hand, 0) - COALESCE(ws.qty_reserved, 0) <= 0 THEN 'fully_reserved'
    WHEN COALESCE(ws.qty_on_hand, 0) <= COALESCE(p.min_quantity, 10) THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status,
  ws.last_updated
FROM public.warehouse_stock ws
JOIN public.warehouses w ON w.id = ws.warehouse_id
JOIN public.products p ON p.id = ws.item_id;

DROP VIEW IF EXISTS public.v_expiry_alerts;
CREATE VIEW public.v_expiry_alerts 
WITH (security_invoker = true)
AS
SELECT 
  icl.product_id,
  p.name AS product_name,
  p.barcode,
  icl.warehouse_id,
  w.name AS warehouse_name,
  icl.batch_number,
  icl.expiry_date,
  icl.quantity_remaining,
  p.expiry_alert_months,
  (icl.expiry_date - CURRENT_DATE) AS days_until_expiry,
  CASE 
    WHEN icl.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN icl.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'critical'
    WHEN icl.expiry_date <= CURRENT_DATE + (COALESCE(p.expiry_alert_months, 3) || ' months')::INTERVAL THEN 'warning'
    ELSE 'ok'
  END AS alert_level,
  icl.unit_cost,
  icl.quantity_remaining * icl.unit_cost AS total_value_at_risk
FROM public.inventory_cost_layers icl
JOIN public.products p ON p.id = icl.product_id
JOIN public.warehouses w ON w.id = icl.warehouse_id
WHERE icl.quantity_remaining > 0
  AND icl.expiry_date IS NOT NULL
  AND (
    icl.expiry_date < CURRENT_DATE
    OR icl.expiry_date <= CURRENT_DATE + (COALESCE(p.expiry_alert_months, 3) || ' months')::INTERVAL
  )
ORDER BY icl.expiry_date ASC;

GRANT SELECT ON public.v_stock_levels TO authenticated;
GRANT SELECT ON public.v_expiry_alerts TO authenticated;

-- Update functions with proper search_path
CREATE OR REPLACE FUNCTION public.enforce_product_zero_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.quantity IS NOT NULL AND NEW.quantity <> 0 THEN
      RAISE EXCEPTION '❌ لا يمكن إنشاء منتج بكمية غير صفرية!';
    END IF;
    NEW.quantity := 0;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
      RAISE EXCEPTION '❌ لا يمكن تعديل كمية المنتج مباشرة!';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_absolute_stock_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller TEXT;
  v_allowed TEXT[] := ARRAY[
    'post_goods_receipt', 'post_purchase_invoice', 'post_sales_invoice',
    'post_sales_return', 'post_purchase_return', 'post_stock_adjustment',
    'post_warehouse_transfer', 'reverse_sales_invoice', 'reverse_purchase_invoice',
    'consume_fifo_layers', 'add_cost_layer', 'system_init'
  ];
BEGIN
  v_caller := current_setting('app.current_function', true);
  
  IF TG_OP = 'UPDATE' AND OLD.qty_on_hand IS DISTINCT FROM NEW.qty_on_hand THEN
    IF v_caller IS NULL OR NOT (v_caller = ANY(v_allowed)) THEN
      RAISE EXCEPTION '❌ [مخالفة أمنية] لا يمكن تعديل المخزون مباشرة!';
    END IF;
  END IF;
  
  IF TG_OP = 'INSERT' AND COALESCE(NEW.qty_on_hand, 0) > 0 THEN
    IF v_caller IS NULL OR NOT (v_caller = ANY(v_allowed)) THEN
      RAISE EXCEPTION '❌ لا يمكن إنشاء سجل مخزون بكمية أولية!';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION '❌ لا يمكن حذف سجلات المخزون!';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_document_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_posted BOOLEAN;
BEGIN
  v_is_posted := COALESCE(OLD.status, '') IN ('posted', 'completed', 'approved');
  
  IF TG_OP = 'DELETE' AND v_is_posted THEN
    RAISE EXCEPTION '❌ لا يمكن حذف مستند مرحّل!';
  END IF;
  
  IF TG_OP = 'UPDATE' AND v_is_posted THEN
    IF OLD.status = NEW.status 
       AND (TG_TABLE_NAME IN ('purchase_invoices', 'sales_invoices')) 
       AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
      RETURN NEW;
    END IF;
    
    IF NEW.status IN ('draft', 'cancelled') THEN
      RAISE EXCEPTION '❌ لا يمكن عكس أو إلغاء مستند مرحّل!';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_rfq_requires_pr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pr_id IS NULL THEN
    RAISE EXCEPTION '❌ لا يمكن إنشاء طلب تسعير بدون طلب شراء (PR)!';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.purchase_requisitions 
    WHERE id = NEW.pr_id AND status IN ('approved', 'partial', 'completed')
  ) THEN
    RAISE EXCEPTION '❌ طلب الشراء (PR) غير موجود أو غير معتمد!';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_po_requires_rfq_or_pr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rfq_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.rfq_requests 
      WHERE id = NEW.rfq_id AND status IN ('completed', 'partial_awarded', 'awarded')
    ) THEN
      RAISE EXCEPTION '❌ طلب التسعير (RFQ) غير موجود أو غير مكتمل!';
    END IF;
    RETURN NEW;
  END IF;
  
  IF NEW.pr_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.purchase_requisitions 
      WHERE id = NEW.pr_id AND status IN ('approved', 'partial', 'completed')
    ) THEN
      RAISE EXCEPTION '❌ طلب الشراء (PR) غير موجود أو غير معتمد!';
    END IF;
    RETURN NEW;
  END IF;
  
  RAISE EXCEPTION '❌ لا يمكن إنشاء أمر شراء بدون طلب تسعير (RFQ) أو طلب شراء (PR)!';
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_grn_requires_po()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.po_id IS NULL THEN
    RAISE EXCEPTION '❌ لا يمكن إنشاء إشعار استلام بدون أمر شراء (PO)!';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.purchase_orders 
    WHERE id = NEW.po_id AND status IN ('approved', 'partial', 'completed')
  ) THEN
    RAISE EXCEPTION '❌ أمر الشراء (PO) غير موجود أو غير معتمد!';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_pi_requires_po_or_grn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.grn_id IS NOT NULL OR (NEW.source_grn_ids IS NOT NULL AND array_length(NEW.source_grn_ids, 1) > 0) THEN
    RETURN NEW;
  END IF;
  
  IF NEW.po_id IS NOT NULL OR (NEW.source_po_ids IS NOT NULL AND array_length(NEW.source_po_ids, 1) > 0) THEN
    RETURN NEW;
  END IF;
  
  RAISE EXCEPTION '❌ لا يمكن إنشاء فاتورة شراء مباشرة! يجب الربط بأمر شراء (PO) أو إشعار استلام (GRN)';
END;
$$;

CREATE OR REPLACE FUNCTION public.check_sales_stock_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available NUMERIC;
  v_product_name TEXT;
BEGIN
  SELECT 
    COALESCE(ws.qty_on_hand, 0) - COALESCE(ws.qty_reserved, 0),
    p.name
  INTO v_available, v_product_name
  FROM public.warehouse_stock ws
  JOIN public.products p ON p.id = ws.item_id
  WHERE ws.item_id = NEW.product_id 
    AND ws.warehouse_id = NEW.warehouse_id;
  
  IF v_available IS NULL THEN
    SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
    RAISE EXCEPTION '❌ المنتج [%] غير متوفر في هذا المستودع!', v_product_name;
  END IF;
  
  IF NEW.quantity > v_available THEN
    RAISE EXCEPTION '❌ الكمية المطلوبة (%) للمنتج [%] تتجاوز المتاحة (%)!', 
      NEW.quantity, v_product_name, v_available;
  END IF;
  
  RETURN NEW;
END;
$$;
