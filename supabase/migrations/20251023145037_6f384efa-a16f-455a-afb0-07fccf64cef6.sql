-- Add bins/locations table for warehouses
CREATE TABLE IF NOT EXISTS public.warehouse_bins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
  bin_code TEXT NOT NULL,
  bin_name TEXT NOT NULL,
  aisle TEXT,
  rack TEXT,
  level TEXT,
  is_active BOOLEAN DEFAULT true,
  capacity NUMERIC,
  current_usage NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(warehouse_id, bin_code)
);

-- Enable RLS
ALTER TABLE public.warehouse_bins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for warehouse_bins
CREATE POLICY "Admin and inventory manager manage bins"
ON public.warehouse_bins FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Staff read bins"
ON public.warehouse_bins FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role, 'pharmacist'::app_role]));

-- Add trigger for updated_at
CREATE TRIGGER update_warehouse_bins_updated_at
BEFORE UPDATE ON public.warehouse_bins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add stock alerts view
CREATE OR REPLACE VIEW public.stock_alerts AS
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