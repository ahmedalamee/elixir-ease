
-- =====================================================
-- COMPREHENSIVE RLS FIX: Deny ALL Anonymous Access
-- =====================================================

-- 1. Drop policies that apply to 'public' role and recreate for 'authenticated' only

-- Fix customer_health_records policies
DROP POLICY IF EXISTS "Admin full access to health records" ON customer_health_records;
DROP POLICY IF EXISTS "Admins can view all health records" ON customer_health_records;
DROP POLICY IF EXISTS "Customers can view own health records" ON customer_health_records;
DROP POLICY IF EXISTS "Pharmacist read health records for pending prescriptions" ON customer_health_records;

CREATE POLICY "Admin full access to health records" ON customer_health_records
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Pharmacist read health records for pending prescriptions" ON customer_health_records
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) 
  AND EXISTS (
    SELECT 1 FROM prescriptions p
    WHERE p.customer_id = customer_health_records.customer_id
    AND p.status = 'pending'
    AND p.created_at > (now() - INTERVAL '3 days')
  )
);

-- Fix customers policies that use 'public' role
DROP POLICY IF EXISTS "Customers can update own info" ON customers;
DROP POLICY IF EXISTS "Customers can view own data" ON customers;
DROP POLICY IF EXISTS "Only admin can delete customers" ON customers;

CREATE POLICY "Customers can view own data" ON customers
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Customers can update own info" ON customers
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admin can delete customers" ON customers
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix employees policies - ensure all apply to authenticated only
DROP POLICY IF EXISTS "Admin full access to employees" ON employees;
DROP POLICY IF EXISTS "Employees can view their own record" ON employees;
DROP POLICY IF EXISTS "Employees view own record" ON employees;

CREATE POLICY "Admin full access to employees" ON employees
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees view own record" ON employees
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 3. Fix suppliers policies
DROP POLICY IF EXISTS "Admin full access to suppliers" ON suppliers;
DROP POLICY IF EXISTS "Inventory manager full access to suppliers" ON suppliers;

CREATE POLICY "Admin full access to suppliers" ON suppliers
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Inventory manager full access to suppliers" ON suppliers
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'inventory_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'inventory_manager'::app_role));

-- Add read policy for pharmacist on suppliers
CREATE POLICY "Pharmacist read suppliers" ON suppliers
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'pharmacist'::app_role));

-- 4. Fix products policies - add base auth requirement
DROP POLICY IF EXISTS "All staff read products" ON products;
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "public_read" ON products;

CREATE POLICY "Authenticated staff read products" ON products
FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role, 'cashier'::app_role]));

-- 5. Fix warehouse_stock policies
DROP POLICY IF EXISTS "All staff read warehouse stock" ON warehouse_stock;
DROP POLICY IF EXISTS "Staff read warehouse stock" ON warehouse_stock;

CREATE POLICY "Authenticated staff read warehouse_stock" ON warehouse_stock
FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role, 'cashier'::app_role]));

-- 6. Fix stock_ledger policies
DROP POLICY IF EXISTS "All staff read stock ledger" ON stock_ledger;

CREATE POLICY "Authenticated staff read stock_ledger" ON stock_ledger
FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]));

-- 7. Fix gl_accounts policies
DROP POLICY IF EXISTS "Staff read accounts" ON gl_accounts;
DROP POLICY IF EXISTS "All staff read gl_accounts" ON gl_accounts;

CREATE POLICY "Authenticated staff read gl_accounts" ON gl_accounts
FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]));

-- 8. Fix cash_boxes policies
DROP POLICY IF EXISTS "Admin and cashier read cash_boxes" ON cash_boxes;
DROP POLICY IF EXISTS "Staff read cash_boxes" ON cash_boxes;

CREATE POLICY "Authenticated staff read cash_boxes" ON cash_boxes
FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role, 'pharmacist'::app_role]));

-- 9. Fix cash_transactions policies
DROP POLICY IF EXISTS "Admin and cashier read cash_transactions" ON cash_transactions;

CREATE POLICY "Authenticated staff read cash_transactions" ON cash_transactions
FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role, 'pharmacist'::app_role]));

-- 10. Fix company_branding policies
DROP POLICY IF EXISTS "Authenticated users can view company branding" ON company_branding;
DROP POLICY IF EXISTS "Anyone can view company branding" ON company_branding;
DROP POLICY IF EXISTS "Public can view company branding" ON company_branding;

CREATE POLICY "Authenticated users view company branding" ON company_branding
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 11. Fix exchange_rates policies
DROP POLICY IF EXISTS "Authenticated users can view exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Public can view exchange rates" ON exchange_rates;

CREATE POLICY "Authenticated users view exchange rates" ON exchange_rates
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 12. Fix medication_history policies to use authenticated
DROP POLICY IF EXISTS "Admin full access to medication history" ON medication_history;
DROP POLICY IF EXISTS "Customers view own medication history" ON medication_history;
DROP POLICY IF EXISTS "Pharmacist insert medication during dispensing" ON medication_history;
DROP POLICY IF EXISTS "Pharmacist read medication for active dispensing" ON medication_history;

CREATE POLICY "Admin full access to medication_history" ON medication_history
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Pharmacist read medication for dispensing" ON medication_history
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) 
  AND EXISTS (
    SELECT 1 FROM prescriptions p
    WHERE p.customer_id = medication_history.customer_id
    AND p.status = 'pending'
    AND p.created_at > (now() - INTERVAL '24 hours')
  )
);

CREATE POLICY "Pharmacist insert medication during dispensing" ON medication_history
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'pharmacist'::app_role) 
  AND EXISTS (
    SELECT 1 FROM prescriptions p
    WHERE p.customer_id = medication_history.customer_id
    AND p.status = 'pending'
    AND p.created_at > (now() - INTERVAL '24 hours')
  )
);

-- 13. Fix prescriptions policies - ensure authenticated only
DROP POLICY IF EXISTS "Admin full access to prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Customers view own prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Pharmacist manage prescriptions with audit" ON prescriptions;
DROP POLICY IF EXISTS "Cashier read prescriptions for own session" ON prescriptions;

CREATE POLICY "Admin full access to prescriptions" ON prescriptions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Pharmacist manage prescriptions" ON prescriptions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'pharmacist'::app_role))
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

CREATE POLICY "Cashier read prescriptions for session" ON prescriptions
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'cashier'::app_role) 
  AND EXISTS (
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

-- 14. Double-check REVOKE from anon on all tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;

-- Grant to authenticated only
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
