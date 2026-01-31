
-- =====================================================
-- ERP STRICT INVENTORY CONTROL SYSTEM V3
-- نظام التحكم الصارم بالمخزون
-- =====================================================

-- 1. تعزيز جدول حجوزات المخزون
ALTER TABLE IF EXISTS public.stock_reservations 
ADD COLUMN IF NOT EXISTS reservation_type text DEFAULT 'purchase_requisition',
ADD COLUMN IF NOT EXISTS can_sell boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone DEFAULT now();

-- 2. دالة الحصول على الكمية المتاحة للبيع
CREATE OR REPLACE FUNCTION public.get_available_stock(
  p_product_id uuid,
  p_warehouse_id uuid
)
RETURNS numeric AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. التحقق من التوفر قبل البيع
CREATE OR REPLACE FUNCTION public.trg_check_sales_availability()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_sales_availability ON public.sales_invoice_items;
CREATE TRIGGER trg_check_sales_availability
BEFORE INSERT OR UPDATE ON public.sales_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.trg_check_sales_availability();

-- 4. حجز الكمية عند إضافة بند لفاتورة البيع
CREATE OR REPLACE FUNCTION public.trg_reserve_sales_stock()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reserve_sales_stock ON public.sales_invoice_items;
CREATE TRIGGER trg_reserve_sales_stock
AFTER INSERT ON public.sales_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.trg_reserve_sales_stock();

-- 5. فك الحجز عند حذف بند
CREATE OR REPLACE FUNCTION public.trg_release_sales_reservation()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_release_sales_reservation ON public.sales_invoice_items;
CREATE TRIGGER trg_release_sales_reservation
AFTER DELETE ON public.sales_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.trg_release_sales_reservation();

-- 6. إضافة أعمدة مصدر فاتورة الشراء
ALTER TABLE IF EXISTS public.purchase_invoices
ADD COLUMN IF NOT EXISTS source_po_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS source_grn_ids uuid[] DEFAULT '{}';

-- 7. منع فاتورة شراء بدون PO أو GRN
CREATE OR REPLACE FUNCTION public.trg_validate_purchase_invoice_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_type IS NULL OR NEW.source_type = 'direct' THEN
    RAISE EXCEPTION '❌ لا يمكن إنشاء فاتورة شراء مباشرة! يجب الربط بأمر شراء أو استلام بضاعة';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_purchase_invoice_source ON public.purchase_invoices;
CREATE TRIGGER trg_validate_purchase_invoice_source
BEFORE INSERT ON public.purchase_invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_purchase_invoice_source();

-- 8. منع تعديل/حذف المستندات المرحّلة
CREATE OR REPLACE FUNCTION public.trg_prevent_posted_modification()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_pi_modification ON public.purchase_invoices;
CREATE TRIGGER trg_prevent_pi_modification
BEFORE UPDATE OR DELETE ON public.purchase_invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_posted_modification();

DROP TRIGGER IF EXISTS trg_prevent_si_modification ON public.sales_invoices;
CREATE TRIGGER trg_prevent_si_modification
BEFORE UPDATE OR DELETE ON public.sales_invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_posted_modification();

-- 9. منع التعديل المباشر على المخزون
CREATE OR REPLACE FUNCTION public.trg_strict_stock_protection()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_stock_updates ON public.warehouse_stock;
DROP TRIGGER IF EXISTS trg_strict_stock_protection ON public.warehouse_stock;
CREATE TRIGGER trg_strict_stock_protection
BEFORE INSERT OR UPDATE ON public.warehouse_stock
FOR EACH ROW EXECUTE FUNCTION public.trg_strict_stock_protection();

-- 10. View شامل لحالة المخزون
DROP VIEW IF EXISTS public.v_comprehensive_stock_status;
CREATE VIEW public.v_comprehensive_stock_status 
WITH (security_invoker = true) AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.barcode,
  w.id AS warehouse_id,
  w.name AS warehouse_name,
  COALESCE(ws.qty_on_hand, 0) AS total_quantity,
  COALESCE(
    (SELECT SUM(sr.quantity_reserved) 
     FROM stock_reservations sr 
     WHERE sr.item_id = p.id AND sr.warehouse_id = w.id 
       AND sr.status = 'active' AND sr.can_sell = false), 0
  ) AS reserved_quantity,
  COALESCE(
    (SELECT SUM(sr.quantity_reserved) 
     FROM stock_reservations sr 
     WHERE sr.item_id = p.id AND sr.warehouse_id = w.id 
       AND sr.status = 'active' AND sr.reservation_type = 'inbound'), 0
  ) AS inbound_quantity,
  public.get_available_stock(p.id, w.id) AS available_quantity,
  CASE 
    WHEN COALESCE(ws.qty_on_hand, 0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(ws.qty_on_hand, 0) <= COALESCE(p.reorder_level, 10) THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status
FROM products p
CROSS JOIN warehouses w
LEFT JOIN warehouse_stock ws ON ws.item_id = p.id AND ws.warehouse_id = w.id
WHERE p.is_active = true AND w.is_active = true;

-- 11. قيد unique للحجوزات
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_reservations_unique_ref_item'
  ) THEN
    ALTER TABLE stock_reservations 
    ADD CONSTRAINT stock_reservations_unique_ref_item 
    UNIQUE (reference_id, item_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 12. فك حجز المخزون عند إلغاء الفاتورة
CREATE OR REPLACE FUNCTION public.trg_release_on_invoice_cancel()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_release_on_invoice_cancel ON public.sales_invoices;
CREATE TRIGGER trg_release_on_invoice_cancel
AFTER UPDATE ON public.sales_invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_release_on_invoice_cancel();
