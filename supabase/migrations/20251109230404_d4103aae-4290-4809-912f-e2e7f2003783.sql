-- إضافة سياسة SELECT للـ Admin و Pharmacist لقراءة جميع العملاء
CREATE POLICY "Admin and pharmacist read customers"
ON public.customers
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));