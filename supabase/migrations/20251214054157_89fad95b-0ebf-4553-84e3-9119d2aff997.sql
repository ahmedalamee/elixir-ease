
-- =====================================================
-- COMPREHENSIVE SECURITY FIX: Block ALL Anonymous Access
-- =====================================================

-- 1. REVOKE ALL from anon on ALL public views
DO $$
DECLARE
  v_view RECORD;
BEGIN
  FOR v_view IN 
    SELECT viewname FROM pg_catalog.pg_views WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON %I FROM anon', v_view.viewname);
    EXECUTE format('REVOKE ALL ON %I FROM public', v_view.viewname);
  END LOOP;
END $$;

-- 2. REVOKE anon access from sensitive tables
REVOKE ALL ON TABLE customers FROM anon, public;
REVOKE ALL ON TABLE employees FROM anon, public;
REVOKE ALL ON TABLE suppliers FROM anon, public;
REVOKE ALL ON TABLE customer_health_records FROM anon, public;
REVOKE ALL ON TABLE sales_invoices FROM anon, public;
REVOKE ALL ON TABLE purchase_invoices FROM anon, public;
REVOKE ALL ON TABLE products FROM anon, public;
REVOKE ALL ON TABLE warehouse_stock FROM anon, public;
REVOKE ALL ON TABLE inventory_cost_layers FROM anon, public;
REVOKE ALL ON TABLE stock_ledger FROM anon, public;
REVOKE ALL ON TABLE sales_returns FROM anon, public;
REVOKE ALL ON TABLE purchase_returns FROM anon, public;
REVOKE ALL ON TABLE journal_entries FROM anon, public;
REVOKE ALL ON TABLE journal_entry_lines FROM anon, public;
REVOKE ALL ON TABLE company_branding FROM anon, public;
REVOKE ALL ON TABLE exchange_rates FROM anon, public;
REVOKE ALL ON TABLE prescriptions FROM anon, public;
REVOKE ALL ON TABLE medication_history FROM anon, public;
REVOKE ALL ON TABLE gl_accounts FROM anon, public;
REVOKE ALL ON TABLE cash_boxes FROM anon, public;
REVOKE ALL ON TABLE cash_transactions FROM anon, public;

-- 3. Grant SELECT on views only to authenticated
GRANT SELECT ON public_company_info TO authenticated;
GRANT SELECT ON sales_by_currency TO authenticated;
GRANT SELECT ON inventory_summary_view TO authenticated;
GRANT SELECT ON stock_alerts TO authenticated;
GRANT SELECT ON sales_summary_view TO authenticated;
GRANT SELECT ON returns_statistics TO authenticated;
GRANT SELECT ON safe_customers_summary TO authenticated;
GRANT SELECT ON safe_employees_summary TO authenticated;
GRANT SELECT ON safe_suppliers_summary TO authenticated;
GRANT SELECT ON safe_employee_details TO authenticated;
GRANT SELECT ON vw_latest_exchange_rates TO authenticated;
GRANT SELECT ON vw_current_exchange_rates TO authenticated;
GRANT SELECT ON vw_document_gl_links TO authenticated;
GRANT SELECT ON posted_documents_audit TO authenticated;
GRANT SELECT ON returns_processing_monitor TO authenticated;
GRANT SELECT ON returns_inventory_impact TO authenticated;

-- 4. Grant appropriate privileges on tables to authenticated only
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE customer_health_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE sales_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE purchase_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE warehouse_stock TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE inventory_cost_layers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stock_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE sales_returns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE purchase_returns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE journal_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE journal_entry_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE company_branding TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE exchange_rates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE prescriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE medication_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE gl_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cash_boxes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cash_transactions TO authenticated;

-- 5. Ensure RLS is forced on all sensitive tables
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
ALTER TABLE suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE customer_health_records FORCE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_cost_layers FORCE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE sales_returns FORCE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns FORCE ROW LEVEL SECURITY;
ALTER TABLE journal_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE company_branding FORCE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates FORCE ROW LEVEL SECURITY;
ALTER TABLE prescriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE medication_history FORCE ROW LEVEL SECURITY;
ALTER TABLE gl_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE cash_boxes FORCE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions FORCE ROW LEVEL SECURITY;

-- 6. Revoke default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM public;

-- 7. Ensure company_branding view is more restrictive (requires auth)
CREATE OR REPLACE VIEW public_company_info
WITH (security_invoker = true) AS
SELECT 
  company_name,
  company_name_en,
  company_logo_url,
  theme_color
FROM company_branding
WHERE auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role])
LIMIT 1;

-- 8. Fix safe_employee_details to be more restrictive
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

-- 9. Ensure posted_documents_audit is admin-only
CREATE OR REPLACE VIEW posted_documents_audit
WITH (security_invoker = true) AS
SELECT 'sales_invoice'::text AS doc_type,
    id,
    invoice_number AS doc_number,
    posted_at,
    posted_by,
    total_amount_bc AS amount
FROM sales_invoices
WHERE status = 'posted' 
  AND auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin'::app_role)
UNION ALL
SELECT 'purchase_invoice'::text AS doc_type,
    id,
    pi_number AS doc_number,
    posted_at,
    posted_by,
    total_amount_bc AS amount
FROM purchase_invoices
WHERE status = 'posted' 
  AND auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin'::app_role);

-- 10. Ensure returns_processing_monitor is admin-only
CREATE OR REPLACE VIEW returns_processing_monitor
WITH (security_invoker = true) AS
SELECT 
  sr.id,
  sr.return_number,
  sr.status,
  sr.total_amount,
  sr.created_at,
  sr.posted_at,
  e.full_name AS posted_by_name
FROM sales_returns sr
LEFT JOIN employees e ON e.user_id = sr.posted_by
WHERE auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin'::app_role);

-- 11. Ensure returns_inventory_impact is restricted
CREATE OR REPLACE VIEW returns_inventory_impact
WITH (security_invoker = true) AS
SELECT 
  sr.id AS return_id,
  sr.return_number,
  'sales_return'::text AS return_type,
  sri.item_id AS product_id,
  p.name AS product_name,
  sri.quantity,
  sr.warehouse_id,
  w.name AS warehouse_name,
  sr.posted_at
FROM sales_returns sr
JOIN sales_return_items sri ON sri.return_id = sr.id
JOIN products p ON p.id = sri.item_id
LEFT JOIN warehouses w ON w.id = sr.warehouse_id
WHERE sr.status = 'posted'
  AND auth.uid() IS NOT NULL 
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]);

-- 12. Ensure vw_document_gl_links is restricted
CREATE OR REPLACE VIEW vw_document_gl_links
WITH (security_invoker = true) AS
SELECT 
  id AS journal_entry_id,
  entry_number,
  reference_type AS document_type,
  reference_id AS document_id,
  entry_date,
  total_debit,
  total_credit,
  status
FROM journal_entries
WHERE auth.uid() IS NOT NULL 
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]);

-- 13. Ensure vw_latest_exchange_rates requires auth
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

-- 14. Ensure vw_current_exchange_rates requires auth
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
