-- =====================================================
-- إصلاح مشاكل الأمان - search_path للدوال
-- تأمين سياسة RLS لجدول erp_violation_log
-- =====================================================

-- 1. إصلاح get_available_stock - إضافة search_path
CREATE OR REPLACE FUNCTION public.get_available_stock(p_product_id uuid, p_warehouse_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_total_qty numeric := 0;
  v_reserved_qty numeric := 0;
BEGIN
  SELECT COALESCE(qty_on_hand, 0) INTO v_total_qty
  FROM warehouse_stock
  WHERE item_id = p_product_id AND warehouse_id = p_warehouse_id;
  
  SELECT COALESCE(SUM(quantity_reserved), 0) INTO v_reserved_qty
  FROM stock_reservations
  WHERE item_id = p_product_id 
    AND warehouse_id = p_warehouse_id 
    AND status = 'active'
    AND can_sell = false;
  
  RETURN GREATEST(v_total_qty - v_reserved_qty, 0);
END;
$function$;

-- 2. إصلاح trg_check_sales_availability - إضافة search_path
CREATE OR REPLACE FUNCTION public.trg_check_sales_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_available_qty numeric;
  v_product_name text;
  v_warehouse_id uuid;
BEGIN
  SELECT warehouse_id INTO v_warehouse_id
  FROM sales_invoices WHERE id = NEW.invoice_id;
  
  SELECT name INTO v_product_name FROM products WHERE id = NEW.item_id;
  
  v_available_qty := get_available_stock(NEW.item_id, v_warehouse_id);
  
  IF NEW.qty > v_available_qty THEN
    RAISE EXCEPTION '❌ الكمية المطلوبة (%) من "%" تتجاوز المتاح (%)!',
    NEW.qty, COALESCE(v_product_name, 'منتج'), v_available_qty;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. إصلاح trg_prevent_posted_modification - إضافة search_path
CREATE OR REPLACE FUNCTION public.trg_prevent_posted_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'posted' THEN
      IF NEW.status NOT IN ('reversed', 'cancelled') THEN
        RAISE EXCEPTION '❌ لا يمكن تعديل مستند مرحّل!';
      END IF;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' AND OLD.status = 'posted' THEN
    RAISE EXCEPTION '❌ لا يمكن حذف مستند مرحّل!';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 4. إصلاح trg_release_on_invoice_cancel - إضافة search_path
CREATE OR REPLACE FUNCTION public.trg_release_on_invoice_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status IN ('cancelled', 'reversed') AND OLD.status NOT IN ('cancelled', 'reversed') THEN
    UPDATE stock_reservations 
    SET status = 'released', released_at = now()
    WHERE reference_id = NEW.id 
      AND reference_type = 'sales_invoice'
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. إصلاح trg_release_sales_reservation - إضافة search_path
CREATE OR REPLACE FUNCTION public.trg_release_sales_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE stock_reservations 
  SET 
    quantity_reserved = GREATEST(quantity_reserved - OLD.qty, 0),
    quantity_released = COALESCE(quantity_released, 0) + OLD.qty,
    released_at = CASE WHEN quantity_reserved - OLD.qty <= 0 THEN now() ELSE released_at END,
    status = CASE WHEN quantity_reserved - OLD.qty <= 0 THEN 'released' ELSE status END
  WHERE reference_id = OLD.invoice_id 
    AND item_id = OLD.item_id
    AND reference_type = 'sales_invoice';
  
  RETURN OLD;
END;
$function$;

-- 6. إصلاح trg_reserve_sales_stock - إضافة search_path
CREATE OR REPLACE FUNCTION public.trg_reserve_sales_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_warehouse_id uuid;
  v_invoice_number text;
BEGIN
  SELECT warehouse_id, invoice_number INTO v_warehouse_id, v_invoice_number
  FROM sales_invoices WHERE id = NEW.invoice_id;
  
  IF v_warehouse_id IS NOT NULL THEN
    INSERT INTO stock_reservations (
      item_id, warehouse_id, quantity_reserved,
      reference_type, reference_id, reference_number,
      reservation_type, can_sell, status, reserved_at
    ) VALUES (
      NEW.item_id, v_warehouse_id, NEW.qty,
      'sales_invoice', NEW.invoice_id, v_invoice_number,
      'sales_order', false, 'active', now()
    )
    ON CONFLICT (reference_id, item_id) 
    DO UPDATE SET quantity_reserved = stock_reservations.quantity_reserved + EXCLUDED.quantity_reserved;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 7. إصلاح trg_strict_stock_protection - إضافة search_path
CREATE OR REPLACE FUNCTION public.trg_strict_stock_protection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller text;
  v_allowed text[] := ARRAY[
    'post_goods_receipt', 'post_purchase_invoice', 'post_sales_invoice',
    'post_sales_return', 'post_purchase_return', 'post_stock_adjustment',
    'post_warehouse_transfer', 'reverse_sales_invoice', 'reverse_purchase_invoice'
  ];
BEGIN
  v_caller := current_setting('app.current_function', true);
  
  IF TG_OP = 'UPDATE' AND OLD.qty_on_hand IS DISTINCT FROM NEW.qty_on_hand THEN
    IF v_caller IS NULL OR NOT (v_caller = ANY(v_allowed)) THEN
      RAISE EXCEPTION '❌ لا يمكن تعديل المخزون مباشرة!';
    END IF;
  END IF;
  
  IF TG_OP = 'INSERT' AND NEW.qty_on_hand > 0 THEN
    IF v_caller IS NULL OR NOT (v_caller = ANY(v_allowed)) THEN
      RAISE EXCEPTION '❌ لا يمكن إنشاء مخزون بكمية أولية!';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 8. إصلاح trg_validate_purchase_invoice_source - إضافة search_path
CREATE OR REPLACE FUNCTION public.trg_validate_purchase_invoice_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.source_type IS NULL OR NEW.source_type = 'direct' THEN
    RAISE EXCEPTION '❌ لا يمكن إنشاء فاتورة شراء مباشرة! يجب الربط بأمر شراء أو استلام بضاعة';
  END IF;
  RETURN NEW;
END;
$function$;

-- 9. تأمين سياسة erp_violation_log - تقييد INSERT للمدراء فقط
DROP POLICY IF EXISTS "System can insert violation logs" ON public.erp_violation_log;

CREATE POLICY "System can insert violation logs"
ON public.erp_violation_log
FOR INSERT
TO authenticated
WITH CHECK (
  -- السماح بالإدراج من الـ triggers و DEFINER functions
  -- أو من المدراء مباشرة
  has_any_role(auth.uid(), ARRAY['admin'::app_role])
  OR current_setting('app.current_function', true) IS NOT NULL
);

-- 10. إضافة تعليقات توثيقية
COMMENT ON FUNCTION public.get_available_stock IS 'حساب الكمية المتاحة للبيع (المخزون - المحجوز). محمي بـ search_path ثابت.';
COMMENT ON FUNCTION public.trg_check_sales_availability IS 'التحقق من توفر المخزون قبل البيع. محمي بـ search_path ثابت.';
COMMENT ON FUNCTION public.trg_prevent_posted_modification IS 'منع تعديل المستندات المرحّلة. محمي بـ search_path ثابت.';
COMMENT ON FUNCTION public.trg_release_on_invoice_cancel IS 'تحرير المحجوزات عند إلغاء الفاتورة. محمي بـ search_path ثابت.';
COMMENT ON FUNCTION public.trg_release_sales_reservation IS 'تحرير المحجوزات عند حذف بنود المبيعات. محمي بـ search_path ثابت.';
COMMENT ON FUNCTION public.trg_reserve_sales_stock IS 'حجز المخزون عند إضافة بنود المبيعات. محمي بـ search_path ثابت.';
COMMENT ON FUNCTION public.trg_strict_stock_protection IS 'حماية صارمة للمخزون من التعديل المباشر. محمي بـ search_path ثابت.';
COMMENT ON FUNCTION public.trg_validate_purchase_invoice_source IS 'التحقق من مصدر فاتورة الشراء. محمي بـ search_path ثابت.';