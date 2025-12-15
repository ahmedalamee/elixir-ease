
-- =====================================================
-- COMPLETE SECURITY HARDENING - All policies in one migration
-- =====================================================

-- =====================================================
-- PART 1: EMPLOYEES TABLE - Restrict salary/national_id access
-- =====================================================

-- Drop ALL existing employees policies 
DROP POLICY IF EXISTS "Admin can delete employees" ON employees;
DROP POLICY IF EXISTS "Admin can insert employees" ON employees;
DROP POLICY IF EXISTS "Admin can select all employees" ON employees;
DROP POLICY IF EXISTS "Admin can update employees" ON employees;
DROP POLICY IF EXISTS "Admin full access to employees" ON employees;
DROP POLICY IF EXISTS "Employees view own record" ON employees;
DROP POLICY IF EXISTS "employees_admin_full_access" ON employees;
DROP POLICY IF EXISTS "employees_self_view" ON employees;

-- Ensure RLS and FORCE RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;

-- Only admin can access full employee records (including salary, national_id)
CREATE POLICY "employees_admin_only" ON employees
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Employees can view their own record only
CREATE POLICY "employees_view_own" ON employees
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- PART 2: CUSTOMERS TABLE - Tighten access windows  
-- =====================================================

-- Drop broad policies
DROP POLICY IF EXISTS "Cashier read customers during transactions" ON customers;
DROP POLICY IF EXISTS "Pharmacist read customers with activity" ON customers;
DROP POLICY IF EXISTS "Pharmacist update customers with activity" ON customers;
DROP POLICY IF EXISTS "Pharmacist can insert customers" ON customers;
DROP POLICY IF EXISTS "Users can create own customer record" ON customers;
DROP POLICY IF EXISTS "customers_pharmacist_active_prescription" ON customers;
DROP POLICY IF EXISTS "customers_pharmacist_active_update" ON customers;
DROP POLICY IF EXISTS "customers_pharmacist_insert" ON customers;
DROP POLICY IF EXISTS "customers_cashier_active_session_only" ON customers;

-- Pharmacist: Only customers with ACTIVE pending prescriptions (8 hour window, not 30 days)
CREATE POLICY "customers_pharmacist_pending_rx" ON customers
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) 
  AND EXISTS (
    SELECT 1 FROM prescriptions p
    WHERE p.customer_id = customers.id 
    AND p.status = 'pending'
    AND p.dispensed_at IS NULL
    AND p.created_at > (now() - interval '8 hours')
  )
);

-- Pharmacist: Update only for active pending prescriptions
CREATE POLICY "customers_pharmacist_update_pending" ON customers
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) 
  AND EXISTS (
    SELECT 1 FROM prescriptions p
    WHERE p.customer_id = customers.id 
    AND p.status = 'pending'
    AND p.dispensed_at IS NULL
  )
)
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- Pharmacist: Insert new customers
CREATE POLICY "customers_pharmacist_add" ON customers
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- Cashier: ONLY customers in current ACTIVE session with DRAFT invoices
CREATE POLICY "customers_cashier_current_draft" ON customers
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
  )
);

-- =====================================================
-- PART 3: CUSTOMER_HEALTH_RECORDS - Reduce to 8 hour window
-- =====================================================

DROP POLICY IF EXISTS "Pharmacist read health records for pending prescriptions" ON customer_health_records;
DROP POLICY IF EXISTS "health_records_pharmacist_active_dispensing" ON customer_health_records;

-- Stricter: Only during active dispensing (8 hour window, pending, not dispensed)
CREATE POLICY "health_records_pharmacist_active" ON customer_health_records
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) 
  AND EXISTS (
    SELECT 1 FROM prescriptions p
    WHERE p.customer_id = customer_health_records.customer_id 
    AND p.status = 'pending'
    AND p.dispensed_at IS NULL
    AND p.created_at > (now() - interval '8 hours')
  )
);

-- =====================================================
-- PART 4: MEDICATION_HISTORY - Stricter access
-- =====================================================

DROP POLICY IF EXISTS "Pharmacist read medication for dispensing" ON medication_history;
DROP POLICY IF EXISTS "Pharmacist insert medication during dispensing" ON medication_history;
DROP POLICY IF EXISTS "medication_history_pharmacist_active" ON medication_history;
DROP POLICY IF EXISTS "medication_history_pharmacist_insert" ON medication_history;

-- Read only during active pending prescription
CREATE POLICY "medication_history_read_pending" ON medication_history
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) 
  AND EXISTS (
    SELECT 1 FROM prescriptions p
    WHERE p.customer_id = medication_history.customer_id 
    AND p.status = 'pending'
    AND p.dispensed_at IS NULL
    AND p.created_at > (now() - interval '8 hours')
  )
);

-- Insert only during active pending prescription
CREATE POLICY "medication_history_insert_pending" ON medication_history
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'pharmacist'::app_role) 
  AND EXISTS (
    SELECT 1 FROM prescriptions p
    WHERE p.customer_id = medication_history.customer_id 
    AND p.status = 'pending'
    AND p.created_at > (now() - interval '8 hours')
  )
);

-- =====================================================
-- PART 5: SUPPLIERS - Remove pharmacist access
-- =====================================================

DROP POLICY IF EXISTS "Pharmacist read suppliers" ON suppliers;

-- Only admin and inventory_manager have access (already in place)
