
-- =====================================================
-- Stock Locking & Purchase Workflow Integration
-- نظام قفل المخزون وربط دورة المشتريات
-- =====================================================

-- 1. Stock Reservations Table - تتبع الكميات المحجوزة
CREATE TABLE IF NOT EXISTS public.stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    item_id UUID NOT NULL REFERENCES public.products(id),
    reference_type TEXT NOT NULL CHECK (reference_type IN ('purchase_requisition', 'purchase_order', 'sales_order')),
    reference_id UUID NOT NULL,
    reference_number TEXT,
    quantity_reserved NUMERIC NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    quantity_released NUMERIC NOT NULL DEFAULT 0 CHECK (quantity_released >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_released', 'released', 'cancelled')),
    reserved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reserved_by UUID,
    released_at TIMESTAMP WITH TIME ZONE,
    released_by UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (warehouse_id, item_id, reference_type, reference_id)
);

-- Enable RLS
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view stock reservations" 
ON public.stock_reservations FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage stock reservations" 
ON public.stock_reservations FOR ALL 
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role, 'pharmacist'::app_role]));

-- Indexes for performance
CREATE INDEX idx_stock_reservations_warehouse_item ON public.stock_reservations(warehouse_id, item_id);
CREATE INDEX idx_stock_reservations_reference ON public.stock_reservations(reference_type, reference_id);
CREATE INDEX idx_stock_reservations_status ON public.stock_reservations(status) WHERE status = 'active';

-- 2. Add tracking columns to pr_items
ALTER TABLE public.pr_items 
ADD COLUMN IF NOT EXISTS qty_ordered NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_received NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 3. Add tracking columns to po_items
ALTER TABLE public.po_items
ADD COLUMN IF NOT EXISTS pr_item_id UUID REFERENCES public.pr_items(id),
ADD COLUMN IF NOT EXISTS qty_invoiced NUMERIC DEFAULT 0;

-- 4. Add tracking columns to grn_items
ALTER TABLE public.grn_items
ADD COLUMN IF NOT EXISTS pr_item_id UUID REFERENCES public.pr_items(id),
ADD COLUMN IF NOT EXISTS qty_invoiced NUMERIC DEFAULT 0;

-- 5. Add workflow references to purchase_invoices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_invoices' AND column_name = 'pr_id') THEN
        ALTER TABLE public.purchase_invoices ADD COLUMN pr_id UUID REFERENCES public.purchase_requisitions(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_invoices' AND column_name = 'po_id') THEN
        ALTER TABLE public.purchase_invoices ADD COLUMN po_id UUID REFERENCES public.purchase_orders(id);
    END IF;
END $$;

-- =====================================================
-- Stock Locking Functions
-- =====================================================

-- Function: Lock stock for PR items
CREATE OR REPLACE FUNCTION public.lock_stock_for_pr(p_pr_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pr RECORD;
    v_item RECORD;
    v_reservation_id UUID;
    v_locked_count INT := 0;
BEGIN
    SELECT * INTO v_pr FROM purchase_requisitions WHERE id = p_pr_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'طلب الشراء غير موجود');
    END IF;
    
    FOR v_item IN SELECT * FROM pr_items WHERE pr_id = p_pr_id
    LOOP
        INSERT INTO stock_reservations (
            warehouse_id, item_id, reference_type, reference_id, reference_number,
            quantity_reserved, reserved_by
        )
        VALUES (
            v_pr.warehouse_id, v_item.product_id, 'purchase_requisition', p_pr_id, v_pr.pr_number,
            v_item.requested_qty, auth.uid()
        )
        ON CONFLICT (warehouse_id, item_id, reference_type, reference_id) 
        DO UPDATE SET 
            quantity_reserved = EXCLUDED.quantity_reserved,
            updated_at = now()
        RETURNING id INTO v_reservation_id;
        
        INSERT INTO warehouse_stock (warehouse_id, item_id, qty_inbound)
        VALUES (v_pr.warehouse_id, v_item.product_id, v_item.requested_qty)
        ON CONFLICT (warehouse_id, item_id)
        DO UPDATE SET 
            qty_inbound = warehouse_stock.qty_inbound + v_item.requested_qty,
            last_updated = now();
        
        v_locked_count := v_locked_count + 1;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'تم حجز المخزون بنجاح',
        'locked_items', v_locked_count
    );
END;
$$;

-- Function: Release stock reservation
CREATE OR REPLACE FUNCTION public.release_stock_reservation(
    p_reference_type TEXT,
    p_reference_id UUID,
    p_quantity NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reservation RECORD;
    v_released_qty NUMERIC;
BEGIN
    FOR v_reservation IN 
        SELECT * FROM stock_reservations 
        WHERE reference_type = p_reference_type 
        AND reference_id = p_reference_id 
        AND status IN ('active', 'partially_released')
    LOOP
        v_released_qty := COALESCE(p_quantity, v_reservation.quantity_reserved - v_reservation.quantity_released);
        
        UPDATE stock_reservations
        SET quantity_released = quantity_released + v_released_qty,
            status = CASE 
                WHEN (quantity_released + v_released_qty) >= quantity_reserved THEN 'released'
                ELSE 'partially_released'
            END,
            released_at = CASE 
                WHEN (quantity_released + v_released_qty) >= quantity_reserved THEN now()
                ELSE released_at
            END,
            released_by = auth.uid(),
            updated_at = now()
        WHERE id = v_reservation.id;
        
        UPDATE warehouse_stock
        SET qty_inbound = GREATEST(0, qty_inbound - v_released_qty),
            last_updated = now()
        WHERE warehouse_id = v_reservation.warehouse_id
        AND item_id = v_reservation.item_id;
    END LOOP;
    
    RETURN jsonb_build_object('success', true, 'message', 'تم تحرير الحجز بنجاح');
END;
$$;

-- Function: Get product stock summary
CREATE OR REPLACE FUNCTION public.get_product_stock_summary(p_product_id UUID)
RETURNS TABLE(
    warehouse_id UUID,
    warehouse_name TEXT,
    qty_on_hand NUMERIC,
    qty_reserved NUMERIC,
    qty_inbound NUMERIC,
    qty_available NUMERIC,
    qty_locked NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        ws.warehouse_id,
        w.name as warehouse_name,
        COALESCE(ws.qty_on_hand, 0) as qty_on_hand,
        COALESCE(ws.qty_reserved, 0) as qty_reserved,
        COALESCE(ws.qty_inbound, 0) as qty_inbound,
        COALESCE(ws.qty_on_hand, 0) - COALESCE(ws.qty_reserved, 0) as qty_available,
        COALESCE(
            (SELECT SUM(quantity_reserved - quantity_released) 
             FROM stock_reservations sr 
             WHERE sr.warehouse_id = ws.warehouse_id 
             AND sr.item_id = ws.item_id 
             AND sr.status IN ('active', 'partially_released')), 0
        ) as qty_locked
    FROM warehouse_stock ws
    JOIN warehouses w ON w.id = ws.warehouse_id
    WHERE ws.item_id = p_product_id;
$$;

-- =====================================================
-- Stock Protection Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.trg_protect_stock_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller TEXT;
BEGIN
    v_caller := current_setting('app.stock_caller', true);
    
    IF v_caller IN ('post_goods_receipt', 'post_purchase_invoice', 'post_stock_adjustment', 'post_sales_invoice', 'post_sales_return', 'post_purchase_return', 'system_init') THEN
        RETURN NEW;
    END IF;
    
    IF public.has_role(auth.uid(), 'admin') AND current_setting('app.admin_override', true) = 'true' THEN
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' AND OLD.qty_on_hand IS DISTINCT FROM NEW.qty_on_hand THEN
        IF OLD.qty_on_hand IS NOT NULL THEN
            RAISE EXCEPTION 'لا يمكن تعديل المخزون مباشرة، يرجى استخدام فاتورة الشراء أو تسوية المخزون'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_warehouse_stock ON warehouse_stock;
CREATE TRIGGER trg_protect_warehouse_stock
    BEFORE UPDATE ON warehouse_stock
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_protect_stock_updates();

-- =====================================================
-- PR Status Change Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.trg_pr_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
        PERFORM public.lock_stock_for_pr(NEW.id);
    END IF;
    
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        PERFORM public.release_stock_reservation('purchase_requisition', NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pr_status_change ON purchase_requisitions;
CREATE TRIGGER trg_pr_status_change
    AFTER UPDATE ON purchase_requisitions
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_pr_status_change();

-- =====================================================
-- GRN Quantity Validation Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.trg_validate_grn_quantities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_po_item RECORD;
    v_max_qty NUMERIC;
BEGIN
    IF NEW.po_item_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    SELECT * INTO v_po_item FROM po_items WHERE id = NEW.po_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'بند أمر الشراء غير موجود';
    END IF;
    
    v_max_qty := v_po_item.qty_ordered - COALESCE(v_po_item.qty_received, 0);
    
    IF NEW.qty_received > v_max_qty THEN
        RAISE EXCEPTION 'الكمية المستلمة (%) تتجاوز الكمية المتبقية في أمر الشراء (%)', NEW.qty_received, v_max_qty
            USING ERRCODE = 'P0002';
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_grn_quantities ON grn_items;
CREATE TRIGGER trg_validate_grn_quantities
    BEFORE INSERT OR UPDATE ON grn_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_validate_grn_quantities();

-- =====================================================
-- Enhanced post_goods_receipt with stock locking
-- =====================================================

CREATE OR REPLACE FUNCTION public.post_goods_receipt_v2(p_grn_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_grn RECORD;
    v_item RECORD;
    v_layer_id UUID;
    v_total_value NUMERIC := 0;
BEGIN
    PERFORM set_config('app.stock_caller', 'post_goods_receipt', true);
    
    SELECT * INTO v_grn FROM goods_receipts WHERE id = p_grn_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'إشعار الاستلام غير موجود');
    END IF;
    
    IF v_grn.status = 'posted' THEN
        RETURN jsonb_build_object('success', false, 'message', 'إشعار الاستلام مرحل مسبقاً');
    END IF;
    
    FOR v_item IN 
        SELECT gi.*, p.name as product_name
        FROM grn_items gi
        JOIN products p ON p.id = gi.item_id
        WHERE gi.grn_id = p_grn_id
    LOOP
        INSERT INTO warehouse_stock (warehouse_id, item_id, qty_on_hand)
        VALUES (v_grn.warehouse_id, v_item.item_id, v_item.qty_received)
        ON CONFLICT (warehouse_id, item_id)
        DO UPDATE SET 
            qty_on_hand = warehouse_stock.qty_on_hand + v_item.qty_received,
            qty_inbound = GREATEST(0, warehouse_stock.qty_inbound - v_item.qty_received),
            last_updated = now();
        
        INSERT INTO inventory_cost_layers (
            product_id, warehouse_id, batch_number,
            unit_cost, quantity_original, quantity_remaining,
            source_document_type, source_document_id, source_document_number,
            received_date, expiry_date
        )
        VALUES (
            v_item.item_id, v_grn.warehouse_id, v_item.lot_no,
            COALESCE(v_item.unit_cost_bc, v_item.unit_cost), v_item.qty_received, v_item.qty_received,
            'GRN', p_grn_id, v_grn.grn_number,
            v_grn.received_at::date, v_item.expiry_date
        )
        RETURNING id INTO v_layer_id;
        
        IF v_item.po_item_id IS NOT NULL THEN
            UPDATE po_items
            SET qty_received = COALESCE(qty_received, 0) + v_item.qty_received
            WHERE id = v_item.po_item_id;
        END IF;
        
        IF v_item.pr_item_id IS NOT NULL THEN
            UPDATE pr_items
            SET qty_received = COALESCE(qty_received, 0) + v_item.qty_received,
                status = CASE 
                    WHEN COALESCE(qty_received, 0) + v_item.qty_received >= requested_qty THEN 'received'
                    ELSE 'partially_received'
                END
            WHERE id = v_item.pr_item_id;
        END IF;
        
        IF v_grn.po_id IS NOT NULL THEN
            PERFORM public.release_stock_reservation('purchase_requisition', 
                (SELECT pr_id FROM purchase_orders WHERE id = v_grn.po_id), 
                v_item.qty_received);
        END IF;
        
        INSERT INTO stock_ledger (
            item_id, warehouse_id, reference_type, reference_id, reference_number,
            qty_in, qty_out, unit_cost, balance, transaction_date
        )
        VALUES (
            v_item.item_id, v_grn.warehouse_id, 'GRN', p_grn_id, v_grn.grn_number,
            v_item.qty_received, 0, COALESCE(v_item.unit_cost_bc, v_item.unit_cost),
            (SELECT qty_on_hand FROM warehouse_stock WHERE warehouse_id = v_grn.warehouse_id AND item_id = v_item.item_id),
            v_grn.received_at::date
        );
        
        v_total_value := v_total_value + (v_item.qty_received * COALESCE(v_item.unit_cost_bc, v_item.unit_cost));
    END LOOP;
    
    UPDATE goods_receipts
    SET status = 'posted',
        posted_by = auth.uid(),
        posted_at = now()
    WHERE id = p_grn_id;
    
    IF v_grn.po_id IS NOT NULL THEN
        UPDATE purchase_orders po
        SET status = CASE 
            WHEN NOT EXISTS (
                SELECT 1 FROM po_items pi 
                WHERE pi.po_id = po.id 
                AND COALESCE(pi.qty_received, 0) < pi.qty_ordered
            ) THEN 'received'
            ELSE 'partially_received'
        END
        WHERE id = v_grn.po_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم ترحيل إشعار الاستلام بنجاح',
        'grn_id', p_grn_id,
        'grn_number', v_grn.grn_number,
        'total_value', v_total_value
    );
END;
$$;

-- =====================================================
-- View for Product Stock Summary
-- =====================================================

CREATE OR REPLACE VIEW public.v_product_stock_summary AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.barcode,
    p.sku,
    c.name as category_name,
    s.name as supplier_name,
    s.id as supplier_id,
    COALESCE(SUM(ws.qty_on_hand), 0) as total_stock,
    COALESCE(SUM(ws.qty_reserved), 0) as reserved_stock,
    COALESCE(SUM(ws.qty_inbound), 0) as inbound_stock,
    COALESCE(SUM(ws.qty_on_hand) - SUM(ws.qty_reserved), 0) as available_stock,
    COALESCE(
        (SELECT SUM(sr.quantity_reserved - sr.quantity_released) 
         FROM stock_reservations sr 
         WHERE sr.item_id = p.id 
         AND sr.status IN ('active', 'partially_released')), 0
    ) as locked_stock,
    p.reorder_level,
    p.min_quantity,
    p.is_active
FROM products p
LEFT JOIN warehouse_stock ws ON ws.item_id = p.id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN suppliers s ON s.id = p.preferred_supplier_id
GROUP BY p.id, p.name, p.barcode, p.sku, c.name, s.name, s.id, p.reorder_level, p.min_quantity, p.is_active;

GRANT SELECT ON public.v_product_stock_summary TO authenticated;
GRANT SELECT ON public.stock_reservations TO authenticated;
