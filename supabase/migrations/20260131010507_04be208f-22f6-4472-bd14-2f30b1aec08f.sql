
-- =====================================================
-- إصلاح سياسات RLS للجداول المكشوفة
-- =====================================================

-- 1. إصلاح جدول gl_accounts - إزالة السياسات التي تستخدم public role
DROP POLICY IF EXISTS "Admin manage gl_accounts" ON public.gl_accounts;
DROP POLICY IF EXISTS "Staff read gl_accounts" ON public.gl_accounts;

-- 2. إصلاح جدول customers - التأكد من عدم وجود وصول عام
-- إلغاء جميع الصلاحيات من anon و public
REVOKE ALL ON public.customers FROM anon, public;
REVOKE ALL ON public.gl_accounts FROM anon, public;
REVOKE ALL ON public.prescriptions FROM anon, public;

-- منح الصلاحيات للمستخدمين المصادق عليهم فقط
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gl_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;

-- 3. فرض RLS على الجداول
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.gl_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions FORCE ROW LEVEL SECURITY;

-- 4. إضافة سياسة صيدلي للوصول الكامل للعملاء أثناء العمل
DROP POLICY IF EXISTS "customers_pharmacist_update" ON public.customers;
CREATE POLICY "customers_pharmacist_update"
ON public.customers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'pharmacist'::app_role))
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- 5. إضافة سياسة صيدلي للوصول الكامل للوصفات
DROP POLICY IF EXISTS "Pharmacist full access to prescriptions" ON public.prescriptions;
CREATE POLICY "Pharmacist full access to prescriptions"
ON public.prescriptions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'pharmacist'::app_role))
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- 6. إضافة سياسة للعملاء لعرض وصفاتهم الخاصة
DROP POLICY IF EXISTS "prescriptions_customer_view_own" ON public.prescriptions;
CREATE POLICY "prescriptions_customer_view_own"
ON public.prescriptions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.id = prescriptions.customer_id
        AND c.user_id = auth.uid()
    )
);
