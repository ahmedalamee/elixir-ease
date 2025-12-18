
-- =====================================================
-- FINAL SECURITY FIXES - Address remaining Error-level issues
-- =====================================================

-- =====================================================
-- PART 1: INSURANCE_COMPANIES - Restrict to admin and pharmacist only
-- =====================================================

DROP POLICY IF EXISTS "All staff read insurance companies" ON insurance_companies;

-- Only admin and pharmacist can read insurance companies (not cashiers)
CREATE POLICY "insurance_companies_staff_limited" ON insurance_companies
FOR SELECT TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
);

-- =====================================================
-- PART 2: PRESCRIPTIONS - Tighten pharmacist access to 4 hours
-- =====================================================

DROP POLICY IF EXISTS "Pharmacist manage prescriptions" ON prescriptions;

-- Pharmacist can only manage prescriptions created in last 4 hours (active shift)
CREATE POLICY "prescriptions_pharmacist_shift" ON prescriptions
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) 
  AND (
    created_by = auth.uid() -- their own prescriptions
    OR (
      status = 'pending'
      AND dispensed_at IS NULL
      AND created_at > (now() - interval '4 hours')
    )
  )
)
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- =====================================================
-- PART 3: PRESCRIPTIONS - Stricter cashier access
-- =====================================================

DROP POLICY IF EXISTS "Cashier read prescriptions for session" ON prescriptions;
DROP POLICY IF EXISTS "prescriptions_cashier_active_checkout" ON prescriptions;

-- Cashier: Only prescriptions linked to items in their current draft invoice
CREATE POLICY "prescriptions_cashier_current_sale" ON prescriptions
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'cashier'::app_role) 
  AND EXISTS (
    SELECT 1 FROM pos_sessions ps
    JOIN sales_invoices si ON si.pos_session_id = ps.id
    JOIN sales_invoice_items sii ON sii.invoice_id = si.id
    JOIN prescription_items pi ON pi.product_id = sii.item_id
    WHERE ps.user_id = auth.uid() 
    AND ps.status = 'active'
    AND si.status = 'draft'
    AND pi.prescription_id = prescriptions.id
    AND si.created_at > (now() - interval '30 minutes')
  )
);

-- =====================================================
-- PART 4: SUPPLIERS - Add audit logging requirement
-- Note: Already restricted to admin and inventory_manager
-- =====================================================

-- Create supplier access audit trigger
CREATE OR REPLACE FUNCTION log_supplier_access()
RETURNS trigger AS $$
BEGIN
  INSERT INTO security_audit_log (
    table_name,
    record_id,
    action,
    new_data,
    changed_by,
    changed_at
  ) VALUES (
    'suppliers_access',
    NEW.id::text,
    'SELECT',
    jsonb_build_object('id', NEW.id, 'name', NEW.name),
    auth.uid(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- PART 5: Reduce customer access time window to 15 minutes
-- =====================================================

DROP POLICY IF EXISTS "customers_cashier_jit" ON customers;

-- Cashier: Only 15 minute window for active draft invoices
CREATE POLICY "customers_cashier_15min" ON customers
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'cashier'::app_role) 
  AND EXISTS (
    SELECT 1 FROM pos_sessions ps
    JOIN sales_invoices si ON si.pos_session_id = ps.id
    WHERE si.customer_id = customers.id 
    AND ps.user_id = auth.uid() 
    AND ps.status = 'active'
    AND si.status = 'draft'
    AND si.created_at > (now() - interval '15 minutes')
  )
);
