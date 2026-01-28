
-- =====================================================
-- SCIENTIFIC MATERIALS & PRODUCT ALTERNATIVES SYSTEM
-- =====================================================

-- 1. Create scientific_materials table
CREATE TABLE IF NOT EXISTS public.scientific_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    name_en TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scientific_materials ENABLE ROW LEVEL SECURITY;

-- RLS policies for scientific_materials
CREATE POLICY "Allow read for authenticated users" ON public.scientific_materials
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write for admin users" ON public.scientific_materials
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'inventory_manager')
        )
    );

-- 2. Add scientific_material_id to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS scientific_material_id UUID REFERENCES public.scientific_materials(id);

-- 3. Create product_alternatives junction table
CREATE TABLE IF NOT EXISTS public.product_alternatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    alternative_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Prevent duplicate entries
    UNIQUE(product_id, alternative_product_id)
);

-- Enable RLS
ALTER TABLE public.product_alternatives ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_alternatives
CREATE POLICY "Allow read for authenticated users" ON public.product_alternatives
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write for authenticated users" ON public.product_alternatives
    FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_scientific_material ON public.products(scientific_material_id);
CREATE INDEX IF NOT EXISTS idx_product_alternatives_product ON public.product_alternatives(product_id);
CREATE INDEX IF NOT EXISTS idx_product_alternatives_alternative ON public.product_alternatives(alternative_product_id);
CREATE INDEX IF NOT EXISTS idx_scientific_materials_active ON public.scientific_materials(is_active) WHERE is_active = true;

-- 5. Validation trigger: Ensure scientific material is active when assigned
CREATE OR REPLACE FUNCTION public.validate_product_scientific_material()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_active BOOLEAN;
BEGIN
    -- Skip if no scientific material assigned
    IF NEW.scientific_material_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if scientific material exists and is active
    SELECT is_active INTO v_is_active
    FROM public.scientific_materials
    WHERE id = NEW.scientific_material_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'المادة العلمية المختارة غير صالحة';
    END IF;
    
    IF v_is_active = false THEN
        RAISE EXCEPTION 'المادة العلمية المختارة غير نشطة';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on products
DROP TRIGGER IF EXISTS trg_validate_product_scientific_material ON public.products;
CREATE TRIGGER trg_validate_product_scientific_material
    BEFORE INSERT OR UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_product_scientific_material();

-- 6. Validation trigger: Ensure alternative products are valid
CREATE OR REPLACE FUNCTION public.validate_product_alternative()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product_active BOOLEAN;
    v_alternative_active BOOLEAN;
BEGIN
    -- Prevent self-reference
    IF NEW.product_id = NEW.alternative_product_id THEN
        RAISE EXCEPTION 'لا يمكن إضافة المنتج كبديل لنفسه';
    END IF;
    
    -- Check if main product exists and is active
    SELECT is_active INTO v_product_active
    FROM public.products
    WHERE id = NEW.product_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'المنتج الأساسي غير موجود';
    END IF;
    
    -- Check if alternative product exists and is active
    SELECT is_active INTO v_alternative_active
    FROM public.products
    WHERE id = NEW.alternative_product_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'أحد البدائل المختارة غير صالح';
    END IF;
    
    IF v_alternative_active = false THEN
        RAISE EXCEPTION 'أحد البدائل المختارة غير نشط';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on product_alternatives
DROP TRIGGER IF EXISTS trg_validate_product_alternative ON public.product_alternatives;
CREATE TRIGGER trg_validate_product_alternative
    BEFORE INSERT OR UPDATE ON public.product_alternatives
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_product_alternative();

-- 7. Helper function to get product alternatives
CREATE OR REPLACE FUNCTION public.get_product_alternatives(p_product_id UUID)
RETURNS TABLE (
    alternative_id UUID,
    product_name TEXT,
    product_name_en TEXT,
    barcode TEXT,
    price NUMERIC,
    is_active BOOLEAN,
    priority INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.alternative_product_id,
        p.name,
        p.name_en,
        p.barcode,
        p.price,
        p.is_active,
        pa.priority
    FROM public.product_alternatives pa
    JOIN public.products p ON p.id = pa.alternative_product_id
    WHERE pa.product_id = p_product_id
    ORDER BY pa.priority, p.name;
END;
$$;

-- 8. Helper function to add product alternative with validation
CREATE OR REPLACE FUNCTION public.add_product_alternative(
    p_product_id UUID,
    p_alternative_id UUID,
    p_priority INTEGER DEFAULT 0,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.product_alternatives (product_id, alternative_product_id, priority, notes, created_by)
    VALUES (p_product_id, p_alternative_id, p_priority, p_notes, auth.uid())
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

-- 9. Updated_at trigger for scientific_materials
CREATE TRIGGER update_scientific_materials_updated_at
    BEFORE UPDATE ON public.scientific_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Insert some sample scientific materials for testing
INSERT INTO public.scientific_materials (name, name_en, description, is_active)
VALUES 
    ('باراسيتامول', 'Paracetamol', 'مسكن للألم وخافض للحرارة', true),
    ('أموكسيسيلين', 'Amoxicillin', 'مضاد حيوي واسع المجال', true),
    ('إيبوبروفين', 'Ibuprofen', 'مضاد للالتهاب غير ستيرويدي', true),
    ('أوميبرازول', 'Omeprazole', 'مثبط مضخة البروتون', true),
    ('ميتفورمين', 'Metformin', 'دواء لعلاج السكري', true),
    ('أملوديبين', 'Amlodipine', 'حاصرات قنوات الكالسيوم', true),
    ('أتورفاستاتين', 'Atorvastatin', 'خافض للكوليسترول', true),
    ('سيتريزين', 'Cetirizine', 'مضاد للهيستامين', true)
ON CONFLICT (name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.scientific_materials IS 'جدول المواد العلمية/الفعالة للأدوية';
COMMENT ON COLUMN public.products.scientific_material_id IS 'المادة العلمية/الفعالة للمنتج';
COMMENT ON TABLE public.product_alternatives IS 'جدول البدائل للمنتجات الدوائية';
