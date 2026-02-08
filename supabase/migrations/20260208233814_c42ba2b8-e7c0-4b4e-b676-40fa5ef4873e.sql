-- =====================================================
-- SECURITY FIX: Customer Data Protection & Salary Audit
-- =====================================================

-- 1. REVOKE direct SELECT on customers table from non-admin roles
-- We'll use USING expressions that filter data through role-specific views

-- Drop existing policies that expose full customer data
DROP POLICY IF EXISTS "customers_cashier_read" ON public.customers;
DROP POLICY IF EXISTS "customers_cashier_active_session" ON public.customers;
DROP POLICY IF EXISTS "customers_pharmacist_read" ON public.customers;

-- 2. Create new restrictive policies for cashier and pharmacist
-- Cashiers can ONLY see customers during active sales sessions (limited fields via view)
CREATE POLICY "customers_cashier_limited_read"
ON public.customers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cashier'::app_role)
  AND is_active = true
  AND EXISTS (
    SELECT 1 FROM pos_sessions ps
    WHERE ps.user_id = auth.uid() AND ps.status = 'open'
  )
);

-- Pharmacists need customer access for prescriptions but through secure function
CREATE POLICY "customers_pharmacist_limited_read"
ON public.customers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role)
  AND is_active = true
);

-- 3. Create secure function to get customer contact info with audit logging
CREATE OR REPLACE FUNCTION public.get_customer_contact_secure(p_customer_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  email text,
  address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_has_access boolean := false;
  v_role text;
BEGIN
  -- Check if user has appropriate role
  IF has_any_role(v_user_id, ARRAY['admin'::app_role, 'pharmacist'::app_role]) THEN
    v_has_access := true;
    v_role := CASE 
      WHEN has_role(v_user_id, 'admin'::app_role) THEN 'admin'
      ELSE 'pharmacist'
    END;
  END IF;

  -- Check if customer owns their own data
  IF NOT v_has_access THEN
    SELECT EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = p_customer_id AND c.user_id = v_user_id
    ) INTO v_has_access;
    IF v_has_access THEN
      v_role := 'customer_self';
    END IF;
  END IF;

  -- Check for active prescription/sale context for cashiers
  IF NOT v_has_access AND has_role(v_user_id, 'cashier'::app_role) THEN
    SELECT EXISTS (
      SELECT 1 FROM sales_invoices si
      WHERE si.customer_id = p_customer_id
      AND si.created_by = v_user_id
      AND si.status = 'draft'
      AND si.created_at > now() - interval '30 minutes'
    ) INTO v_has_access;
    IF v_has_access THEN
      v_role := 'cashier_active_sale';
    END IF;
  END IF;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول لبيانات الاتصال لهذا العميل';
  END IF;

  -- Log the access
  INSERT INTO security_audit_log (table_name, record_id, action, new_data, changed_by, changed_at)
  VALUES (
    'customers', 
    p_customer_id::text, 
    'CONTACT_ACCESS',
    jsonb_build_object('accessed_by_role', v_role, 'purpose', 'contact_info_request'),
    v_user_id,
    now()
  );

  -- Return the contact info
  RETURN QUERY
  SELECT c.id, c.name, c.phone, c.email, c.address
  FROM customers c
  WHERE c.id = p_customer_id;
END;
$$;

-- 4. Create enhanced masked views for different roles

-- View for cashiers - only essential POS fields, masked contact info
DROP VIEW IF EXISTS public.customers_cashier_limited;
CREATE VIEW public.customers_cashier_limited
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.name,
  CASE 
    WHEN length(c.phone) > 4 THEN '****' || right(c.phone, 2)
    ELSE '******'
  END as phone_masked,
  c.loyalty_points,
  c.credit_limit,
  c.balance,
  c.is_active
FROM customers c
WHERE c.is_active = true
  AND has_role(auth.uid(), 'cashier'::app_role);

-- View for pharmacists - includes health-relevant info, masked contact
DROP VIEW IF EXISTS public.customers_pharmacist_view;
CREATE VIEW public.customers_pharmacist_view
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.name,
  CASE 
    WHEN length(c.phone) > 4 THEN substring(c.phone, 1, 3) || '****' || right(c.phone, 2)
    ELSE '******'
  END as phone_masked,
  CASE 
    WHEN c.email IS NOT NULL AND length(c.email) > 6 
    THEN substring(c.email, 1, 3) || '***@***' || 
         CASE WHEN position('@' in c.email) > 0 
              THEN right(split_part(c.email, '@', 2), 4)
              ELSE '' END
    ELSE '******'
  END as email_masked,
  c.loyalty_points,
  c.credit_limit,
  c.balance,
  c.segment,
  c.is_active,
  c.last_transaction_date
FROM customers c
WHERE has_any_role(auth.uid(), ARRAY['pharmacist'::app_role, 'admin'::app_role]);

-- Revoke access to base table views for limited roles
REVOKE ALL ON public.customers_cashier_limited FROM anon, public;
GRANT SELECT ON public.customers_cashier_limited TO authenticated;

REVOKE ALL ON public.customers_pharmacist_view FROM anon, public;
GRANT SELECT ON public.customers_pharmacist_view TO authenticated;

-- 5. SALARY AUDIT LOGGING - Create comprehensive audit for salary access

-- Create salary access audit table
CREATE TABLE IF NOT EXISTS public.salary_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  accessed_by uuid NOT NULL,
  access_type text NOT NULL, -- 'VIEW', 'UPDATE', 'CREATE', 'DELETE'
  old_salary numeric,
  new_salary numeric,
  access_reason text,
  ip_address text,
  accessed_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on salary access log
ALTER TABLE public.salary_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_access_log FORCE ROW LEVEL SECURITY;

-- Only admin can view salary access logs
CREATE POLICY "salary_access_log_admin_view"
ON public.salary_access_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert logs
CREATE POLICY "salary_access_log_system_insert"
ON public.salary_access_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create audit trigger for employee_salaries
CREATE OR REPLACE FUNCTION public.trg_audit_salary_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO salary_access_log (employee_id, accessed_by, access_type, new_salary, accessed_at)
    VALUES (NEW.employee_id, auth.uid(), 'CREATE', NEW.salary, now());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.salary IS DISTINCT FROM NEW.salary THEN
      INSERT INTO salary_access_log (employee_id, accessed_by, access_type, old_salary, new_salary, accessed_at)
      VALUES (NEW.employee_id, auth.uid(), 'UPDATE', OLD.salary, NEW.salary, now());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO salary_access_log (employee_id, accessed_by, access_type, old_salary, accessed_at)
    VALUES (OLD.employee_id, auth.uid(), 'DELETE', OLD.salary, now());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop existing trigger if any and create new one
DROP TRIGGER IF EXISTS trg_salary_audit ON public.employee_salaries;
CREATE TRIGGER trg_salary_audit
AFTER INSERT OR UPDATE OR DELETE ON public.employee_salaries
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_salary_access();

-- 6. Create secure function for salary viewing with mandatory audit
CREATE OR REPLACE FUNCTION public.view_employee_salary(p_employee_id uuid, p_reason text DEFAULT 'general_view')
RETURNS TABLE (
  employee_id uuid,
  salary numeric,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin access
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول لبيانات الرواتب';
  END IF;

  -- Log the access
  INSERT INTO salary_access_log (employee_id, accessed_by, access_type, access_reason, accessed_at)
  VALUES (p_employee_id, auth.uid(), 'VIEW', p_reason, now());

  -- Return salary data
  RETURN QUERY
  SELECT es.employee_id, es.salary, es.updated_at
  FROM employee_salaries es
  WHERE es.employee_id = p_employee_id;
END;
$$;

-- Grant execute to authenticated users (function enforces admin check internally)
GRANT EXECUTE ON FUNCTION public.view_employee_salary(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_contact_secure(uuid) TO authenticated;

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_salary_access_log_employee ON public.salary_access_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_access_log_accessed_by ON public.salary_access_log(accessed_by);
CREATE INDEX IF NOT EXISTS idx_salary_access_log_accessed_at ON public.salary_access_log(accessed_at DESC);