-- ============================================================================
-- Sprint 1: Stabilization & Bug Fixes
-- إصلاح تدفق PO → GRN → Invoice وتحسين دعم العملات المتعددة
-- ============================================================================

-- 1. تحديث قيد حالة goods_receipts لإضافة حالة 'received'
ALTER TABLE goods_receipts DROP CONSTRAINT IF EXISTS goods_receipts_status_check;
ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_status_check 
  CHECK (status IN ('draft', 'received', 'posted', 'cancelled'));

-- 2. إضافة حقول العملة إلى goods_receipts إذا لم تكن موجودة
ALTER TABLE goods_receipts 
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10) DEFAULT 'YER',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_amount_fc NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount_bc NUMERIC DEFAULT 0;

-- 3. إضافة حقول التكلفة بالعملتين إلى grn_items
ALTER TABLE grn_items
  ADD COLUMN IF NOT EXISTS unit_cost_fc NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost_bc NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total_fc NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total_bc NUMERIC DEFAULT 0;

-- 4. حذف الدالة القديمة وإعادة إنشائها بنوع إرجاع jsonb
DROP FUNCTION IF EXISTS public.post_goods_receipt(uuid);

CREATE OR REPLACE FUNCTION public.post_goods_receipt(p_grn_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_grn RECORD;
  v_item RECORD;
  v_batch_id UUID;
  v_total_ordered NUMERIC;
  v_total_received NUMERIC;
  v_result JSONB;
BEGIN
  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'inventory_manager']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات الترحيل';
  END IF;

  -- Get GRN details with supplier currency
  SELECT gr.*, s.currency_code as supplier_currency
  INTO v_grn 
  FROM goods_receipts gr
  LEFT JOIN suppliers s ON s.id = gr.supplier_id
  WHERE gr.id = p_grn_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'استلام البضاعة غير موجود';
  END IF;
  
  IF v_grn.status = 'posted' THEN
    RAISE EXCEPTION 'تم ترحيل استلام البضاعة مسبقاً';
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
    -- Calculate BC cost if not set
    IF v_item.unit_cost_bc IS NULL OR v_item.unit_cost_bc = 0 THEN
      UPDATE grn_items 
      SET unit_cost_bc = unit_cost * COALESCE(v_grn.exchange_rate, 1),
          unit_cost_fc = unit_cost,
          line_total_fc = qty_received * unit_cost,
          line_total_bc = qty_received * unit_cost * COALESCE(v_grn.exchange_rate, 1)
      WHERE id = v_item.id;
    END IF;
    
    -- Create inventory cost layer (FIFO) with BC cost
    INSERT INTO inventory_cost_layers (
      product_id,
      warehouse_id,
      batch_number,
      expiry_date,
      quantity_remaining,
      unit_cost,
      reference_type,
      reference_id,
      created_at
    ) VALUES (
      v_item.item_id,
      v_grn.warehouse_id,
      v_item.lot_no,
      v_item.expiry_date,
      v_item.qty_received,
      COALESCE(v_item.unit_cost_bc, v_item.unit_cost * COALESCE(v_grn.exchange_rate, 1)),
      'grn',
      p_grn_id,
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
      qty_on_hand = warehouse_stock.qty_on_hand + EXCLUDED.qty_on_hand,
      last_updated = now();
    
    -- Create stock ledger entry with BC cost
    INSERT INTO stock_ledger (
      warehouse_id,
      item_id,
      batch_id,
      ref_type,
      ref_id,
      qty_in,
      qty_out,
      unit_cost,
      currency,
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
      COALESCE(v_item.unit_cost_bc, v_item.unit_cost * COALESCE(v_grn.exchange_rate, 1)),
      'YER',
      auth.uid(),
      now(),
      'استلام بضاعة: ' || v_grn.grn_number
    );
    
    -- Update PO item received quantity
    IF v_item.po_item_id IS NOT NULL THEN
      UPDATE po_items
      SET qty_received = COALESCE(qty_received, 0) + v_item.qty_received
      WHERE id = v_item.po_item_id;
    END IF;
  END LOOP;
  
  -- Update PO status if linked
  IF v_grn.po_id IS NOT NULL THEN
    -- Get total ordered and received
    SELECT 
      COALESCE(SUM(qty_ordered), 0),
      COALESCE(SUM(qty_received), 0)
    INTO v_total_ordered, v_total_received
    FROM po_items 
    WHERE po_id = v_grn.po_id;
    
    -- Update PO status based on received quantities
    IF v_total_received >= v_total_ordered THEN
      UPDATE purchase_orders SET status = 'completed' WHERE id = v_grn.po_id;
    ELSIF v_total_received > 0 THEN
      UPDATE purchase_orders SET status = 'partial' WHERE id = v_grn.po_id;
    END IF;
  END IF;
  
  -- Calculate and update GRN totals
  UPDATE goods_receipts gr
  SET total_amount_fc = (
        SELECT COALESCE(SUM(gi.qty_received * gi.unit_cost), 0) 
        FROM grn_items gi WHERE gi.grn_id = gr.id
      ),
      total_amount_bc = (
        SELECT COALESCE(SUM(gi.qty_received * gi.unit_cost * COALESCE(gr.exchange_rate, 1)), 0) 
        FROM grn_items gi WHERE gi.grn_id = gr.id
      )
  WHERE gr.id = p_grn_id;
  
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
$function$;

COMMENT ON FUNCTION post_goods_receipt(uuid) IS 'ترحيل استلام بضاعة مع إنشاء طبقات تكلفة FIFO وتحديث المخزون';

-- 5. إنشاء دالة التحقق من صحة انتقال حالة PO
CREATE OR REPLACE FUNCTION validate_po_status_transition(
  p_current_status TEXT,
  p_new_status TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  RETURN CASE p_current_status
    WHEN 'draft' THEN p_new_status IN ('submitted', 'approved', 'cancelled')
    WHEN 'submitted' THEN p_new_status IN ('approved', 'cancelled')
    WHEN 'approved' THEN p_new_status IN ('partial', 'completed', 'cancelled')
    WHEN 'partial' THEN p_new_status IN ('completed', 'cancelled')
    WHEN 'completed' THEN FALSE
    WHEN 'cancelled' THEN FALSE
    ELSE FALSE
  END;
END;
$$;

-- 6. إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_grn_status ON goods_receipts(status);
CREATE INDEX IF NOT EXISTS idx_grn_po_id ON goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_pi_status ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON po_items(po_id);