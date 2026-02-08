
-- =====================================================
-- PART 2 & 5: DATABASE PROTECTION FOR DISABLED PRODUCTS
-- =====================================================

-- 1. Function to validate product is active before invoice operations
CREATE OR REPLACE FUNCTION public.validate_product_active()
RETURNS TRIGGER AS $$
DECLARE
  v_product_name TEXT;
  v_is_active BOOLEAN;
BEGIN
  -- Get product status
  SELECT name, is_active 
  INTO v_product_name, v_is_active
  FROM products 
  WHERE id = NEW.item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المنتج غير موجود';
  END IF;
  
  -- Block if product is disabled
  IF v_is_active = FALSE THEN
    RAISE EXCEPTION 'المنتج "%" معطّل من قبل المدير ولا يمكن استخدامه في الفواتير', v_product_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Trigger on sales_invoice_items to prevent disabled products
DROP TRIGGER IF EXISTS trg_validate_product_active_sales ON sales_invoice_items;
CREATE TRIGGER trg_validate_product_active_sales
BEFORE INSERT OR UPDATE ON public.sales_invoice_items
FOR EACH ROW EXECUTE FUNCTION validate_product_active();

-- 3. Trigger on pi_items (purchase invoice items) to prevent disabled products
DROP TRIGGER IF EXISTS trg_validate_product_active_purchase ON pi_items;
CREATE TRIGGER trg_validate_product_active_purchase
BEFORE INSERT OR UPDATE ON public.pi_items
FOR EACH ROW EXECUTE FUNCTION validate_product_active();

-- 4. Function to audit product status changes
CREATE OR REPLACE FUNCTION public.audit_product_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if is_active changed
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    INSERT INTO audit_log (
      table_name,
      record_id,
      operation,
      old_data,
      new_data,
      changed_by,
      changed_at
    ) VALUES (
      'products',
      NEW.id::text,
      CASE WHEN NEW.is_active THEN 'PRODUCT_ENABLED' ELSE 'PRODUCT_DISABLED' END,
      jsonb_build_object(
        'is_active', OLD.is_active,
        'name', OLD.name
      ),
      jsonb_build_object(
        'is_active', NEW.is_active,
        'name', NEW.name
      ),
      auth.uid(),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Trigger for product status change audit
DROP TRIGGER IF EXISTS trg_audit_product_status ON products;
CREATE TRIGGER trg_audit_product_status
AFTER UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION audit_product_status_change();

-- 6. View for product selection with stock and scientific material (security invoker)
DROP VIEW IF EXISTS public.v_product_selector;
CREATE VIEW public.v_product_selector
WITH (security_invoker = on) AS
SELECT 
  p.id,
  p.name,
  p.name_en,
  p.barcode,
  p.sku,
  p.price,
  p.cost_price,
  p.is_active,
  p.sellable,
  p.base_uom_id,
  p.scientific_material_id,
  p.allow_discount,
  p.max_discount_percentage,
  p.default_discount_percentage,
  p.image_url,
  sm.name AS scientific_material_name,
  sm.name_en AS scientific_material_name_en,
  c.name AS category_name,
  COALESCE(ws_agg.total_stock, 0) AS total_stock,
  COALESCE(ws_agg.available_stock, 0) AS available_stock,
  COALESCE(ws_agg.reserved_stock, 0) AS reserved_stock,
  COALESCE(ws_agg.free_stock, 0) AS free_stock
FROM products p
LEFT JOIN scientific_materials sm ON sm.id = p.scientific_material_id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN (
  SELECT 
    item_id,
    SUM(qty_on_hand) AS total_stock,
    SUM(qty_on_hand - COALESCE(qty_reserved, 0)) AS available_stock,
    SUM(COALESCE(qty_reserved, 0)) AS reserved_stock,
    SUM(COALESCE(free_quantity, 0)) AS free_stock
  FROM warehouse_stock
  GROUP BY item_id
) ws_agg ON ws_agg.item_id = p.id;

-- 7. Grant access to view
GRANT SELECT ON public.v_product_selector TO authenticated;

-- 8. RLS Policy function to check if user can toggle product status
-- Only admin and inventory_manager roles can disable/enable products
CREATE OR REPLACE FUNCTION public.can_manage_product_status(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1
    AND role IN ('admin', 'inventory_manager')
  )
$$;

-- 9. RPC function to toggle product status with authorization
CREATE OR REPLACE FUNCTION public.toggle_product_status(
  p_product_id UUID,
  p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_name TEXT;
BEGIN
  -- Authorization check
  IF NOT can_manage_product_status(auth.uid()) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات مدير أو مدير المخزون';
  END IF;
  
  -- Get product name
  SELECT name INTO v_product_name FROM products WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المنتج غير موجود';
  END IF;
  
  -- Update product status
  UPDATE products
  SET is_active = p_is_active
  WHERE id = p_product_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'product_name', v_product_name,
    'is_active', p_is_active,
    'message', CASE 
      WHEN p_is_active THEN 'تم تفعيل المنتج بنجاح'
      ELSE 'تم تعطيل المنتج بنجاح'
    END
  );
END;
$$;
