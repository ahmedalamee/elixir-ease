-- Add unique constraint to warehouse_stock if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'warehouse_stock_warehouse_item_uom_unique'
  ) THEN
    ALTER TABLE warehouse_stock 
    ADD CONSTRAINT warehouse_stock_warehouse_item_uom_unique 
    UNIQUE (warehouse_id, item_id, uom_id);
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_po_item_id ON grn_items(po_item_id);
CREATE INDEX IF NOT EXISTS idx_pi_items_pi_id ON pi_items(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_items_grn_item_id ON pi_items(grn_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_warehouse_item ON stock_ledger(warehouse_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_ref ON stock_ledger(ref_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry ON product_batches(expiry_date);

-- Update post_goods_receipt to use product_batches correctly
DROP FUNCTION IF EXISTS post_goods_receipt(UUID);

CREATE OR REPLACE FUNCTION post_goods_receipt(p_grn_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_grn RECORD;
  v_item RECORD;
  v_batch_id UUID;
  v_result JSON;
BEGIN
  -- Get GRN details
  SELECT * INTO v_grn FROM goods_receipts WHERE id = p_grn_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GRN not found';
  END IF;
  
  IF v_grn.status = 'posted' THEN
    RAISE EXCEPTION 'GRN already posted';
  END IF;
  
  -- Update GRN status
  UPDATE goods_receipts 
  SET status = 'posted',
      posted_at = now(),
      posted_by = auth.uid()
  WHERE id = p_grn_id;
  
  -- Process each GRN item
  FOR v_item IN 
    SELECT gi.*, p.name as product_name
    FROM grn_items gi
    JOIN products p ON p.id = gi.item_id
    WHERE gi.grn_id = p_grn_id
  LOOP
    -- Create batch in product_batches
    INSERT INTO product_batches (
      product_id,
      batch_number,
      expiry_date,
      quantity,
      cost_price,
      created_at
    ) VALUES (
      v_item.item_id,
      v_item.lot_no,
      v_item.expiry_date,
      v_item.qty_received,
      v_item.unit_cost,
      now()
    ) RETURNING id INTO v_batch_id;
    
    -- Update warehouse stock
    INSERT INTO warehouse_stock (
      warehouse_id,
      item_id,
      uom_id,
      qty_on_hand,
      qty_reserved,
      qty_inbound,
      qty_outbound,
      last_updated
    ) VALUES (
      v_grn.warehouse_id,
      v_item.item_id,
      v_item.uom_id,
      v_item.qty_received,
      0,
      0,
      0,
      now()
    )
    ON CONFLICT (warehouse_id, item_id, uom_id) 
    DO UPDATE SET
      qty_on_hand = warehouse_stock.qty_on_hand + v_item.qty_received,
      last_updated = now();
    
    -- Create stock ledger entry
    INSERT INTO stock_ledger (
      warehouse_id,
      item_id,
      batch_id,
      ref_type,
      ref_id,
      qty_in,
      qty_out,
      unit_cost,
      created_by,
      created_at,
      note
    ) VALUES (
      v_grn.warehouse_id,
      v_item.item_id,
      v_batch_id,
      'grn',
      p_grn_id,
      v_item.qty_received,
      0,
      v_item.unit_cost,
      auth.uid(),
      now(),
      'Goods Receipt: ' || v_grn.grn_number
    );
    
    -- Update PO item received quantity
    IF v_item.po_item_id IS NOT NULL THEN
      UPDATE po_items
      SET qty_received = qty_received + v_item.qty_received
      WHERE id = v_item.po_item_id;
    END IF;
  END LOOP;
  
  -- Update PO status if all items received
  IF v_grn.po_id IS NOT NULL THEN
    UPDATE purchase_orders po
    SET status = CASE 
      WHEN (SELECT SUM(qty_ordered) FROM po_items WHERE po_id = po.id) = 
           (SELECT SUM(qty_received) FROM po_items WHERE po_id = po.id)
      THEN 'completed'
      ELSE 'partial'
    END
    WHERE po.id = v_grn.po_id;
  END IF;
  
  v_result := json_build_object(
    'success', true,
    'grn_id', p_grn_id,
    'message', 'GRN posted successfully and inventory updated'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error posting GRN: %', SQLERRM;
END;
$$;