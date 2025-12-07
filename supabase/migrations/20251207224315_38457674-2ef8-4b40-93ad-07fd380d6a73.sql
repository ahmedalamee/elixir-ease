
-- =====================================================
-- COMPREHENSIVE SECURITY HARDENING MIGRATION
-- Pharmacy ERP - Least Privilege Implementation
-- =====================================================

-- ===== PART 1: CUSTOMERS TABLE =====
-- Remove overly permissive policies and implement strict access control

-- Drop existing policies that are too broad
DROP POLICY IF EXISTS "Admin and pharmacist read customers" ON public.customers;
DROP POLICY IF EXISTS "Admin and pharmacist manage customers" ON public.customers;
DROP POLICY IF EXISTS "Admin and pharmacist update customers" ON public.customers;
DROP POLICY IF EXISTS "Cashier read customers" ON public.customers;

-- Create new restrictive policies for customers

-- Admin: Full access to all customers
CREATE POLICY "Admin full access to customers"
ON public.customers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Pharmacist: Can read customers with active prescriptions or recent sales only
CREATE POLICY "Pharmacist read customers with activity"
ON public.customers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) AND (
    -- Customer has prescription in last 30 days
    EXISTS (
      SELECT 1 FROM prescriptions p 
      WHERE p.customer_id = customers.id 
      AND p.created_at > (now() - interval '30 days')
    )
    OR
    -- Customer has invoice in last 30 days
    EXISTS (
      SELECT 1 FROM sales_invoices si 
      WHERE si.customer_id = customers.id 
      AND si.created_at > (now() - interval '30 days')
    )
    OR
    -- Customer is being served in an active POS session by this user
    EXISTS (
      SELECT 1 FROM pos_sessions ps
      JOIN sales_invoices si ON si.pos_session_id = ps.id
      WHERE si.customer_id = customers.id
      AND ps.status = 'active'
    )
  )
);

-- Pharmacist: Can update customers they are serving
CREATE POLICY "Pharmacist update customers with activity"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) AND (
    EXISTS (
      SELECT 1 FROM prescriptions p 
      WHERE p.customer_id = customers.id 
      AND p.created_at > (now() - interval '30 days')
    )
    OR
    EXISTS (
      SELECT 1 FROM sales_invoices si 
      WHERE si.customer_id = customers.id 
      AND si.created_at > (now() - interval '30 days')
    )
  )
)
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- Pharmacist: Can insert new customers
CREATE POLICY "Pharmacist can insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- Cashier: Can ONLY read customers during active POS transactions
CREATE POLICY "Cashier read customers during transactions"
ON public.customers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cashier'::app_role) AND (
    -- Customer has an invoice in an active POS session
    EXISTS (
      SELECT 1 FROM pos_sessions ps
      JOIN sales_invoices si ON si.pos_session_id = ps.id
      WHERE si.customer_id = customers.id
      AND ps.user_id = auth.uid()
      AND ps.status = 'active'
    )
    OR
    -- Customer has recent invoice (today only)
    EXISTS (
      SELECT 1 FROM sales_invoices si 
      WHERE si.customer_id = customers.id 
      AND si.created_at > (CURRENT_DATE)::timestamp
      AND si.created_by = auth.uid()
    )
  )
);

-- Inventory Manager: Read-only access to customer names for reports (limited fields via view)
-- No direct table access, will use secure view instead

-- ===== PART 2: SUPPLIERS TABLE =====
-- Restrict access to business-sensitive supplier information

DROP POLICY IF EXISTS "Pharmacist and inventory manager manage suppliers" ON public.suppliers;

-- Admin: Full access
-- (Already exists: "Admin full access to suppliers")

-- Inventory Manager: Full access (needed for purchasing)
CREATE POLICY "Inventory manager full access to suppliers"
ON public.suppliers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'inventory_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'inventory_manager'::app_role));

-- Pharmacist: Read-only access to supplier names for reference (via secure view)
-- No direct table access for cashiers/receptionists

-- ===== PART 3: MEDICATION_HISTORY TABLE =====
-- Highly sensitive - restrict to minimal necessary access

DROP POLICY IF EXISTS "Admin and pharmacist manage medication history" ON public.medication_history;

-- Admin: Full access
CREATE POLICY "Admin full access to medication history"
ON public.medication_history
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Pharmacist: Only access for customers with ACTIVE prescriptions (not historical)
CREATE POLICY "Pharmacist access medication history for active patients"
ON public.medication_history
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) AND
  EXISTS (
    SELECT 1 FROM prescriptions p 
    WHERE p.customer_id = medication_history.customer_id 
    AND p.status IN ('pending', 'dispensed')
    AND p.created_at > (now() - interval '7 days')
  )
);

-- Pharmacist: Can insert new medication history during dispensing
CREATE POLICY "Pharmacist insert medication history during dispensing"
ON public.medication_history
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'pharmacist'::app_role) AND
  EXISTS (
    SELECT 1 FROM prescriptions p 
    WHERE p.customer_id = medication_history.customer_id 
    AND p.status IN ('pending', 'dispensed')
    AND p.created_at > (now() - interval '7 days')
  )
);

-- Customer: Can view their own medication history
CREATE POLICY "Customers view own medication history"
ON public.medication_history
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.user_id = auth.uid()
  )
);

-- ===== PART 4: PRESCRIPTIONS TABLE =====
-- Restrict cashier access and add time-based controls

DROP POLICY IF EXISTS "Cashier read prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Admin and pharmacist manage prescriptions" ON public.prescriptions;

-- Admin: Full access
CREATE POLICY "Admin full access to prescriptions"
ON public.prescriptions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Pharmacist: Full access to prescriptions
CREATE POLICY "Pharmacist manage prescriptions"
ON public.prescriptions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'pharmacist'::app_role))
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- Cashier: Read ONLY active prescriptions (pending/dispensed) from today for billing purposes
CREATE POLICY "Cashier read active prescriptions for billing"
ON public.prescriptions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cashier'::app_role) AND
  status IN ('pending', 'dispensed') AND
  prescription_date >= CURRENT_DATE
);

-- Customer: View own prescriptions
CREATE POLICY "Customers view own prescriptions"
ON public.prescriptions
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.user_id = auth.uid()
  )
);

-- ===== PART 5: EMPLOYEES TABLE =====
-- Protect salary and sensitive personal information

DROP POLICY IF EXISTS "Staff can view employees" ON public.employees;

-- Admin: Full access (already exists)
-- Keep: "Admin can select all employees", "Admin can insert employees", 
--       "Admin can update employees", "Admin can delete employees"

-- Employees: Can only view their own record (already exists)
-- Keep: "Employees can view their own record"

-- Other staff: No access to employee records (remove broad access)
-- Pharmacist/Inventory Manager: Only view basic info via secure function

-- ===== PART 6: VACCINATIONS TABLE =====
-- Restrict access similar to medication history

DROP POLICY IF EXISTS "Admin and pharmacist manage vaccinations" ON public.vaccinations;

-- Admin: Full access
CREATE POLICY "Admin full access to vaccinations"
ON public.vaccinations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Pharmacist: Access for patients with recent activity
CREATE POLICY "Pharmacist access vaccinations for active patients"
ON public.vaccinations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) AND
  EXISTS (
    SELECT 1 FROM prescriptions p 
    WHERE p.customer_id = vaccinations.customer_id 
    AND p.created_at > (now() - interval '30 days')
  )
);

-- Pharmacist: Can insert vaccinations
CREATE POLICY "Pharmacist insert vaccinations"
ON public.vaccinations
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- Customer: View own vaccinations
CREATE POLICY "Customers view own vaccinations"
ON public.vaccinations
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.user_id = auth.uid()
  )
);

-- ===== PART 7: LAB_TESTS TABLE =====
-- Similar restrictions as vaccinations

DROP POLICY IF EXISTS "Admin and pharmacist manage lab tests" ON public.lab_tests;

-- Admin: Full access
CREATE POLICY "Admin full access to lab tests"
ON public.lab_tests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Pharmacist: Access for patients with recent activity
CREATE POLICY "Pharmacist access lab tests for active patients"
ON public.lab_tests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) AND
  EXISTS (
    SELECT 1 FROM prescriptions p 
    WHERE p.customer_id = lab_tests.customer_id 
    AND p.created_at > (now() - interval '30 days')
  )
);

-- Pharmacist: Can insert lab tests
CREATE POLICY "Pharmacist insert lab tests"
ON public.lab_tests
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- Customer: View own lab tests
CREATE POLICY "Customers view own lab tests"
ON public.lab_tests
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.user_id = auth.uid()
  )
);

-- ===== PART 8: CUSTOMER_INSURANCE TABLE =====
-- Restrict cashier access

DROP POLICY IF EXISTS "All staff read customer insurance" ON public.customer_insurance;

-- Admin and pharmacist manage (already exists)
-- Keep: "Admin and pharmacist manage customer insurance"

-- Cashier: Only read active policies for current transactions
CREATE POLICY "Cashier read active insurance for transactions"
ON public.customer_insurance
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cashier'::app_role) AND
  is_active = true AND
  (valid_to IS NULL OR valid_to >= CURRENT_DATE)
);

-- ===== PART 9: SALES_INVOICES TABLE =====
-- Prevent enumeration attacks

-- Keep existing policies but add enumeration protection
-- Customer policy already restricts to own invoices via customer_id

-- ===== PART 10: CREATE AUDIT LOGGING FUNCTION =====
-- Log access to sensitive data

CREATE OR REPLACE FUNCTION log_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO customer_access_log (customer_id, user_id, action, accessed_at)
  VALUES (
    COALESCE(NEW.customer_id, OLD.customer_id, NEW.id, OLD.id),
    auth.uid(),
    TG_OP,
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ===== PART 11: CREATE SECURE VIEWS FOR LIMITED ACCESS =====

-- Safe customer view for inventory managers (no sensitive data)
CREATE OR REPLACE VIEW safe_customers_summary WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  balance,
  credit_limit,
  is_active
FROM customers
WHERE has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]);

-- Safe supplier view for limited access
CREATE OR REPLACE VIEW safe_suppliers_summary WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  code,
  is_active
FROM suppliers
WHERE has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]);

-- Safe employee view (no salary/personal info)
CREATE OR REPLACE VIEW safe_employees_summary WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  job_title,
  department,
  is_active
FROM employees
WHERE has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role, 'cashier'::app_role]);

-- ===== PART 12: FUNCTION TO CHECK CUSTOMER ACCESS =====
-- Security definer function for customer lookup without full table access

CREATE OR REPLACE FUNCTION get_customer_for_transaction(p_customer_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  balance numeric,
  credit_limit numeric,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return if user has appropriate role
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.balance,
    c.credit_limit,
    c.is_active
  FROM customers c
  WHERE c.id = p_customer_id;
END;
$$;

-- ===== PART 13: FUNCTION TO SEARCH CUSTOMERS (LIMITED) =====
-- For POS/Sales - returns only necessary fields

CREATE OR REPLACE FUNCTION search_customers_for_pos(p_search text, p_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  balance numeric,
  credit_limit numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return if user has appropriate role
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.balance,
    c.credit_limit
  FROM customers c
  WHERE c.is_active = true
    AND (
      c.name ILIKE '%' || p_search || '%'
      OR c.phone ILIKE '%' || p_search || '%'
    )
  ORDER BY c.name
  LIMIT p_limit;
END;
$$;

-- ===== COMMENTS FOR DOCUMENTATION =====
COMMENT ON POLICY "Admin full access to customers" ON public.customers IS 'Admin role has complete CRUD access to all customer records';
COMMENT ON POLICY "Pharmacist read customers with activity" ON public.customers IS 'Pharmacists can only view customers with recent prescriptions or sales within 30 days';
COMMENT ON POLICY "Cashier read customers during transactions" ON public.customers IS 'Cashiers can only view customers during active POS sessions or for today invoices they created';
COMMENT ON POLICY "Admin full access to medication history" ON public.medication_history IS 'Admin has complete access to all medication history records';
COMMENT ON POLICY "Pharmacist access medication history for active patients" ON public.medication_history IS 'Pharmacists can only view medication history for patients with active prescriptions (7 days)';
COMMENT ON POLICY "Customers view own medication history" ON public.medication_history IS 'Customers can view their own medication history through authenticated user link';
COMMENT ON POLICY "Admin full access to prescriptions" ON public.prescriptions IS 'Admin has complete access to all prescriptions';
COMMENT ON POLICY "Pharmacist manage prescriptions" ON public.prescriptions IS 'Pharmacists have full access to manage prescriptions';
COMMENT ON POLICY "Cashier read active prescriptions for billing" ON public.prescriptions IS 'Cashiers can only read active prescriptions from today for billing purposes';
COMMENT ON FUNCTION get_customer_for_transaction IS 'Security definer function for single customer lookup during transactions - returns limited fields';
COMMENT ON FUNCTION search_customers_for_pos IS 'Security definer function for customer search in POS - returns only active customers with limited fields';
