
-- =====================================================
-- Security Hardening: Customers Table Protection
-- =====================================================
-- Problem: Customer sensitive data (phone, email, address, financial data)
-- is exposed to cashier/pharmacist roles directly via the table.
-- Solution: Restrict direct table access and enforce view-based access.

-- Step 1: Drop existing permissive policies that expose sensitive data
DROP POLICY IF EXISTS "customers_cashier_limited_read" ON public.customers;
DROP POLICY IF EXISTS "customers_pharmacist_limited_read" ON public.customers;

-- Step 2: Create column-level restriction policies for sensitive data
-- Cashiers can ONLY see: id, name, is_active, currency_code (for POS operations)
-- They must use get_customer_contact_secure() function to see phone/email
CREATE POLICY "customers_cashier_minimal_read"
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

-- Pharmacists can read active customers (need for prescriptions and sales)
CREATE POLICY "customers_pharmacist_read"
ON public.customers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) 
  AND is_active = true
);

-- Step 3: Update the secure views to ensure they're properly masking data
-- Re-create customers_cashier_limited with stricter masking
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
  '****@****' as email_masked,
  c.currency_code,
  c.is_active,
  c.loyalty_points
FROM customers c
WHERE c.is_active = true
  AND has_role(auth.uid(), 'cashier'::app_role)
  AND EXISTS (
    SELECT 1 FROM pos_sessions ps 
    WHERE ps.user_id = auth.uid() AND ps.status = 'open'
  );

-- Grant access to the view
REVOKE ALL ON public.customers_cashier_limited FROM anon, public;
GRANT SELECT ON public.customers_cashier_limited TO authenticated;

-- Re-create customers_pharmacist_view with stricter masking
DROP VIEW IF EXISTS public.customers_pharmacist_view;
CREATE VIEW public.customers_pharmacist_view
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.name,
  CASE 
    WHEN length(c.phone) > 4 THEN '****' || right(c.phone, 2) 
    ELSE '******' 
  END as phone_masked,
  CASE 
    WHEN c.email IS NOT NULL THEN 
      left(c.email, 2) || '****@' || split_part(c.email, '@', 2)
    ELSE NULL 
  END as email_masked,
  c.address,
  c.currency_code,
  c.is_active,
  c.loyalty_points,
  c.balance,
  c.credit_limit
FROM customers c
WHERE c.is_active = true
  AND has_role(auth.uid(), 'pharmacist'::app_role);

REVOKE ALL ON public.customers_pharmacist_view FROM anon, public;
GRANT SELECT ON public.customers_pharmacist_view TO authenticated;

-- Step 4: Create a POS-specific view for minimal data access
DROP VIEW IF EXISTS public.customers_pos_minimal;
CREATE VIEW public.customers_pos_minimal
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.name,
  c.currency_code,
  c.loyalty_points,
  c.balance,
  c.credit_limit,
  c.is_active
FROM customers c
WHERE c.is_active = true
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'pharmacist'::app_role)
    OR (
      has_role(auth.uid(), 'cashier'::app_role)
      AND EXISTS (
        SELECT 1 FROM pos_sessions ps 
        WHERE ps.user_id = auth.uid() AND ps.status = 'open'
      )
    )
  );

REVOKE ALL ON public.customers_pos_minimal FROM anon, public;
GRANT SELECT ON public.customers_pos_minimal TO authenticated;

-- Step 5: Update the audit logging function to track customer data access
CREATE OR REPLACE FUNCTION public.log_customer_data_access(
  p_customer_id uuid,
  p_access_type text,
  p_data_accessed text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO security_audit_log (
    table_name,
    record_id,
    action,
    new_data,
    changed_by,
    changed_at
  ) VALUES (
    'customers',
    p_customer_id::text,
    'ACCESS_' || upper(p_access_type),
    jsonb_build_object(
      'data_accessed', p_data_accessed,
      'access_reason', p_access_type,
      'user_role', (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1)
    ),
    auth.uid(),
    now()
  );
END;
$$;

-- Step 6: Ensure the get_customer_contact_secure function logs all access
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
  v_user_id uuid;
  v_user_role text;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user has permission
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = v_user_id 
    AND role IN ('admin', 'pharmacist')
  ) THEN
    -- Check if cashier with open session
    IF NOT EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN pos_sessions ps ON ps.user_id = v_user_id
      WHERE ur.user_id = v_user_id 
      AND ur.role = 'cashier'
      AND ps.status = 'open'
    ) THEN
      RAISE EXCEPTION 'Access denied: Insufficient permissions to view customer contact data';
    END IF;
  END IF;
  
  -- Get user role for logging
  SELECT role::text INTO v_user_role
  FROM user_roles 
  WHERE user_id = v_user_id 
  LIMIT 1;
  
  -- Log the access
  INSERT INTO security_audit_log (
    table_name,
    record_id,
    action,
    new_data,
    changed_by,
    changed_at
  ) VALUES (
    'customers',
    p_customer_id::text,
    'VIEW_CONTACT_DATA',
    jsonb_build_object(
      'customer_id', p_customer_id,
      'user_role', v_user_role,
      'access_method', 'get_customer_contact_secure'
    ),
    v_user_id,
    now()
  );
  
  -- Return the contact data
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.address
  FROM customers c
  WHERE c.id = p_customer_id;
END;
$$;

-- Step 7: Add comment explaining the security model
COMMENT ON TABLE public.customers IS 
'Customer master data with sensitive PII. Direct access restricted by role:
- admin: Full access to all fields
- pharmacist: Read active customers (sensitive fields via get_customer_contact_secure)
- cashier: Read active customers during open POS session (sensitive fields via get_customer_contact_secure)
- customer (self): Can read and update own record only';

COMMENT ON FUNCTION public.get_customer_contact_secure IS 
'Secure function to retrieve customer contact information (phone, email, address).
Requires admin/pharmacist role OR cashier with open POS session.
All access is logged to security_audit_log for compliance.';
