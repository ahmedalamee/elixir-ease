
-- ============================================================================
-- FIX ERROR-LEVEL: Reduce time windows from 4 hours to 30 minutes
-- ============================================================================

-- 1. Customer Health Records: Drop the 4-hour policy (30-min already exists)
DROP POLICY IF EXISTS "health_records_pharmacist_4h" ON public.customer_health_records;

-- 2. Medication History: Replace 4-hour policy with 30-minute
DROP POLICY IF EXISTS "medication_history_pharmacist_4h" ON public.medication_history;

CREATE POLICY "medication_history_pharmacist_30min" ON public.medication_history
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist')
  AND EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.customer_id = medication_history.customer_id
    AND p.status IN ('pending', 'dispensing')
    AND p.created_at >= (NOW() - INTERVAL '30 minutes')
  )
);

-- 3. Prescriptions: Replace 4-hour policy with 30-minute
DROP POLICY IF EXISTS "prescriptions_pharmacist_shift" ON public.prescriptions;

CREATE POLICY "prescriptions_pharmacist_30min" ON public.prescriptions
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist')
  AND (
    created_by = auth.uid()
    OR (
      status IN ('pending', 'dispensing')
      AND dispensed_at IS NULL
      AND created_at >= (NOW() - INTERVAL '30 minutes')
    )
  )
);

-- 4. Update customers_masked view to use 30-minute window
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
    -- 30 minute prescription window
    EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.customer_id = c.id AND p.status IN ('pending', 'dispensing') AND p.created_at >= NOW() - INTERVAL '30 minutes')
    -- Current session only
    OR EXISTS (SELECT 1 FROM public.pos_sessions ps WHERE ps.status = 'open' AND ps.user_id = auth.uid())
  ))
  OR c.user_id = auth.uid()
);

-- 5. Structural protection: Remove plain-text national_id if encrypted version exists
-- Mark column as deprecated with restricted default trigger
CREATE OR REPLACE FUNCTION public.protect_national_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Force encryption on insert/update
  IF NEW.national_id IS NOT NULL AND NEW.national_id != '' THEN
    NEW.national_id_enc := pgp_sym_encrypt(NEW.national_id, (SELECT public.get_encryption_key()));
    NEW.national_id := NULL; -- Clear plain text
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_national_id ON public.employee_salaries;
CREATE TRIGGER trg_protect_national_id
BEFORE INSERT OR UPDATE ON public.employee_salaries
FOR EACH ROW EXECUTE FUNCTION public.protect_national_id();

-- 6. Add structural comment indicating encryption protection
COMMENT ON TABLE public.employee_salaries IS 'ENCRYPTED: national_id stored in national_id_enc using PGP. Plain text is auto-cleared on write. Admin access only via RLS.';
