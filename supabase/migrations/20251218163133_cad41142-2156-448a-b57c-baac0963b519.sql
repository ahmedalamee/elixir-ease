
-- ============================================================
-- FIFO Cost Layers Fix: Backfill + Improved post_goods_receipt
-- ============================================================

-- A) BACKFILL: Create missing cost layers for posted GRNs
DO $$
DECLARE
  v_grn RECORD;
  v_item RECORD;
  v_exchange_rate NUMERIC;
  v_unit_cost_bc NUMERIC;
  v_layers_created INT := 0;
  v_stock_entries INT := 0;
BEGIN
  RAISE NOTICE '=== Starting FIFO Backfill for Posted GRNs ===';
  
  FOR v_grn IN 
    SELECT g.*
    FROM goods_receipts g
    WHERE g.status = 'posted'
  LOOP
    RAISE NOTICE 'Processing GRN: % (ID: %)', v_grn.grn_number, v_grn.id;
    v_exchange_rate := COALESCE(v_grn.exchange_rate, 1);
    
    FOR v_item IN
      SELECT gi.*, p.name as product_name
      FROM grn_items gi
      JOIN products p ON p.id = gi.item_id
      WHERE gi.grn_id = v_grn.id
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM inventory_cost_layers
        WHERE source_document_id = v_grn.id
          AND product_id = v_item.item_id
          AND batch_number = v_item.lot_no
      ) THEN
        v_unit_cost_bc := COALESCE(v_item.unit_cost, 0) * v_exchange_rate;
        
        INSERT INTO inventory_cost_layers (
          product_id, warehouse_id, source_document_type, source_document_id,
          source_document_number, quantity_original, quantity_remaining, unit_cost,
          currency_code, unit_cost_fc, exchange_rate_at_receipt, batch_number,
          expiry_date, received_date, created_at
        ) VALUES (
          v_item.item_id, v_grn.warehouse_id, 'goods_receipt', v_grn.id,
          v_grn.grn_number, v_item.qty_received, v_item.qty_received, v_unit_cost_bc,
          COALESCE(v_grn.currency_code, 'YER'), v_item.unit_cost, v_exchange_rate,
          v_item.lot_no, v_item.expiry_date, 
          COALESCE(v_grn.received_at::date, CURRENT_DATE), NOW()
        );
        
        v_layers_created := v_layers_created + 1;
        RAISE NOTICE '  + Layer: % (Qty: %, Cost: %)', v_item.product_name, v_item.qty_received, v_unit_cost_bc;
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM stock_ledger
        WHERE reference_id = v_grn.id AND product_id = v_item.item_id AND reference_type = 'goods_receipt'
      ) THEN
        INSERT INTO stock_ledger (
          item_id, product_id, warehouse_id, transaction_type, reference_type,
          reference_id, qty_in, qty_out, quantity_change, unit_cost, batch_number,
          expiry_date, notes, created_at, timestamp
        ) VALUES (
          v_item.item_id, v_item.item_id, v_grn.warehouse_id, 'in', 'goods_receipt',
          v_grn.id, v_item.qty_received, 0, v_item.qty_received, 
          COALESCE(v_item.unit_cost, 0) * v_exchange_rate,
          v_item.lot_no, v_item.expiry_date,
          'Backfill: GRN ' || v_grn.grn_number || ' - ' || v_item.product_name,
          NOW(), NOW()
        );
        v_stock_entries := v_stock_entries + 1;
      END IF;
    END LOOP;
    
    UPDATE goods_receipts SET posted_at = COALESCE(posted_at, NOW()) WHERE id = v_grn.id AND posted_at IS NULL;
  END LOOP;
  
  RAISE NOTICE '=== Backfill Complete: % layers, % stock entries ===', v_layers_created, v_stock_entries;
END $$;

-- B) Update post_goods_receipt to be IDEMPOTENT
CREATE OR REPLACE FUNCTION public.post_goods_receipt(p_grn_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_grn RECORD;
  v_item RECORD;
  v_result JSONB;
  v_layer_id UUID;
  v_exchange_rate NUMERIC;
  v_unit_cost_bc NUMERIC;
  v_layers_created INT := 0;
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

    INSERT INTO warehouse_stock (warehouse_id, item_id, qty_on_hand, qty_reserved, qty_inbound, qty_outbound, last_updated)
    VALUES (v_grn.warehouse_id, v_item.item_id, v_item.qty_received, 0, 0, 0, NOW())
    ON CONFLICT (warehouse_id, item_id) DO UPDATE SET
      qty_on_hand = warehouse_stock.qty_on_hand + v_item.qty_received, last_updated = NOW();

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
  END LOOP;

  UPDATE goods_receipts SET status = 'posted', posted_by = COALESCE(posted_by, auth.uid()), posted_at = COALESCE(posted_at, NOW()) WHERE id = p_grn_id;

  RETURN jsonb_build_object('success', true, 'grn_id', p_grn_id, 'grn_number', v_grn.grn_number, 'layers_created', v_layers_created, 'message', 'تم ترحيل استلام البضاعة بنجاح');
EXCEPTION
  WHEN OTHERS THEN RAISE EXCEPTION 'خطأ في الترحيل: %', SQLERRM;
END;
$function$;

COMMENT ON FUNCTION post_goods_receipt IS 'Posts GRN: creates FIFO layers, updates stock. Idempotent.';
