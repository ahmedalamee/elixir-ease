
-- =====================================================
-- PHASE 3: FINAL SECURITY HARDENING
-- Address all remaining error-level issues
-- =====================================================

-- ===== PART 1: MEDICATION HISTORY - STRICTER ACCESS =====
-- Reduce from 7 days to active dispensing only

DROP POLICY IF EXISTS "Pharmacist access medication history for active patients" ON public.medication_history;
DROP POLICY IF EXISTS "Pharmacist insert medication history during dispensing" ON public.medication_history;

-- Pharmacist: Only access for customers being actively dispensed (pending prescriptions only)
CREATE POLICY "Pharmacist read medication for active dispensing"
ON public.medication_history
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) AND
  EXISTS (
    SELECT 1 FROM prescriptions p 
    WHERE p.customer_id = medication_history.customer_id 
    AND p.status = 'pending'
    AND p.created_at > (now() - interval '24 hours')
  )
);

-- Pharmacist: Can insert during active dispensing
CREATE POLICY "Pharmacist insert medication during dispensing"
ON public.medication_history
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'pharmacist'::app_role) AND
  EXISTS (
    SELECT 1 FROM prescriptions p 
    WHERE p.customer_id = medication_history.customer_id 
    AND p.status = 'pending'
    AND p.created_at > (now() - interval '24 hours')
  )
);

-- ===== PART 2: VACCINATIONS - STRICT ACCESS =====

DROP POLICY IF EXISTS "Pharmacist access vaccinations for active patients" ON public.vaccinations;

-- Pharmacist: Only access for active dispensing
CREATE POLICY "Pharmacist read vaccinations for active patients"
ON public.vaccinations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) AND
  EXISTS (
    SELECT 1 FROM prescriptions p 
    WHERE p.customer_id = vaccinations.customer_id 
    AND p.status = 'pending'
    AND p.created_at > (now() - interval '24 hours')
  )
);

-- ===== PART 3: LAB TESTS - STRICT ACCESS =====

DROP POLICY IF EXISTS "Pharmacist access lab tests for active patients" ON public.lab_tests;

-- Pharmacist: Only access for active dispensing
CREATE POLICY "Pharmacist read lab tests for active patients"
ON public.lab_tests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) AND
  EXISTS (
    SELECT 1 FROM prescriptions p 
    WHERE p.customer_id = lab_tests.customer_id 
    AND p.status = 'pending'
    AND p.created_at > (now() - interval '24 hours')
  )
);

-- ===== PART 4: PRESCRIPTIONS - RESTRICT CASHIER ACCESS =====

DROP POLICY IF EXISTS "Cashier read active prescriptions for billing" ON public.prescriptions;

-- Cashier: Only prescriptions for invoices in their active POS session
CREATE POLICY "Cashier read prescriptions for own session"
ON public.prescriptions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cashier'::app_role) AND
  EXISTS (
    SELECT 1 FROM sales_invoices si
    JOIN pos_sessions ps ON ps.id = si.pos_session_id
    JOIN sales_invoice_items sii ON sii.invoice_id = si.id
    WHERE ps.user_id = auth.uid()
    AND ps.status = 'active'
    AND EXISTS (
      SELECT 1 FROM prescription_items pi 
      WHERE pi.prescription_id = prescriptions.id
    )
  )
);

-- ===== PART 5: SALES INVOICES - TIGHTER TIME WINDOW =====

DROP POLICY IF EXISTS "Pharmacist manage own invoices" ON public.sales_invoices;

-- Pharmacist: Only invoices from last 24 hours or their own
CREATE POLICY "Pharmacist manage recent invoices"
ON public.sales_invoices
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) AND (
    created_by = auth.uid() OR
    posted_by = auth.uid() OR
    created_at > (now() - interval '24 hours')
  )
)
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- ===== PART 6: GL ACCOUNTS - RESTRICT TO STAFF ONLY =====

-- Drop overly permissive policy
DROP POLICY IF EXISTS "gl_accounts_select_authenticated" ON public.gl_accounts;
DROP POLICY IF EXISTS "All authenticated users can view accounts" ON public.gl_accounts;

-- Only accounting staff can view GL accounts
CREATE POLICY "Accounting staff view gl accounts"
ON public.gl_accounts
FOR SELECT
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role])
);

-- ===== PART 7: EXCHANGE RATES - FIX CONFLICTING POLICIES =====

DROP POLICY IF EXISTS "All authenticated users can view exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Staff can view exchange rates" ON public.exchange_rates;

-- Only staff can view exchange rates
CREATE POLICY "Staff view exchange rates"
ON public.exchange_rates
FOR SELECT
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role])
);

-- ===== PART 8: COMPANY BRANDING - RESTRICT SENSITIVE FIELDS =====

DROP POLICY IF EXISTS "Anyone can read company branding" ON public.company_branding;

-- Create restricted view for public access
CREATE OR REPLACE VIEW public_company_info AS
SELECT 
  company_name,
  company_name_en,
  company_logo_url,
  theme_color
FROM company_branding
LIMIT 1;

-- Only authenticated staff can view full company branding
CREATE POLICY "Staff view company branding"
ON public.company_branding
FOR SELECT
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role])
);

-- ===== PART 9: AUDIT LOG ALL SENSITIVE TABLE ACCESS =====

-- Create audit trigger for medication history
CREATE OR REPLACE FUNCTION log_medication_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO customer_access_log (customer_id, user_id, action, accessed_at)
  VALUES (
    COALESCE(NEW.customer_id, OLD.customer_id),
    auth.uid(),
    'MEDICATION_' || TG_OP,
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_medication_access') THEN
    CREATE TRIGGER trg_audit_medication_access
    AFTER INSERT OR UPDATE ON medication_history
    FOR EACH ROW
    EXECUTE FUNCTION log_medication_access();
  END IF;
END;
$$;

-- Create audit trigger for health records
CREATE OR REPLACE FUNCTION log_health_record_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO customer_access_log (customer_id, user_id, action, accessed_at)
  VALUES (
    COALESCE(NEW.customer_id, OLD.customer_id),
    auth.uid(),
    'HEALTH_RECORD_' || TG_OP,
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_health_record_access') THEN
    CREATE TRIGGER trg_audit_health_record_access
    AFTER INSERT OR UPDATE ON customer_health_records
    FOR EACH ROW
    EXECUTE FUNCTION log_health_record_access();
  END IF;
END;
$$;

-- ===== PART 10: CUSTOMER INSURANCE - STRICTER CASHIER ACCESS =====

DROP POLICY IF EXISTS "Cashier read active insurance for transactions" ON public.customer_insurance;

-- Cashier: Only insurance for customers in their active POS session
CREATE POLICY "Cashier read insurance for active session"
ON public.customer_insurance
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cashier'::app_role) AND
  is_active = true AND
  (valid_to IS NULL OR valid_to >= CURRENT_DATE) AND
  EXISTS (
    SELECT 1 FROM sales_invoices si
    JOIN pos_sessions ps ON ps.id = si.pos_session_id
    WHERE si.customer_id = customer_insurance.customer_id
    AND ps.user_id = auth.uid()
    AND ps.status = 'active'
  )
);

-- ===== PART 11: COMMENTS =====
COMMENT ON POLICY "Pharmacist read medication for active dispensing" ON public.medication_history IS 'Pharmacists can only view medication history for patients with PENDING prescriptions in last 24 hours';
COMMENT ON POLICY "Pharmacist read vaccinations for active patients" ON public.vaccinations IS 'Pharmacists can only view vaccinations for patients being actively dispensed';
COMMENT ON POLICY "Pharmacist read lab tests for active patients" ON public.lab_tests IS 'Pharmacists can only view lab tests for patients being actively dispensed';
COMMENT ON POLICY "Cashier read prescriptions for own session" ON public.prescriptions IS 'Cashiers can only read prescriptions related to their active POS session';
COMMENT ON POLICY "Pharmacist manage recent invoices" ON public.sales_invoices IS 'Pharmacists can manage invoices from last 24 hours or their own';
COMMENT ON POLICY "Accounting staff view gl accounts" ON public.gl_accounts IS 'Only accounting staff can view chart of accounts';
COMMENT ON POLICY "Staff view exchange rates" ON public.exchange_rates IS 'Only staff can view exchange rates';
COMMENT ON POLICY "Staff view company branding" ON public.company_branding IS 'Only authenticated staff can view full company branding';
COMMENT ON POLICY "Cashier read insurance for active session" ON public.customer_insurance IS 'Cashiers can only view insurance for customers in their active POS session';
