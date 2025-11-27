-- Fix Security Definer Views by recreating with security_invoker mode
-- This ensures views execute with querying user's permissions, enforcing RLS

-- 1. Fix inventory_summary_view
DROP VIEW IF EXISTS public.inventory_summary_view;
CREATE VIEW public.inventory_summary_view
WITH (security_invoker = true)
AS 
SELECT id,
    name,
    category_id,
    total_stock,
    total_reserved,
    cost_price,
    price,
    total_cost_value,
    total_retail_value
FROM analytics.mv_inventory_summary;

-- 2. Fix posted_documents_audit
DROP VIEW IF EXISTS public.posted_documents_audit;
CREATE VIEW public.posted_documents_audit
WITH (security_invoker = true)
AS
SELECT 'sales_invoice'::text AS document_type,
    sales_invoices.id,
    sales_invoices.invoice_number AS document_number,
    sales_invoices.invoice_date AS document_date,
    sales_invoices.total_amount,
    sales_invoices.status,
    sales_invoices.posted_by,
    sales_invoices.posted_at,
    sales_invoices.customer_id AS party_id,
    NULL::uuid AS warehouse_id
FROM sales_invoices
WHERE sales_invoices.status = 'posted'::text
UNION ALL
SELECT 'purchase_invoice'::text AS document_type,
    purchase_invoices.id,
    purchase_invoices.pi_number AS document_number,
    purchase_invoices.invoice_date AS document_date,
    purchase_invoices.total_amount,
    purchase_invoices.status,
    purchase_invoices.posted_by,
    purchase_invoices.posted_at,
    purchase_invoices.supplier_id AS party_id,
    purchase_invoices.warehouse_id
FROM purchase_invoices
WHERE purchase_invoices.status = 'posted'::text
UNION ALL
SELECT 'journal_entry'::text AS document_type,
    journal_entries.id,
    journal_entries.entry_number AS document_number,
    journal_entries.entry_date AS document_date,
    journal_entries.total_debit AS total_amount,
    journal_entries.status,
    journal_entries.posted_by,
    journal_entries.posted_at,
    NULL::uuid AS party_id,
    NULL::uuid AS warehouse_id
FROM journal_entries
WHERE journal_entries.status = 'posted'::text
ORDER BY 4 DESC, 8 DESC;

-- 3. Fix sales_by_currency
DROP VIEW IF EXISTS public.sales_by_currency;
CREATE VIEW public.sales_by_currency
WITH (security_invoker = true)
AS
SELECT si.currency_code,
    c.name AS currency_name,
    c.symbol AS currency_symbol,
    count(si.id) AS invoice_count,
    sum(si.total_amount) AS total_in_currency,
    sum(si.base_currency_total) AS total_in_base_currency,
    avg(si.exchange_rate) AS avg_exchange_rate,
    min(si.invoice_date) AS first_invoice_date,
    max(si.invoice_date) AS last_invoice_date
FROM sales_invoices si
LEFT JOIN currencies c ON c.code = si.currency_code::text
WHERE si.status = 'posted'::text
GROUP BY si.currency_code, c.name, c.symbol;

-- 4. Fix sales_summary_view
DROP VIEW IF EXISTS public.sales_summary_view;
CREATE VIEW public.sales_summary_view
WITH (security_invoker = true)
AS
SELECT sale_date,
    customer_id,
    invoice_count,
    total_subtotal,
    total_discount,
    total_tax,
    total_sales
FROM analytics.mv_sales_summary;