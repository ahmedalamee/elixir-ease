-- Fix security definer view issue by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.stock_alerts;

CREATE OR REPLACE VIEW public.stock_alerts
WITH (security_invoker = true)
AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku,
  w.id as warehouse_id,
  w.name as warehouse_name,
  rr.min_qty,
  rr.reorder_point,
  rr.reorder_qty,
  COALESCE(p.quantity, 0) as current_quantity,
  CASE 
    WHEN COALESCE(p.quantity, 0) <= rr.min_qty THEN 'critical'
    WHEN COALESCE(p.quantity, 0) <= rr.reorder_point THEN 'low'
    ELSE 'ok'
  END as alert_level
FROM public.products p
LEFT JOIN public.reorder_rules rr ON rr.item_id = p.id
LEFT JOIN public.warehouses w ON w.id = rr.warehouse_id
WHERE rr.is_active = true
  AND (COALESCE(p.quantity, 0) <= rr.reorder_point OR COALESCE(p.quantity, 0) <= rr.min_qty);