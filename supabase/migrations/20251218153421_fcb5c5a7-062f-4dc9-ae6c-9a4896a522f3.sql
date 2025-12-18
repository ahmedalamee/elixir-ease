
-- ============================================================================
-- COMPLETE SECURITY HARDENING MIGRATION
-- ============================================================================

-- PART 1: EMPLOYEE SALARIES ENCRYPTION

-- 1.1 Add encrypted column
ALTER TABLE public.employee_salaries ADD COLUMN IF NOT EXISTS national_id_enc bytea;

-- 1.2 Encryption key function
CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT 'ERP_PHARMACY_SECRET_KEY_2024_SECURE'::text; $$;

REVOKE ALL ON FUNCTION public.get_encryption_key() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_encryption_key() TO authenticated;

-- 1.3 Migrate existing data
UPDATE public.employee_salaries 
SET national_id_enc = pgp_sym_encrypt(national_id, (SELECT public.get_encryption_key()))
WHERE national_id IS NOT NULL AND national_id_enc IS NULL;

-- 1.4 Decrypt function (admin only)
CREATE OR REPLACE FUNCTION public.decrypt_national_id(p_employee_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_decrypted text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Only admin users can decrypt national IDs';
  END IF;
  
  SELECT pgp_sym_decrypt(national_id_enc, (SELECT public.get_encryption_key()))
  INTO v_decrypted FROM public.employee_salaries WHERE employee_id = p_employee_id;
  
  INSERT INTO public.security_audit_log (table_name, record_id, action, changed_by, new_data)
  VALUES ('employee_salaries', p_employee_id::text, 'DECRYPT_NATIONAL_ID', auth.uid(), 
          jsonb_build_object('accessed_field', 'national_id', 'employee_id', p_employee_id::text));
  
  RETURN v_decrypted;
END; $$;

REVOKE ALL ON FUNCTION public.decrypt_national_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrypt_national_id(uuid) TO authenticated;

-- 1.5 Secure view for salaries
CREATE OR REPLACE VIEW public.employee_salaries_secure WITH (security_invoker = true) AS
SELECT es.employee_id, es.salary,
  CASE WHEN es.national_id_enc IS NOT NULL THEN '***ENCRYPTED***' ELSE NULL END as national_id_status,
  es.created_at, es.updated_at, e.full_name as employee_name, e.employee_code
FROM public.employee_salaries es
JOIN public.employees e ON e.id = es.employee_id
WHERE has_role(auth.uid(), 'admin');

GRANT SELECT ON public.employee_salaries_secure TO authenticated;

-- 1.6 Lock down base table
REVOKE ALL ON public.employee_salaries FROM PUBLIC;
REVOKE ALL ON public.employee_salaries FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_salaries TO authenticated;
ALTER TABLE public.employee_salaries FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: CUSTOMERS DATA MASKING
-- ============================================================================

-- 2.1 Masked view
CREATE OR REPLACE VIEW public.customers_masked WITH (security_invoker = true) AS
SELECT c.id, c.name,
  CASE WHEN c.phone IS NOT NULL AND LENGTH(c.phone) > 2 THEN '***' || RIGHT(c.phone, 2) ELSE '***' END as phone,
  CASE WHEN c.email IS NOT NULL AND POSITION('@' IN c.email) > 3 THEN LEFT(c.email, 3) || '***@' || SPLIT_PART(c.email, '@', 2)
       WHEN c.email IS NOT NULL THEN '***@' || SPLIT_PART(c.email, '@', 2) ELSE NULL END as email,
  CASE WHEN c.address IS NOT NULL THEN LEFT(c.address, 10) || '...' ELSE NULL END as address,
  c.credit_limit, c.balance, c.loyalty_points, c.segment,
  CASE WHEN c.tax_number IS NOT NULL AND LENGTH(c.tax_number) > 4 THEN '***' || RIGHT(c.tax_number, 4) ELSE '***' END as tax_number,
  c.payment_terms, c.currency_code, c.is_active, c.last_transaction_date, c.price_list_id
FROM public.customers c
WHERE auth.uid() IS NOT NULL AND (
  has_role(auth.uid(), 'admin')
  OR (has_any_role(auth.uid(), ARRAY['pharmacist'::app_role, 'cashier'::app_role]) AND (
    EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.customer_id = c.id AND p.status = 'pending' AND p.created_at > NOW() - INTERVAL '24 hours')
    OR EXISTS (SELECT 1 FROM public.sales_invoices si WHERE si.customer_id = c.id AND si.invoice_date >= CURRENT_DATE)
    OR EXISTS (SELECT 1 FROM public.pos_sessions ps WHERE ps.status = 'open' AND ps.user_id = auth.uid())
  ))
  OR c.user_id = auth.uid()
);

GRANT SELECT ON public.customers_masked TO authenticated;

-- 2.2 Full secure view (admin only)
CREATE OR REPLACE VIEW public.customers_full_secure WITH (security_invoker = true) AS
SELECT c.* FROM public.customers c
WHERE auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin');

GRANT SELECT ON public.customers_full_secure TO authenticated;

-- 2.3 Safe access function with audit
CREATE OR REPLACE FUNCTION public.get_customer_with_audit(p_customer_id uuid)
RETURNS TABLE (id uuid, name text, phone text, email text, balance numeric, credit_limit numeric, loyalty_points integer, is_active boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_admin boolean; v_is_staff boolean;
BEGIN
  SELECT has_role(auth.uid(), 'admin') INTO v_is_admin;
  SELECT has_any_role(auth.uid(), ARRAY['pharmacist'::app_role, 'cashier'::app_role]) INTO v_is_staff;
  
  INSERT INTO public.security_audit_log (table_name, record_id, action, changed_by, new_data)
  VALUES ('customers', p_customer_id::text, 'SINGLE_ACCESS', auth.uid(), jsonb_build_object('is_admin', v_is_admin, 'is_staff', v_is_staff));
  
  IF v_is_admin THEN
    RETURN QUERY SELECT c.id, c.name, c.phone, c.email, c.balance, c.credit_limit, c.loyalty_points, c.is_active FROM public.customers c WHERE c.id = p_customer_id;
  ELSIF v_is_staff THEN
    RETURN QUERY SELECT c.id, c.name, '***' || RIGHT(c.phone, 2), LEFT(c.email, 3) || '***', c.balance, c.credit_limit, c.loyalty_points, c.is_active FROM public.customers c WHERE c.id = p_customer_id;
  ELSE
    RETURN QUERY SELECT c.id, c.name, NULL::text, NULL::text, c.balance, c.credit_limit, c.loyalty_points, c.is_active FROM public.customers c WHERE c.id = p_customer_id AND c.user_id = auth.uid();
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_customer_with_audit(uuid) TO authenticated;

-- ============================================================================
-- PART 3: HARDENING
-- ============================================================================

COMMENT ON COLUMN public.employee_salaries.national_id_enc IS 'ENCRYPTED: PGP-encrypted national ID.';
COMMENT ON COLUMN public.employee_salaries.national_id IS 'DEPRECATED: Use national_id_enc instead.';
COMMENT ON VIEW public.customers_masked IS 'SECURITY: Masked customer view for non-admin.';
COMMENT ON VIEW public.customers_full_secure IS 'SECURITY: Full customer data - Admin only.';
COMMENT ON VIEW public.employee_salaries_secure IS 'SECURITY: Salary view - Admin only.';

CREATE INDEX IF NOT EXISTS idx_security_audit_log_table_action ON public.security_audit_log(table_name, action);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_changed_by ON public.security_audit_log(changed_by);

ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;
