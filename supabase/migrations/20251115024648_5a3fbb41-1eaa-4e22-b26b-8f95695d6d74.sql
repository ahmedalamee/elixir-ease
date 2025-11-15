
-- Make item_id and uom_id required in po_items table
ALTER TABLE public.po_items
  ALTER COLUMN item_id SET NOT NULL,
  ALTER COLUMN uom_id SET NOT NULL;

-- Add constraint to ensure valid items
ALTER TABLE public.po_items
  ADD CONSTRAINT po_items_item_id_check CHECK (item_id IS NOT NULL),
  ADD CONSTRAINT po_items_uom_id_check CHECK (uom_id IS NOT NULL);

-- Add validation for qty_ordered to be greater than 0
ALTER TABLE public.po_items
  ADD CONSTRAINT po_items_qty_ordered_check CHECK (qty_ordered > 0);

-- Add validation for price to be >= 0
ALTER TABLE public.po_items
  ADD CONSTRAINT po_items_price_check CHECK (price >= 0);

COMMENT ON COLUMN public.po_items.item_id IS 'Required: Product/Item reference';
COMMENT ON COLUMN public.po_items.uom_id IS 'Required: Unit of measure reference';
