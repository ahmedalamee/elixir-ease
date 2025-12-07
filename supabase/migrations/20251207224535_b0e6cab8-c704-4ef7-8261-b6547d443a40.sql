
-- =====================================================
-- PHASE 2: ADDITIONAL SECURITY HARDENING
-- Address remaining error-level issues
-- =====================================================

-- ===== PART 1: FURTHER RESTRICT CUSTOMERS ACCESS =====
-- Create secure function for customer lookup instead of direct table access

-- Function to get customer by ID for transactions (limited fields)
CREATE OR REPLACE FUNCTION get_customer_limited(p_customer_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  balance numeric,
  credit_limit numeric,
  is_active boolean,
  currency_code varchar
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only staff can access
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Log access
  INSERT INTO customer_access_log (customer_id, user_id, action, accessed_at)
  VALUES (p_customer_id, auth.uid(), 'VIEW', now());
  
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.balance,
    c.credit_limit,
    c.is_active,
    c.currency_code
  FROM customers c
  WHERE c.id = p_customer_id;
END;
$$;

-- ===== PART 2: PROTECT EMPLOYEES SENSITIVE FIELDS =====
-- Create a view that masks salary for non-admin users

CREATE OR REPLACE VIEW safe_employee_details WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  phone,
  email,
  job_title,
  department,
  hire_date,
  is_active,
  user_id,
  -- Mask national_id for non-admin
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN national_id
    ELSE '****' || RIGHT(COALESCE(national_id, ''), 4)
  END as national_id,
  -- Hide salary for non-admin
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN salary
    ELSE NULL
  END as salary
FROM employees
WHERE 
  has_role(auth.uid(), 'admin'::app_role) OR 
  user_id = auth.uid();

-- ===== PART 3: RESTRICT SALES INVOICES BY CREATOR =====
-- Staff should only see invoices they created or are assigned to

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Staff can manage invoices" ON public.sales_invoices;
DROP POLICY IF EXISTS "Staff can select invoices" ON public.sales_invoices;
DROP POLICY IF EXISTS "Staff can view all invoices" ON public.sales_invoices;

-- Admin: Full access to all invoices
CREATE POLICY "Admin full access to invoices"
ON public.sales_invoices
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Pharmacist: View/create invoices they created or from their sessions
CREATE POLICY "Pharmacist manage own invoices"
ON public.sales_invoices
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) AND (
    created_by = auth.uid() OR
    posted_by = auth.uid() OR
    -- From today or recent
    created_at > (now() - interval '7 days')
  )
)
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- Cashier: Only invoices from their POS sessions or that they created today
CREATE POLICY "Cashier view own session invoices"
ON public.sales_invoices
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cashier'::app_role) AND (
    created_by = auth.uid() OR
    pos_session_id IN (
      SELECT ps.id FROM pos_sessions ps WHERE ps.user_id = auth.uid()
    )
  )
);

-- Cashier: Can insert invoices
CREATE POLICY "Cashier insert invoices"
ON public.sales_invoices
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'cashier'::app_role) AND
  created_by = auth.uid()
);

-- Cashier: Can update only draft invoices they created
CREATE POLICY "Cashier update own draft invoices"
ON public.sales_invoices
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'cashier'::app_role) AND
  created_by = auth.uid() AND
  status = 'draft'
)
WITH CHECK (
  has_role(auth.uid(), 'cashier'::app_role) AND
  status IN ('draft', 'posted')
);

-- Customer: View own invoices (keep existing policy)
-- Already exists: "Customers can view own invoices"

-- ===== PART 4: RESTRICT PRESCRIPTIONS BY ASSIGNMENT =====
-- Pharmacists should ideally see only prescriptions they are processing

DROP POLICY IF EXISTS "Pharmacist manage prescriptions" ON public.prescriptions;

-- Pharmacist: Can view/manage prescriptions (keep full access for now as needed for workflow)
-- But add audit logging
CREATE POLICY "Pharmacist manage prescriptions with audit"
ON public.prescriptions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'pharmacist'::app_role))
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- ===== PART 5: ADD AUDIT TRIGGERS FOR SENSITIVE DATA =====

-- Audit trigger for prescriptions access
CREATE OR REPLACE FUNCTION log_prescription_access()
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
    'PRESCRIPTION_' || TG_OP,
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_prescription_access') THEN
    CREATE TRIGGER trg_audit_prescription_access
    AFTER INSERT OR UPDATE ON prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION log_prescription_access();
  END IF;
END;
$$;

-- ===== PART 6: CUSTOMER HEALTH RECORDS - STRICTER ACCESS =====
-- Reduce access window from 7 days to 3 days

DROP POLICY IF EXISTS "Pharmacist access for active prescriptions" ON public.customer_health_records;
DROP POLICY IF EXISTS "Pharmacist modify for active prescriptions" ON public.customer_health_records;
DROP POLICY IF EXISTS "Pharmacist update for active prescriptions" ON public.customer_health_records;

-- Pharmacist: Very limited access - only 3 days and only pending prescriptions
CREATE POLICY "Pharmacist read health records for pending prescriptions"
ON public.customer_health_records
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) AND
  EXISTS (
    SELECT 1 FROM prescriptions p 
    WHERE p.customer_id = customer_health_records.customer_id 
    AND p.status = 'pending'  -- Only pending, not dispensed
    AND p.created_at > (now() - interval '3 days')
  )
);

-- ===== PART 7: CREATE FUNCTION FOR SAFE SUPPLIER ACCESS =====

CREATE OR REPLACE FUNCTION get_supplier_for_order(p_supplier_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  code text,
  phone text,
  is_active boolean,
  currency_code varchar
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only inventory manager or admin
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.code,
    s.phone,
    s.is_active,
    s.currency_code
  FROM suppliers s
  WHERE s.id = p_supplier_id;
END;
$$;

-- Function to search suppliers with limited fields
CREATE OR REPLACE FUNCTION search_suppliers_limited(p_search text, p_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  name text,
  code text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only inventory manager, pharmacist, or admin
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role, 'pharmacist'::app_role]) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.code,
    s.is_active
  FROM suppliers s
  WHERE s.is_active = true
    AND (
      s.name ILIKE '%' || p_search || '%'
      OR s.code ILIKE '%' || p_search || '%'
    )
  ORDER BY s.name
  LIMIT p_limit;
END;
$$;

-- ===== PART 8: COMMENTS =====
COMMENT ON POLICY "Admin full access to invoices" ON public.sales_invoices IS 'Admin has complete access to all sales invoices';
COMMENT ON POLICY "Pharmacist manage own invoices" ON public.sales_invoices IS 'Pharmacists can view and manage invoices they created or from recent period';
COMMENT ON POLICY "Cashier view own session invoices" ON public.sales_invoices IS 'Cashiers can only view invoices from their own POS sessions';
COMMENT ON POLICY "Cashier insert invoices" ON public.sales_invoices IS 'Cashiers can create invoices with their user ID as created_by';
COMMENT ON POLICY "Pharmacist read health records for pending prescriptions" ON public.customer_health_records IS 'Pharmacists can only view health records for customers with PENDING prescriptions in last 3 days';
COMMENT ON FUNCTION get_customer_limited IS 'Secure function to get customer data with limited fields and audit logging';
COMMENT ON FUNCTION get_supplier_for_order IS 'Secure function to get supplier data for purchase orders with limited fields';
COMMENT ON FUNCTION search_suppliers_limited IS 'Secure function to search suppliers with limited fields returned';
COMMENT ON VIEW safe_employee_details IS 'Safe view that masks salary and national_id for non-admin users';
