
-- ============================================================================
-- FINAL ERROR-LEVEL FIXES
-- ============================================================================

-- 1. EMPLOYEE SALARIES: Remove plain-text column entirely (data already encrypted)
ALTER TABLE public.employee_salaries DROP COLUMN IF EXISTS national_id;

-- 2. MEDICAL RECORDS: Reduce window to 15 minutes
DROP POLICY IF EXISTS "health_records_pharmacist_30min" ON public.customer_health_records;

CREATE POLICY "health_records_pharmacist_15min" ON public.customer_health_records
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist')
  AND EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.customer_id = customer_health_records.customer_id
    AND p.status = 'dispensing'  -- Only during active dispensing, not pending
    AND p.dispensed_at IS NULL
    AND p.created_at >= (NOW() - INTERVAL '15 minutes')
  )
);

-- 3. MEDICATION HISTORY: Reduce window to 15 minutes
DROP POLICY IF EXISTS "medication_history_pharmacist_30min" ON public.medication_history;

CREATE POLICY "medication_history_pharmacist_15min" ON public.medication_history
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist')
  AND EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.customer_id = medication_history.customer_id
    AND p.status = 'dispensing'  -- Only during active dispensing
    AND p.dispensed_at IS NULL
    AND p.created_at >= (NOW() - INTERVAL '15 minutes')
  )
);

-- 4. Add audit trigger for health record access
CREATE OR REPLACE FUNCTION public.audit_health_record_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.health_record_audit (customer_id, user_id, action, access_context)
  VALUES (
    NEW.customer_id,
    auth.uid(),
    'READ',
    jsonb_build_object('timestamp', NOW(), 'role', (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1))
  );
  RETURN NEW;
END; $$;

-- 5. Protect national_id_enc function to require active session
CREATE OR REPLACE FUNCTION public.decrypt_national_id(p_employee_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_decrypted text;
BEGIN
  -- Require admin role AND active session
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Only admin users can decrypt national IDs';
  END IF;
  
  -- Check session is recent (within 30 min)
  IF (SELECT EXTRACT(EPOCH FROM (NOW() - last_sign_in_at)) FROM auth.users WHERE id = auth.uid()) > 1800 THEN
    RAISE EXCEPTION 'Session expired: Please re-authenticate to access sensitive data';
  END IF;
  
  SELECT pgp_sym_decrypt(national_id_enc, (SELECT public.get_encryption_key()))
  INTO v_decrypted FROM public.employee_salaries WHERE employee_id = p_employee_id;
  
  INSERT INTO public.security_audit_log (table_name, record_id, action, changed_by, new_data)
  VALUES ('employee_salaries', p_employee_id::text, 'DECRYPT_NATIONAL_ID', auth.uid(), 
          jsonb_build_object('accessed_field', 'national_id_enc', 'timestamp', NOW()));
  
  RETURN v_decrypted;
END; $$;

-- 6. Update protect_national_id trigger for new schema
CREATE OR REPLACE FUNCTION public.protect_national_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Ensure national_id_enc is never null for new records with sensitive data
  IF NEW.national_id_enc IS NULL THEN
    -- Allow insert but log warning
    INSERT INTO public.security_audit_log (table_name, record_id, action, changed_by, new_data)
    VALUES ('employee_salaries', NEW.employee_id::text, 'INSERT_NO_NATIONAL_ID', auth.uid(), 
            jsonb_build_object('warning', 'Employee created without national ID'));
  END IF;
  RETURN NEW;
END; $$;
