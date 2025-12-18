
-- Fix post_goods_receipt() to use correct column names for inventory_cost_layers
CREATE OR REPLACE FUNCTION public.post_goods_receipt(p_grn_id uuid)
RETURNS jsonb
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
BEGIN
  -- Check authorization
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]) THEN
    RAISE EXCEPTION 'غير مصرح لك بترحيل استلام البضاعة';
  END IF;

  -- Get GRN header
  SELECT * INTO v_grn
  FROM goods_receipts
  WHERE id = p_grn_id AND status = 'draft';

  IF v_grn.id IS NULL THEN
    RAISE EXCEPTION 'استلام البضاعة غير موجود أو مرحل مسبقاً';
  END IF;

  -- Get exchange rate
  v_exchange_rate := COALESCE(v_grn.exchange_rate, 1);

  -- Process each item
  FOR v_item IN
    SELECT gi.*, p.name as product_name
    FROM grn_items gi
    JOIN products p ON p.id = gi.item_id
    WHERE gi.grn_id = p_grn_id
  LOOP
    -- Calculate base currency cost
    v_unit_cost_bc := COALESCE(v_item.unit_cost, 0) * v_exchange_rate;

    -- Create FIFO cost layer with CORRECT column names
    INSERT INTO inventory_cost_layers (
      product_id,
      warehouse_id,
      source_document_type,  -- Fixed: was reference_type
      source_document_id,    -- Fixed: was reference_id
      source_document_number,
      quantity_original,     -- Fixed: was quantity
      quantity_remaining,    -- Fixed: was remaining_quantity
      unit_cost,
      currency_code,
      unit_cost_fc,
      exchange_rate_at_receipt,
      batch_number,
      expiry_date,
      received_date,
      created_at,
      created_by
    ) VALUES (
      v_item.item_id,
      v_grn.warehouse_id,
      'goods_receipt',
      p_grn_id,
      v_grn.grn_number,
      v_item.qty_received,
      v_item.qty_received,
      v_unit_cost_bc,
      COALESCE(v_grn.currency_code, 'YER'),
      v_item.unit_cost,
      v_exchange_rate,
      v_item.lot_no,
      v_item.expiry_date,
      CURRENT_DATE,
      NOW(),
      auth.uid()
    ) RETURNING id INTO v_layer_id;

    -- Update warehouse stock
    INSERT INTO warehouse_stock (warehouse_id, item_id, qty_on_hand, qty_reserved, qty_inbound, qty_outbound, last_updated)
    VALUES (v_grn.warehouse_id, v_item.item_id, v_item.qty_received, 0, 0, 0, NOW())
    ON CONFLICT (warehouse_id, item_id)
    DO UPDATE SET
      qty_on_hand = warehouse_stock.qty_on_hand + v_item.qty_received,
      last_updated = NOW();

    -- Record stock movement
    INSERT INTO stock_ledger (
      item_id,
      product_id,
      warehouse_id,
      transaction_type,
      reference_type,
      reference_id,
      qty_in,
      qty_out,
      quantity_change,
      unit_cost,
      notes,
      created_by,
      created_at,
      timestamp
    ) VALUES (
      v_item.item_id,
      v_item.item_id,
      v_grn.warehouse_id,
      'in',
      'goods_receipt',
      p_grn_id,
      v_item.qty_received,
      0,
      v_item.qty_received,
      v_unit_cost_bc,
      'استلام بضاعة: ' || v_grn.grn_number || ' - ' || v_item.product_name,
      auth.uid(),
      NOW(),
      NOW()
    );
  END LOOP;

  -- Update GRN status
  UPDATE goods_receipts
  SET
    status = 'posted',
    posted_by = auth.uid(),
    posted_at = NOW()
  WHERE id = p_grn_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'grn_id', p_grn_id,
    'grn_number', v_grn.grn_number,
    'message', 'تم ترحيل استلام البضاعة وتحديث المخزون بنجاح'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في ترحيل استلام البضاعة: %', SQLERRM;
END;
$$;
