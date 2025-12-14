
-- =====================================================
-- FIX PUBLIC_DATA_EXPOSURE: Secure All Views
-- =====================================================

-- 1. Fix public_company_info - this is intentionally public for logo/branding
-- Just ensure it only returns non-sensitive data (already does)
-- But add auth check to prevent anonymous access to any data

CREATE OR REPLACE VIEW public_company_info
WITH (security_invoker = true) AS
SELECT 
  company_name,
  company_name_en,
  company_logo_url,
  theme_color
FROM company_branding
WHERE auth.uid() IS NOT NULL
LIMIT 1;

-- 2. Fix vw_current_exchange_rates - add auth check
CREATE OR REPLACE VIEW vw_current_exchange_rates
WITH (security_invoker = true) AS
SELECT DISTINCT ON (from_currency, to_currency)
  id,
  from_currency,
  to_currency,
  rate,
  effective_date
FROM exchange_rates
WHERE auth.uid() IS NOT NULL
ORDER BY from_currency, to_currency, effective_date DESC;

-- 3. Fix vw_latest_exchange_rates - already has auth check but verify
CREATE OR REPLACE VIEW vw_latest_exchange_rates
WITH (security_invoker = true) AS
SELECT DISTINCT ON (from_currency, to_currency)
  from_currency,
  to_currency,
  rate,
  effective_date
FROM exchange_rates
WHERE auth.uid() IS NOT NULL
ORDER BY from_currency, to_currency, effective_date DESC;

-- 4. Fix safe_employee_details - restrict to authorized roles only
CREATE OR REPLACE VIEW safe_employee_details
WITH (security_invoker = true) AS
SELECT 
  id,
  employee_code,
  full_name,
  full_name_en,
  phone,
  email,
  job_title,
  department,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN salary
    ELSE NULL::numeric
  END AS salary,
  hire_date,
  is_active,
  created_at
FROM employees
WHERE auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role, 'cashier'::app_role]);

-- 5. Fix safe_employees_summary - already good but ensure consistency
CREATE OR REPLACE VIEW safe_employees_summary
WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  job_title,
  department,
  is_active
FROM employees
WHERE auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role, 'cashier'::app_role]);

-- 6. Fix safe_customers_summary - already good but verify
CREATE OR REPLACE VIEW safe_customers_summary
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  phone,
  email,
  balance,
  credit_limit,
  loyalty_points,
  is_active,
  currency_code
FROM customers
WHERE auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]);

-- 7. Fix safe_suppliers_summary - already good but verify
CREATE OR REPLACE VIEW safe_suppliers_summary
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  code,
  phone,
  email,
  balance,
  currency_code,
  is_active
FROM suppliers
WHERE auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]);

-- 8. REVOKE all privileges from anon and public on all views
REVOKE ALL ON public_company_info FROM anon, public;
REVOKE ALL ON vw_current_exchange_rates FROM anon, public;
REVOKE ALL ON vw_latest_exchange_rates FROM anon, public;
REVOKE ALL ON safe_employee_details FROM anon, public;
REVOKE ALL ON safe_employees_summary FROM anon, public;
REVOKE ALL ON safe_customers_summary FROM anon, public;
REVOKE ALL ON safe_suppliers_summary FROM anon, public;
REVOKE ALL ON inventory_summary_view FROM anon, public;
REVOKE ALL ON posted_documents_audit FROM anon, public;
REVOKE ALL ON returns_inventory_impact FROM anon, public;
REVOKE ALL ON returns_processing_monitor FROM anon, public;
REVOKE ALL ON returns_statistics FROM anon, public;
REVOKE ALL ON sales_by_currency FROM anon, public;
REVOKE ALL ON sales_summary_view FROM anon, public;
REVOKE ALL ON stock_alerts FROM anon, public;
REVOKE ALL ON vw_document_gl_links FROM anon, public;

-- 9. Grant SELECT only to authenticated role for all views
GRANT SELECT ON public_company_info TO authenticated;
GRANT SELECT ON vw_current_exchange_rates TO authenticated;
GRANT SELECT ON vw_latest_exchange_rates TO authenticated;
GRANT SELECT ON safe_employee_details TO authenticated;
GRANT SELECT ON safe_employees_summary TO authenticated;
GRANT SELECT ON safe_customers_summary TO authenticated;
GRANT SELECT ON safe_suppliers_summary TO authenticated;
GRANT SELECT ON inventory_summary_view TO authenticated;
GRANT SELECT ON posted_documents_audit TO authenticated;
GRANT SELECT ON returns_inventory_impact TO authenticated;
GRANT SELECT ON returns_processing_monitor TO authenticated;
GRANT SELECT ON returns_statistics TO authenticated;
GRANT SELECT ON sales_by_currency TO authenticated;
GRANT SELECT ON sales_summary_view TO authenticated;
GRANT SELECT ON stock_alerts TO authenticated;
GRANT SELECT ON vw_document_gl_links TO authenticated;

-- 10. Force RLS on base tables to ensure views respect it
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock FORCE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_cost_layers FORCE ROW LEVEL SECURITY;
ALTER TABLE sales_returns FORCE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns FORCE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates FORCE ROW LEVEL SECURITY;
ALTER TABLE company_branding FORCE ROW LEVEL SECURITY;

-- 11. Add RLS policy for exchange_rates if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'exchange_rates' 
    AND policyname = 'Authenticated users can view exchange rates'
  ) THEN
    CREATE POLICY "Authenticated users can view exchange rates"
    ON exchange_rates FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 12. Add RLS policy for company_branding if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'company_branding' 
    AND policyname = 'Authenticated users can view company branding'
  ) THEN
    CREATE POLICY "Authenticated users can view company branding"
    ON company_branding FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
