
-- ==============================================================
-- 🧪 SCIENTIFIC MATERIAL - MASTER DATA PROTECTION
-- ERP Pharmaceutical Compliance - Database Level Enforcement
-- ==============================================================

-- 1️⃣ Prevent deletion of scientific material if linked to any product
CREATE OR REPLACE FUNCTION public.prevent_scientific_material_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_count INTEGER;
  v_product_names TEXT;
BEGIN
  -- Count linked products
  SELECT COUNT(*) INTO v_product_count
  FROM public.products
  WHERE scientific_material_id = OLD.id;
  
  IF v_product_count > 0 THEN
    -- Get first 5 product names
    SELECT STRING_AGG(name, '، ')
    INTO v_product_names
    FROM (
      SELECT name FROM public.products 
      WHERE scientific_material_id = OLD.id 
      ORDER BY name 
      LIMIT 5
    ) sub;
    
    RAISE EXCEPTION '❌ لا يمكن حذف المادة العلمية [%] لأنها مرتبطة بـ % منتج. المنتجات المرتبطة: %',
      OLD.name, v_product_count, COALESCE(v_product_names, '...');
  END IF;
  
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_scientific_material_deletion ON public.scientific_materials;
CREATE TRIGGER trg_prevent_scientific_material_deletion
  BEFORE DELETE ON public.scientific_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_scientific_material_deletion();

-- 2️⃣ Prevent duplicate scientific material names (case-insensitive)
CREATE OR REPLACE FUNCTION public.prevent_duplicate_scientific_material()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_existing_name TEXT;
BEGIN
  -- Check for duplicate name (Arabic)
  SELECT id, name INTO v_existing_id, v_existing_name
  FROM public.scientific_materials
  WHERE LOWER(TRIM(name)) = LOWER(TRIM(NEW.name))
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  LIMIT 1;
  
  IF FOUND THEN
    RAISE EXCEPTION '❌ المادة العلمية [%] موجودة مسبقاً في النظام', v_existing_name;
  END IF;
  
  -- Check for duplicate English name (if provided)
  IF NEW.name_en IS NOT NULL AND TRIM(NEW.name_en) != '' THEN
    SELECT id, name_en INTO v_existing_id, v_existing_name
    FROM public.scientific_materials
    WHERE LOWER(TRIM(name_en)) = LOWER(TRIM(NEW.name_en))
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;
    
    IF FOUND THEN
      RAISE EXCEPTION '❌ المادة العلمية بالاسم الإنجليزي [%] موجودة مسبقاً', v_existing_name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_scientific_material ON public.scientific_materials;
CREATE TRIGGER trg_prevent_duplicate_scientific_material
  BEFORE INSERT OR UPDATE ON public.scientific_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_scientific_material();

-- 3️⃣ Audit logging for scientific materials
CREATE OR REPLACE FUNCTION public.audit_scientific_material_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, operation, new_data, changed_by, changed_at)
    VALUES ('scientific_materials', NEW.id::text, 'INSERT', to_jsonb(NEW), auth.uid(), NOW());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, operation, old_data, new_data, changed_by, changed_at)
    VALUES ('scientific_materials', NEW.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), NOW());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, operation, old_data, changed_by, changed_at)
    VALUES ('scientific_materials', OLD.id::text, 'DELETE', to_jsonb(OLD), auth.uid(), NOW());
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_scientific_material ON public.scientific_materials;
CREATE TRIGGER trg_audit_scientific_material
  AFTER INSERT OR UPDATE OR DELETE ON public.scientific_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_scientific_material_changes();

-- 4️⃣ RLS policies for scientific_materials
ALTER TABLE public.scientific_materials ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view
DROP POLICY IF EXISTS "scientific_materials_select_policy" ON public.scientific_materials;
CREATE POLICY "scientific_materials_select_policy"
  ON public.scientific_materials FOR SELECT
  TO authenticated
  USING (true);

-- Allow admin/pharmacist to insert
DROP POLICY IF EXISTS "scientific_materials_insert_policy" ON public.scientific_materials;
CREATE POLICY "scientific_materials_insert_policy"
  ON public.scientific_materials FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'pharmacist')
  );

-- Allow admin/pharmacist to update
DROP POLICY IF EXISTS "scientific_materials_update_policy" ON public.scientific_materials;
CREATE POLICY "scientific_materials_update_policy"
  ON public.scientific_materials FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'pharmacist')
  );

-- Allow admin to delete
DROP POLICY IF EXISTS "scientific_materials_delete_policy" ON public.scientific_materials;
CREATE POLICY "scientific_materials_delete_policy"
  ON public.scientific_materials FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5️⃣ View for products with scientific materials (for search/filtering)
CREATE OR REPLACE VIEW public.v_products_with_scientific_materials
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.name AS product_name,
  p.name_en AS product_name_en,
  p.barcode,
  p.sku,
  p.price,
  p.cost_price,
  p.is_active AS product_active,
  sm.id AS scientific_material_id,
  sm.name AS scientific_material_name,
  sm.name_en AS scientific_material_name_en,
  sm.is_active AS scientific_material_active,
  c.name AS category_name
FROM public.products p
LEFT JOIN public.scientific_materials sm ON p.scientific_material_id = sm.id
LEFT JOIN public.categories c ON p.category_id = c.id;

GRANT SELECT ON public.v_products_with_scientific_materials TO authenticated;

-- 6️⃣ Function to get products count by scientific material
CREATE OR REPLACE FUNCTION public.get_scientific_material_usage(p_material_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.products
  WHERE scientific_material_id = p_material_id;
$$;

-- 7️⃣ Index for faster product search by scientific material
CREATE INDEX IF NOT EXISTS idx_products_scientific_material 
  ON public.products(scientific_material_id) 
  WHERE scientific_material_id IS NOT NULL;
