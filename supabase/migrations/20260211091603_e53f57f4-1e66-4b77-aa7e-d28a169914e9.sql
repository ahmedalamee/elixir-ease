
-- Create convert_free_stock_to_regular function
CREATE OR REPLACE FUNCTION public.convert_free_stock_to_regular(
  p_product_id UUID,
  p_warehouse_id UUID,
  p_quantity NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_free NUMERIC;
  v_current_qty NUMERIC;
  v_stock_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول لتنفيذ هذه العملية';
  END IF;

  -- Check role (inventory_manager or admin only)
  IF NOT (has_role(v_user_id, 'admin') OR has_role(v_user_id, 'inventory_manager')) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية تحويل المخزون المجاني. مطلوب: مدير المخزون أو مسؤول';
  END IF;

  -- Validate quantity
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'الكمية يجب أن تكون أكبر من صفر';
  END IF;

  -- Get current stock levels
  SELECT id, free_quantity, qty_on_hand
  INTO v_stock_id, v_current_free, v_current_qty
  FROM warehouse_stock
  WHERE item_id = p_product_id AND warehouse_id = p_warehouse_id
  FOR UPDATE;

  IF v_stock_id IS NULL THEN
    RAISE EXCEPTION 'لا يوجد سجل مخزون لهذا المنتج في هذا المستودع';
  END IF;

  IF v_current_free < p_quantity THEN
    RAISE EXCEPTION 'الكمية المجانية المتاحة (%) غير كافية للتحويل المطلوب (%)', v_current_free, p_quantity;
  END IF;

  -- Perform the conversion using the allowed function context
  -- The trigger allows changes from convert_free_stock
  UPDATE warehouse_stock
  SET free_quantity = free_quantity - p_quantity,
      qty_on_hand = qty_on_hand + p_quantity
  WHERE id = v_stock_id;

  -- Log in free_stock_audit_log
  INSERT INTO free_stock_audit_log (
    id, warehouse_id, item_id, operation,
    quantity_change, quantity_before, quantity_after,
    source_document_type, notes, created_by
  ) VALUES (
    gen_random_uuid(), p_warehouse_id, p_product_id, 'convert',
    -p_quantity, v_current_free, v_current_free - p_quantity,
    'free_stock_conversion', COALESCE(p_notes, 'تحويل مخزون مجاني إلى مخزون عادي'),
    v_user_id
  );

  -- Log in stock_ledger
  INSERT INTO stock_ledger (
    id, item_id, product_id, warehouse_id,
    movement_type, qty_in, qty_out,
    reference_type, notes, created_by
  ) VALUES (
    gen_random_uuid(), p_product_id, p_product_id, p_warehouse_id,
    'free_conversion', p_quantity, 0,
    'free_stock_conversion', COALESCE(p_notes, 'تحويل مخزون مجاني إلى عادي'),
    v_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تحويل الكمية المجانية بنجاح',
    'converted_quantity', p_quantity,
    'new_free_quantity', v_current_free - p_quantity,
    'new_qty_on_hand', v_current_qty + p_quantity
  );
END;
$$;
