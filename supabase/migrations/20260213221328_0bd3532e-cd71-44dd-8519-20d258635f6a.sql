
-- Update post_free_sample to use qty column (single quantity = free quantity)
CREATE OR REPLACE FUNCTION public.post_free_sample(p_sample_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sample RECORD;
  v_item RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF NOT (has_role(v_user_id, 'admin') OR has_role(v_user_id, 'inventory_manager')) THEN
    RAISE EXCEPTION 'غير مصرح: يجب أن يكون لديك صلاحية مدير المخزون أو المسؤول';
  END IF;

  SELECT * INTO v_sample FROM free_samples WHERE id = p_sample_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على العينة المجانية';
  END IF;
  IF v_sample.status != 'draft' THEN
    RAISE EXCEPTION 'لا يمكن ترحيل عينة بحالة: %', v_sample.status;
  END IF;

  -- Use qty as the free quantity (single column approach)
  FOR v_item IN SELECT * FROM free_sample_items WHERE free_sample_id = p_sample_id AND qty > 0
  LOOP
    INSERT INTO warehouse_stock (warehouse_id, item_id, qty_on_hand, free_quantity, reserved_quantity)
    VALUES (v_sample.warehouse_id, v_item.product_id, 0, v_item.qty, 0)
    ON CONFLICT (warehouse_id, item_id) DO UPDATE SET
      free_quantity = warehouse_stock.free_quantity + v_item.qty,
      updated_at = now();

    INSERT INTO free_stock_audit_log (product_id, warehouse_id, quantity, operation_type, reference_id, reference_type, performed_by, notes)
    VALUES (v_item.product_id, v_sample.warehouse_id, v_item.qty, 'free_purchase', p_sample_id, 'free_sample', v_user_id, 'ترحيل عينة مجانية: ' || v_sample.sample_number);

    INSERT INTO stock_ledger (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
    VALUES (v_item.product_id, v_sample.warehouse_id, 'free_purchase', v_item.qty, 'free_sample', p_sample_id, 'عينة مجانية: ' || v_sample.sample_number, v_user_id);
  END LOOP;

  UPDATE free_samples SET status = 'posted', posted_by = v_user_id, posted_at = now() WHERE id = p_sample_id;

  RETURN jsonb_build_object('success', true, 'message', 'تم ترحيل العينة المجانية بنجاح');
END;
$$;

-- Create reverse/delete function for posted samples
CREATE OR REPLACE FUNCTION public.reverse_free_sample(p_sample_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sample RECORD;
  v_item RECORD;
  v_user_id UUID;
  v_current_free NUMERIC;
BEGIN
  v_user_id := auth.uid();
  
  IF NOT (has_role(v_user_id, 'admin') OR has_role(v_user_id, 'inventory_manager')) THEN
    RAISE EXCEPTION 'غير مصرح: يجب أن يكون لديك صلاحية مدير المخزون أو المسؤول';
  END IF;

  SELECT * INTO v_sample FROM free_samples WHERE id = p_sample_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على العينة المجانية';
  END IF;
  IF v_sample.status != 'posted' THEN
    RAISE EXCEPTION 'لا يمكن عكس عينة غير مرحّلة';
  END IF;

  FOR v_item IN SELECT * FROM free_sample_items WHERE free_sample_id = p_sample_id AND qty > 0
  LOOP
    -- Check current free_quantity
    SELECT free_quantity INTO v_current_free FROM warehouse_stock 
    WHERE warehouse_id = v_sample.warehouse_id AND item_id = v_item.product_id;

    IF v_current_free IS NULL OR v_current_free < v_item.qty THEN
      RAISE EXCEPTION 'لا يمكن عكس العينة: الكمية المجانية الحالية (%) أقل من كمية العينة (%)', COALESCE(v_current_free, 0), v_item.qty;
    END IF;

    UPDATE warehouse_stock 
    SET free_quantity = free_quantity - v_item.qty, updated_at = now()
    WHERE warehouse_id = v_sample.warehouse_id AND item_id = v_item.product_id;

    INSERT INTO free_stock_audit_log (product_id, warehouse_id, quantity, operation_type, reference_id, reference_type, performed_by, notes)
    VALUES (v_item.product_id, v_sample.warehouse_id, -v_item.qty, 'free_reversal', p_sample_id, 'free_sample', v_user_id, 'عكس عينة مجانية: ' || v_sample.sample_number);

    INSERT INTO stock_ledger (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
    VALUES (v_item.product_id, v_sample.warehouse_id, 'free_reversal', -v_item.qty, 'free_sample', p_sample_id, 'عكس عينة مجانية: ' || v_sample.sample_number, v_user_id);
  END LOOP;

  UPDATE free_samples SET status = 'cancelled', updated_at = now() WHERE id = p_sample_id;

  RETURN jsonb_build_object('success', true, 'message', 'تم عكس العينة المجانية بنجاح');
END;
$$;
