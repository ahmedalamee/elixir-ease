
-- 1. Add free_qty to po_items
ALTER TABLE public.po_items 
ADD COLUMN IF NOT EXISTS free_qty NUMERIC NOT NULL DEFAULT 0;

-- Add check constraint
ALTER TABLE public.po_items 
ADD CONSTRAINT chk_po_items_free_qty_non_negative CHECK (free_qty >= 0);

-- 2. Add free_qty to grn_items
ALTER TABLE public.grn_items 
ADD COLUMN IF NOT EXISTS free_qty NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.grn_items 
ADD CONSTRAINT chk_grn_items_free_qty_non_negative CHECK (free_qty >= 0);

-- 3. Update post_goods_receipt to handle free_qty from grn_items
CREATE OR REPLACE FUNCTION public.post_goods_receipt(p_grn_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grn RECORD;
  v_item RECORD;
  v_result JSONB;
  v_layer_id UUID;
  v_exchange_rate NUMERIC;
  v_unit_cost_bc NUMERIC;
  v_layers_created INT := 0;
  v_free_qty_total NUMERIC := 0;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]) THEN
    RAISE EXCEPTION 'غير مصرح لك بترحيل استلام البضاعة';
  END IF;

  SELECT * INTO v_grn FROM goods_receipts WHERE id = p_grn_id;

  IF v_grn.id IS NULL THEN
    RAISE EXCEPTION 'استلام البضاعة غير موجود';
  END IF;
  
  IF v_grn.status = 'posted' AND EXISTS (SELECT 1 FROM inventory_cost_layers WHERE source_document_id = p_grn_id) THEN
    RETURN jsonb_build_object('success', true, 'grn_id', p_grn_id, 'grn_number', v_grn.grn_number, 'message', 'مرحل مسبقاً');
  END IF;

  v_exchange_rate := COALESCE(v_grn.exchange_rate, 1);

  FOR v_item IN
    SELECT gi.*, p.name as product_name
    FROM grn_items gi JOIN products p ON p.id = gi.item_id
    WHERE gi.grn_id = p_grn_id
  LOOP
    IF EXISTS (SELECT 1 FROM inventory_cost_layers WHERE source_document_id = p_grn_id AND product_id = v_item.item_id AND batch_number = v_item.lot_no) THEN
      CONTINUE;
    END IF;
    
    v_unit_cost_bc := COALESCE(v_item.unit_cost, 0) * v_exchange_rate;

    -- Create FIFO layer for PAID quantity only (not free)
    IF v_item.qty_received > 0 THEN
      INSERT INTO inventory_cost_layers (
        product_id, warehouse_id, source_document_type, source_document_id, source_document_number,
        quantity_original, quantity_remaining, unit_cost, currency_code, unit_cost_fc,
        exchange_rate_at_receipt, batch_number, expiry_date, received_date, created_at, created_by
      ) VALUES (
        v_item.item_id, v_grn.warehouse_id, 'goods_receipt', p_grn_id, v_grn.grn_number,
        v_item.qty_received, v_item.qty_received, v_unit_cost_bc, COALESCE(v_grn.currency_code, 'YER'),
        v_item.unit_cost, v_exchange_rate, v_item.lot_no, v_item.expiry_date,
        COALESCE(v_grn.received_at::date, CURRENT_DATE), NOW(), auth.uid()
      ) RETURNING id INTO v_layer_id;
      
      v_layers_created := v_layers_created + 1;
    END IF;

    -- Update warehouse_stock: qty_on_hand for paid, free_quantity for bonus
    INSERT INTO warehouse_stock (warehouse_id, item_id, qty_on_hand, free_quantity, qty_reserved, qty_inbound, qty_outbound, last_updated)
    VALUES (v_grn.warehouse_id, v_item.item_id, v_item.qty_received, COALESCE(v_item.free_qty, 0), 0, 0, 0, NOW())
    ON CONFLICT (warehouse_id, item_id) DO UPDATE SET
      qty_on_hand = warehouse_stock.qty_on_hand + v_item.qty_received,
      free_quantity = warehouse_stock.free_quantity + COALESCE(v_item.free_qty, 0),
      last_updated = NOW();

    -- Stock ledger for paid quantity
    IF NOT EXISTS (SELECT 1 FROM stock_ledger WHERE reference_id = p_grn_id AND product_id = v_item.item_id AND reference_type = 'goods_receipt') THEN
      INSERT INTO stock_ledger (
        item_id, product_id, warehouse_id, transaction_type, reference_type, reference_id,
        qty_in, qty_out, quantity_change, unit_cost, batch_number, expiry_date, notes, created_by, created_at, timestamp
      ) VALUES (
        v_item.item_id, v_item.item_id, v_grn.warehouse_id, 'in', 'goods_receipt', p_grn_id,
        v_item.qty_received, 0, v_item.qty_received, v_unit_cost_bc, v_item.lot_no, v_item.expiry_date,
        'استلام بضاعة: ' || v_grn.grn_number || ' - ' || v_item.product_name, auth.uid(), NOW(), NOW()
      );
    END IF;

    -- Stock ledger + audit for FREE quantity
    IF COALESCE(v_item.free_qty, 0) > 0 THEN
      v_free_qty_total := v_free_qty_total + v_item.free_qty;

      -- Free stock audit log
      INSERT INTO free_stock_audit_log (
        id, warehouse_id, item_id, operation, quantity_change,
        quantity_before, quantity_after,
        source_document_type, source_document_id, source_document_number,
        notes, created_at, created_by
      ) VALUES (
        gen_random_uuid(), v_grn.warehouse_id, v_item.item_id, 'add', v_item.free_qty,
        COALESCE((SELECT free_quantity FROM warehouse_stock WHERE warehouse_id = v_grn.warehouse_id AND item_id = v_item.item_id), 0) - v_item.free_qty,
        COALESCE((SELECT free_quantity FROM warehouse_stock WHERE warehouse_id = v_grn.warehouse_id AND item_id = v_item.item_id), 0),
        'goods_receipt', p_grn_id, v_grn.grn_number,
        'كمية مجانية من استلام بضاعة: ' || v_grn.grn_number || ' - ' || v_item.product_name,
        NOW(), auth.uid()
      );

      -- Stock ledger entry for free purchase
      INSERT INTO stock_ledger (
        item_id, product_id, warehouse_id, transaction_type, reference_type, reference_id,
        qty_in, qty_out, quantity_change, unit_cost, batch_number, expiry_date, notes, created_by, created_at, timestamp
      ) VALUES (
        v_item.item_id, v_item.item_id, v_grn.warehouse_id, 'in', 'free_purchase', p_grn_id,
        v_item.free_qty, 0, v_item.free_qty, 0, v_item.lot_no, v_item.expiry_date,
        'كمية مجانية: ' || v_grn.grn_number || ' - ' || v_item.product_name, auth.uid(), NOW(), NOW()
      );
    END IF;
  END LOOP;

  UPDATE goods_receipts SET status = 'posted', posted_by = COALESCE(posted_by, auth.uid()), posted_at = COALESCE(posted_at, NOW()) WHERE id = p_grn_id;

  RETURN jsonb_build_object(
    'success', true, 
    'grn_id', p_grn_id, 
    'grn_number', v_grn.grn_number, 
    'layers_created', v_layers_created,
    'free_qty_total', v_free_qty_total,
    'message', 'تم ترحيل استلام البضاعة بنجاح'
  );
EXCEPTION
  WHEN OTHERS THEN RAISE EXCEPTION 'خطأ في الترحيل: %', SQLERRM;
END;
$$;
