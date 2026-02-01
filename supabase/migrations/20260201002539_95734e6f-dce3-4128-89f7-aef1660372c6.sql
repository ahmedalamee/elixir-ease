-- =====================================================
-- إصلاح مشكلة SECURITY DEFINER View
-- تحويل v_valid_product_alternatives إلى SECURITY INVOKER
-- =====================================================

-- حذف الـ View القديم
DROP VIEW IF EXISTS public.v_valid_product_alternatives;

-- إعادة إنشاء الـ View مع SECURITY INVOKER
CREATE OR REPLACE VIEW public.v_valid_product_alternatives
WITH (security_invoker = true)
AS
SELECT 
    pa.id,
    pa.product_id,
    pa.alternative_product_id,
    p1.name AS product_name,
    p1.scientific_material_id AS product_material_id,
    sm1.name AS product_material_name,
    p2.name AS alternative_name,
    p2.scientific_material_id AS alternative_material_id,
    sm2.name AS alternative_material_name,
    p1.barcode AS product_barcode,
    p2.barcode AS alternative_barcode,
    pa.created_at
FROM product_alternatives pa
JOIN products p1 ON p1.id = pa.product_id
JOIN products p2 ON p2.id = pa.alternative_product_id
LEFT JOIN scientific_materials sm1 ON sm1.id = p1.scientific_material_id
LEFT JOIN scientific_materials sm2 ON sm2.id = p2.scientific_material_id
WHERE p1.scientific_material_id = p2.scientific_material_id 
  AND p1.scientific_material_id IS NOT NULL
  -- فلترة الأدوار: السماح للمستخدمين المصادق عليهم فقط
  AND auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role, 'cashier'::app_role]);

-- منح الصلاحيات للمستخدمين المصادق عليهم فقط
REVOKE ALL ON public.v_valid_product_alternatives FROM anon, public;
GRANT SELECT ON public.v_valid_product_alternatives TO authenticated;

-- إضافة تعليق توثيقي
COMMENT ON VIEW public.v_valid_product_alternatives IS 
'View آمن للبدائل الصيدلانية المتوافقة (نفس المادة العلمية). 
يستخدم SECURITY INVOKER للتحقق من صلاحيات المستخدم الحالي.
محمي بفلترة الأدوار: admin, pharmacist, inventory_manager, cashier.';