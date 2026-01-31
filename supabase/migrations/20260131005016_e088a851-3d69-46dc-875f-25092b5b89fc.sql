
-- Fix Security Definer View - Convert to SECURITY INVOKER
DROP VIEW IF EXISTS public.v_product_stock_summary;

CREATE VIEW public.v_product_stock_summary 
WITH (security_invoker = true)
AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.barcode,
    p.sku,
    c.name as category_name,
    s.name as supplier_name,
    s.id as supplier_id,
    COALESCE(SUM(ws.qty_on_hand), 0) as total_stock,
    COALESCE(SUM(ws.qty_reserved), 0) as reserved_stock,
    COALESCE(SUM(ws.qty_inbound), 0) as inbound_stock,
    COALESCE(SUM(ws.qty_on_hand) - SUM(ws.qty_reserved), 0) as available_stock,
    COALESCE(
        (SELECT SUM(sr.quantity_reserved - sr.quantity_released) 
         FROM stock_reservations sr 
         WHERE sr.item_id = p.id 
         AND sr.status IN ('active', 'partially_released')), 0
    ) as locked_stock,
    p.reorder_level,
    p.min_quantity,
    p.is_active
FROM products p
LEFT JOIN warehouse_stock ws ON ws.item_id = p.id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN suppliers s ON s.id = p.preferred_supplier_id
GROUP BY p.id, p.name, p.barcode, p.sku, c.name, s.name, s.id, p.reorder_level, p.min_quantity, p.is_active;

GRANT SELECT ON public.v_product_stock_summary TO authenticated;
