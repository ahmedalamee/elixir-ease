-- Fix: Remove auth.users exposure from returns_processing_monitor view
-- Replace email with employee name for security

DROP VIEW IF EXISTS returns_processing_monitor;

CREATE VIEW returns_processing_monitor AS
SELECT 
    sr.id,
    sr.return_number,
    sr.status,
    sr.return_date,
    c.name AS customer_name,
    w.name AS warehouse_name,
    si.invoice_number AS original_invoice,
    sr.total_amount,
    sr.refund_amount,
    (SELECT COUNT(*) FROM sales_return_items WHERE sales_return_items.return_id = sr.id) AS items_count,
    sr.created_at,
    sr.posted_at,
    e.full_name AS created_by_name  -- Use employee name instead of email
FROM sales_returns sr
LEFT JOIN customers c ON sr.customer_id = c.id
LEFT JOIN warehouses w ON sr.warehouse_id = w.id
LEFT JOIN sales_invoices si ON sr.sales_invoice_id = si.id
LEFT JOIN employees e ON sr.created_by = e.user_id  -- Join with employees instead of auth.users
ORDER BY sr.created_at DESC;