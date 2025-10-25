-- إضافة حقول إضافية لجدول المخازن
ALTER TABLE public.warehouses 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS manager_name TEXT,
ADD COLUMN IF NOT EXISTS capacity NUMERIC,
ADD COLUMN IF NOT EXISTS parent_warehouse_id UUID REFERENCES public.warehouses(id),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'المملكة العربية السعودية';

-- إضافة تعليق للجدول
COMMENT ON TABLE public.warehouses IS 'جدول المخازن والفروع';
COMMENT ON COLUMN public.warehouses.email IS 'البريد الإلكتروني للمخزن';
COMMENT ON COLUMN public.warehouses.manager_name IS 'اسم مدير المخزن';
COMMENT ON COLUMN public.warehouses.capacity IS 'السعة القصوى للمخزن';
COMMENT ON COLUMN public.warehouses.parent_warehouse_id IS 'المخزن الرئيسي (للفروع)';
COMMENT ON COLUMN public.warehouses.notes IS 'ملاحظات إضافية';