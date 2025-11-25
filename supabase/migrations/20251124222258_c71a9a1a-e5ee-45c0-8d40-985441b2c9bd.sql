-- Fix SECURITY DEFINER views by explicitly setting SECURITY INVOKER
-- This ensures views execute with the permissions of the querying user, not the view creator

-- Drop and recreate returns_inventory_impact with SECURITY INVOKER
DROP VIEW IF EXISTS returns_inventory_impact;

CREATE VIEW returns_inventory_impact 
WITH (security_invoker = true)
AS
SELECT 
    sr.id as return_id,
    sr.return_number,
    sr.return_date,
    sr.status,
    sri.item_id,
    p.name as product_name,
    sri.quantity as returned_quantity,
    sr.warehouse_id,
    w.name as warehouse_name,
    sri.condition as item_condition
FROM sales_returns sr
INNER JOIN sales_return_items sri ON sri.return_id = sr.id
INNER JOIN products p ON p.id = sri.item_id
LEFT JOIN warehouses w ON w.id = sr.warehouse_id
ORDER BY sr.return_date DESC;

-- Drop and recreate returns_processing_monitor with SECURITY INVOKER (already fixed earlier but ensuring consistency)
DROP VIEW IF EXISTS returns_processing_monitor;

CREATE VIEW returns_processing_monitor 
WITH (security_invoker = true)
AS
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
    e.full_name AS created_by_name
FROM sales_returns sr
LEFT JOIN customers c ON sr.customer_id = c.id
LEFT JOIN warehouses w ON sr.warehouse_id = w.id
LEFT JOIN sales_invoices si ON sr.sales_invoice_id = si.id
LEFT JOIN employees e ON sr.created_by = e.user_id
ORDER BY sr.created_at DESC;

-- Drop and recreate returns_statistics with SECURITY INVOKER
DROP VIEW IF EXISTS returns_statistics;

CREATE VIEW returns_statistics 
WITH (security_invoker = true)
AS
SELECT 
    COUNT(DISTINCT sr.id) as total_returns,
    COUNT(DISTINCT CASE WHEN sr.status = 'posted' THEN sr.id END) as posted_returns,
    COUNT(DISTINCT CASE WHEN sr.status = 'draft' THEN sr.id END) as draft_returns,
    COALESCE(SUM(CASE WHEN sr.status = 'posted' THEN sr.total_amount ELSE 0 END), 0) as total_refunded_amount,
    COALESCE(SUM(CASE WHEN sr.status = 'posted' THEN sri.quantity ELSE 0 END), 0) as total_items_returned,
    COUNT(DISTINCT sr.customer_id) as customers_with_returns,
    AVG(CASE WHEN sr.status = 'posted' THEN sr.total_amount END) as avg_return_amount
FROM sales_returns sr
LEFT JOIN sales_return_items sri ON sri.return_id = sr.id;