
-- إصلاح شامل لجدول الموردين (suppliers)
-- المشكلة: أعمدة مفقودة تمنع عمل النظام بشكل صحيح

-- إضافة الأعمدة المفقودة في جدول الموردين
ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS tax_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- إنشاء كود تلقائي للموردين الموجودين بدون كود
WITH numbered_suppliers AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.suppliers
  WHERE code IS NULL
)
UPDATE public.suppliers s
SET code = 'SUP-' || LPAD(ns.rn::TEXT, 6, '0')
FROM numbered_suppliers ns
WHERE s.id = ns.id;

-- تعيين الموردين الموجودين كنشطين افتراضياً
UPDATE public.suppliers
SET is_active = true
WHERE is_active IS NULL;

-- إنشاء constraint لضمان فرادة كود المورد
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_code_unique'
  ) THEN
    ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_code_unique UNIQUE (code);
  END IF;
END $$;

-- إنشاء دالة لتوليد كود تلقائي للموردين الجدد
CREATE OR REPLACE FUNCTION public.generate_supplier_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'SUP-' || LPAD(
      (
        SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) + 1 
        FROM public.suppliers 
        WHERE code LIKE 'SUP-%'
      )::TEXT, 
      6, 
      '0'
    );
    
    SELECT EXISTS(SELECT 1 FROM public.suppliers WHERE code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- إنشاء trigger لتوليد كود تلقائي عند الإدراج
CREATE OR REPLACE FUNCTION public.set_supplier_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_supplier_code();
  END IF;
  RETURN NEW;
END;
$$;

-- حذف trigger القديم إن وجد وإنشاء trigger جديد
DROP TRIGGER IF EXISTS suppliers_set_code_trigger ON public.suppliers;
CREATE TRIGGER suppliers_set_code_trigger
  BEFORE INSERT ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION set_supplier_code();

-- إنشاء index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON public.suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON public.suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
