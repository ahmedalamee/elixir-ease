
-- =====================================================
-- Final Security Hardening: Block Direct Table Access
-- =====================================================

-- 1) EMPLOYEES: Revoke direct SELECT, create safe view
-- =====================================================

-- Revoke direct SELECT on employees table
REVOKE SELECT ON public.employees FROM authenticated;

-- Create safe view for employees (no salary/national_id)
DROP VIEW IF EXISTS public.employees_safe_view;

CREATE VIEW public.employees_safe_view
WITH (security_invoker = true) AS
SELECT 
  id, 
  employee_code,
  full_name, 
  full_name_en,
  job_title, 
  department, 
  phone, 
  email,
  is_active,
  hire_date
FROM public.employees
WHERE public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role, 'pharmacist'::app_role]);

-- Lock down view access
REVOKE ALL ON public.employees_safe_view FROM PUBLIC;
GRANT SELECT ON public.employees_safe_view TO authenticated;

-- 2) CUSTOMERS: Revoke direct SELECT, create admin view
-- =====================================================

-- Revoke direct SELECT on customers table
REVOKE SELECT ON public.customers FROM authenticated;

-- Create admin view with full customer data
DROP VIEW IF EXISTS public.customers_admin_view;

CREATE VIEW public.customers_admin_view
WITH (security_invoker = true) AS
SELECT *
FROM public.customers
WHERE public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]);

-- Lock down view access
REVOKE ALL ON public.customers_admin_view FROM PUBLIC;
GRANT SELECT ON public.customers_admin_view TO authenticated;

-- 3) Ensure customers_pos_view still works (already created)
-- Just verify privileges
REVOKE ALL ON public.customers_pos_view FROM PUBLIC;
GRANT SELECT ON public.customers_pos_view TO authenticated;
