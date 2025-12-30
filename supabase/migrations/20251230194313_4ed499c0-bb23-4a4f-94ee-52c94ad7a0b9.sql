-- Fix customers table RLS policies - ensure only authenticated users with proper roles can access

-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access to customers" ON public.customers;
DROP POLICY IF EXISTS "Customers can self-register once" ON public.customers;
DROP POLICY IF EXISTS "Only admin can delete customers" ON public.customers;
DROP POLICY IF EXISTS "customers_pharmacist_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_pharmacist_limited_read" ON public.customers;
DROP POLICY IF EXISTS "customers_self_access" ON public.customers;
DROP POLICY IF EXISTS "customers_self_update" ON public.customers;

-- Revoke all access from public/anon
REVOKE ALL ON public.customers FROM anon;
REVOKE ALL ON public.customers FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;

-- Create proper RLS policies with authenticated role
CREATE POLICY "customers_admin_full_access" ON public.customers
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "customers_pharmacist_read" ON public.customers
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'pharmacist'::app_role));

CREATE POLICY "customers_pharmacist_insert" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

CREATE POLICY "customers_cashier_read" ON public.customers
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'cashier'::app_role));

CREATE POLICY "customers_self_access" ON public.customers
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "customers_self_update" ON public.customers
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "customers_self_register" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (
  user_id IS NOT NULL 
  AND auth.uid() = user_id 
  AND NOT user_has_customer_record(auth.uid())
);

-- Fix employees table RLS policies
DROP POLICY IF EXISTS "employees_admin_only" ON public.employees;
DROP POLICY IF EXISTS "employees_view_own" ON public.employees;

-- Revoke all access from public/anon
REVOKE ALL ON public.employees FROM anon;
REVOKE ALL ON public.employees FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;

-- Create proper RLS policies with authenticated role
CREATE POLICY "employees_admin_full_access" ON public.employees
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "employees_view_own" ON public.employees
FOR SELECT TO authenticated
USING (user_id = auth.uid());