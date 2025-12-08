-- ============================================================================
-- Sprint 3 & 4: PO/PI Enhancements + GRN Pharmacy Requirements (Fixed)
-- دعم الضرائب والخصومات الاختيارية + متطلبات الصيدلية (Batch, Expiry, FIFO)
-- ============================================================================

-- 1. إضافة حقول الضريبة التفصيلية إلى po_items
ALTER TABLE po_items
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total NUMERIC DEFAULT 0;

-- 2. إضافة حقول الضريبة التفصيلية إلى pi_items
ALTER TABLE pi_items
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;

-- 3. إنشاء دالة حساب بند أمر الشراء
CREATE OR REPLACE FUNCTION calculate_po_item_amounts(
  p_qty NUMERIC,
  p_price NUMERIC,
  p_discount_pct NUMERIC DEFAULT 0,
  p_tax_rate NUMERIC DEFAULT 0,
  p_exchange_rate NUMERIC DEFAULT 1
)
RETURNS TABLE (
  net_amount NUMERIC,
  net_amount_fc NUMERIC,
  net_amount_bc NUMERIC,
  tax_amount NUMERIC,
  line_total NUMERIC
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  v_subtotal NUMERIC;
  v_discount_amount NUMERIC;
  v_net NUMERIC;
  v_tax NUMERIC;
BEGIN
  v_subtotal := p_qty * p_price;
  v_discount_amount := v_subtotal * COALESCE(p_discount_pct, 0) / 100;
  v_net := v_subtotal - v_discount_amount;
  v_tax := v_net * COALESCE(p_tax_rate, 0) / 100;
  
  RETURN QUERY SELECT 
    v_net,
    v_net,
    v_net * COALESCE(p_exchange_rate, 1),
    v_tax,
    v_net + v_tax;
END;
$$;

-- 4. إنشاء Trigger لحساب قيم بند PO تلقائياً
CREATE OR REPLACE FUNCTION calculate_po_item_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_po RECORD;
  v_subtotal NUMERIC;
  v_discount_amount NUMERIC;
  v_net NUMERIC;
  v_tax_rate NUMERIC;
  v_tax_amount NUMERIC;
BEGIN
  -- Get PO exchange rate
  SELECT exchange_rate, currency_code 
  INTO v_po 
  FROM purchase_orders 
  WHERE id = NEW.po_id;
  
  -- Calculate amounts
  v_subtotal := NEW.qty_ordered * NEW.price;
  v_discount_amount := v_subtotal * COALESCE(NEW.discount, 0) / 100;
  v_net := v_subtotal - v_discount_amount;
  
  -- Get tax rate from tax_code if provided
  IF NEW.tax_code IS NOT NULL AND NEW.tax_code <> '' THEN
    SELECT rate INTO v_tax_rate FROM taxes WHERE tax_code = NEW.tax_code;
  END IF;
  v_tax_rate := COALESCE(v_tax_rate, NEW.tax_rate, 0);
  
  v_tax_amount := v_net * v_tax_rate / 100;
  
  -- Set calculated values
  NEW.net_amount := v_net;
  NEW.price_fc := NEW.price;
  NEW.price_bc := NEW.price * COALESCE(v_po.exchange_rate, 1);
  NEW.net_amount_fc := v_net;
  NEW.net_amount_bc := v_net * COALESCE(v_po.exchange_rate, 1);
  NEW.tax_rate := v_tax_rate;
  NEW.tax_amount := v_tax_amount;
  NEW.line_total := v_net + v_tax_amount;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_po_item ON po_items;
CREATE TRIGGER trg_calculate_po_item
  BEFORE INSERT OR UPDATE ON po_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_po_item_on_change();

-- 5. إنشاء Trigger لتحديث إجماليات PO عند تغيير البنود
CREATE OR REPLACE FUNCTION update_po_totals_on_item_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_po_id UUID;
  v_subtotal NUMERIC;
  v_tax_amount NUMERIC;
  v_total NUMERIC;
BEGIN
  -- Determine which PO to update
  v_po_id := COALESCE(NEW.po_id, OLD.po_id);
  
  -- Calculate totals from all items
  SELECT 
    COALESCE(SUM(net_amount), 0),
    COALESCE(SUM(tax_amount), 0),
    COALESCE(SUM(line_total), 0)
  INTO v_subtotal, v_tax_amount, v_total
  FROM po_items
  WHERE po_id = v_po_id;
  
  -- Update PO totals
  UPDATE purchase_orders
  SET 
    subtotal = v_subtotal,
    subtotal_fc = v_subtotal,
    tax_amount = v_tax_amount,
    tax_amount_fc = v_tax_amount,
    total_amount = v_total,
    total_amount_fc = v_total
  WHERE id = v_po_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_po_totals ON po_items;
CREATE TRIGGER trg_update_po_totals
  AFTER INSERT OR UPDATE OR DELETE ON po_items
  FOR EACH ROW
  EXECUTE FUNCTION update_po_totals_on_item_change();

-- 6. تحسين جدول inventory_cost_layers لدعم FIFO الكامل
ALTER TABLE inventory_cost_layers
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10) DEFAULT 'YER',
  ADD COLUMN IF NOT EXISTS unit_cost_fc NUMERIC,
  ADD COLUMN IF NOT EXISTS exchange_rate_at_receipt NUMERIC DEFAULT 1;

-- 7. إنشاء Index مركب لتحسين أداء FIFO
CREATE INDEX IF NOT EXISTS idx_cost_layers_fifo 
  ON inventory_cost_layers(product_id, warehouse_id, created_at ASC)
  WHERE quantity_remaining > 0;

-- 8. إنشاء دالة محسنة لاستهلاك طبقات FIFO
CREATE OR REPLACE FUNCTION consume_fifo_layers_enhanced(
  p_product_id UUID,
  p_warehouse_id UUID,
  p_quantity NUMERIC,
  p_reference_type TEXT,
  p_reference_id UUID
)
RETURNS TABLE (
  total_cost NUMERIC,
  layers_consumed JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_remaining NUMERIC := p_quantity;
  v_total_cost NUMERIC := 0;
  v_layer RECORD;
  v_consume_qty NUMERIC;
  v_layers JSONB := '[]'::JSONB;
BEGIN
  -- Process FIFO layers (oldest first based on created_at)
  FOR v_layer IN 
    SELECT * FROM inventory_cost_layers
    WHERE product_id = p_product_id
      AND warehouse_id = p_warehouse_id
      AND quantity_remaining > 0
    ORDER BY created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;
    
    v_consume_qty := LEAST(v_remaining, v_layer.quantity_remaining);
    v_total_cost := v_total_cost + (v_consume_qty * v_layer.unit_cost);
    v_remaining := v_remaining - v_consume_qty;
    
    -- Update layer
    UPDATE inventory_cost_layers
    SET quantity_remaining = quantity_remaining - v_consume_qty
    WHERE id = v_layer.id;
    
    -- Track consumed layers
    v_layers := v_layers || jsonb_build_object(
      'layer_id', v_layer.id,
      'batch_number', v_layer.batch_number,
      'quantity', v_consume_qty,
      'unit_cost', v_layer.unit_cost,
      'cost', v_consume_qty * v_layer.unit_cost
    );
  END LOOP;
  
  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'المخزون غير كافٍ للمنتج. المطلوب: %, المتبقي: %', p_quantity, p_quantity - v_remaining;
  END IF;
  
  RETURN QUERY SELECT v_total_cost, v_layers;
END;
$$;

COMMENT ON FUNCTION consume_fifo_layers_enhanced IS 'استهلاك طبقات التكلفة بطريقة FIFO مع تتبع الطبقات المستهلكة';