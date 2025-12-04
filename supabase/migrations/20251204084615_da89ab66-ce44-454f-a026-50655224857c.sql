
-- =====================================================
-- Phase 6: FIFO Costing Engine
-- =====================================================

-- 1. Create inventory_cost_layers table for FIFO tracking
CREATE TABLE IF NOT EXISTS public.inventory_cost_layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    batch_number TEXT,
    unit_cost DECIMAL(18, 4) NOT NULL DEFAULT 0,
    quantity_original DECIMAL(18, 4) NOT NULL DEFAULT 0,
    quantity_remaining DECIMAL(18, 4) NOT NULL DEFAULT 0,
    source_document_type TEXT NOT NULL, -- 'purchase_invoice', 'grn', 'opening_balance', 'adjustment'
    source_document_id UUID,
    source_document_number TEXT,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT chk_quantity_remaining CHECK (quantity_remaining >= 0),
    CONSTRAINT chk_quantity_original CHECK (quantity_original > 0),
    CONSTRAINT chk_unit_cost CHECK (unit_cost >= 0)
);

-- 2. Create indexes for FIFO queries (order by received_date ASC)
CREATE INDEX idx_cost_layers_fifo ON public.inventory_cost_layers(product_id, warehouse_id, received_date ASC) 
WHERE quantity_remaining > 0;

CREATE INDEX idx_cost_layers_product ON public.inventory_cost_layers(product_id);
CREATE INDEX idx_cost_layers_warehouse ON public.inventory_cost_layers(warehouse_id);
CREATE INDEX idx_cost_layers_source ON public.inventory_cost_layers(source_document_type, source_document_id);

-- 3. Enable RLS
ALTER TABLE public.inventory_cost_layers ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Staff can view cost layers" ON public.inventory_cost_layers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'pharmacist', 'inventory_manager')
        )
    );

CREATE POLICY "Staff can insert cost layers" ON public.inventory_cost_layers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'pharmacist', 'inventory_manager')
        )
    );

CREATE POLICY "Staff can update cost layers" ON public.inventory_cost_layers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'inventory_manager')
        )
    );

-- 5. Create FIFO cost allocation function
CREATE OR REPLACE FUNCTION public.allocate_fifo_cost(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_quantity DECIMAL(18, 4)
)
RETURNS TABLE (
    layer_id UUID,
    quantity_allocated DECIMAL(18, 4),
    unit_cost DECIMAL(18, 4),
    total_cost DECIMAL(18, 4),
    batch_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_remaining DECIMAL(18, 4) := p_quantity;
    v_layer RECORD;
BEGIN
    -- Loop through cost layers in FIFO order (oldest first)
    FOR v_layer IN 
        SELECT 
            icl.id,
            icl.quantity_remaining,
            icl.unit_cost,
            icl.batch_number
        FROM inventory_cost_layers icl
        WHERE icl.product_id = p_product_id
          AND icl.warehouse_id = p_warehouse_id
          AND icl.quantity_remaining > 0
        ORDER BY icl.received_date ASC, icl.created_at ASC
    LOOP
        EXIT WHEN v_remaining <= 0;
        
        -- Calculate how much to take from this layer
        IF v_layer.quantity_remaining >= v_remaining THEN
            -- This layer has enough
            layer_id := v_layer.id;
            quantity_allocated := v_remaining;
            unit_cost := v_layer.unit_cost;
            total_cost := v_remaining * v_layer.unit_cost;
            batch_number := v_layer.batch_number;
            v_remaining := 0;
            RETURN NEXT;
        ELSE
            -- Take all from this layer and continue
            layer_id := v_layer.id;
            quantity_allocated := v_layer.quantity_remaining;
            unit_cost := v_layer.unit_cost;
            total_cost := v_layer.quantity_remaining * v_layer.unit_cost;
            batch_number := v_layer.batch_number;
            v_remaining := v_remaining - v_layer.quantity_remaining;
            RETURN NEXT;
        END IF;
    END LOOP;
    
    -- If we still have remaining quantity, there's insufficient stock
    IF v_remaining > 0 THEN
        RAISE EXCEPTION 'Insufficient stock for product % in warehouse %. Short by % units', 
            p_product_id, p_warehouse_id, v_remaining;
    END IF;
END;
$$;

-- 6. Create function to consume FIFO layers (actually deduct)
CREATE OR REPLACE FUNCTION public.consume_fifo_layers(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_quantity DECIMAL(18, 4),
    p_reference_type TEXT,
    p_reference_id UUID
)
RETURNS DECIMAL(18, 4) -- Returns total COGS
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_cogs DECIMAL(18, 4) := 0;
    v_allocation RECORD;
BEGIN
    -- Get FIFO allocation
    FOR v_allocation IN 
        SELECT * FROM allocate_fifo_cost(p_product_id, p_warehouse_id, p_quantity)
    LOOP
        -- Deduct from the layer
        UPDATE inventory_cost_layers
        SET quantity_remaining = quantity_remaining - v_allocation.quantity_allocated
        WHERE id = v_allocation.layer_id;
        
        -- Accumulate COGS
        v_total_cogs := v_total_cogs + v_allocation.total_cost;
        
        -- Log the consumption in stock_ledger
        INSERT INTO stock_ledger (
            item_id,
            product_id,
            warehouse_id,
            transaction_type,
            reference_type,
            reference_id,
            qty_out,
            unit_cost,
            total_cost,
            batch_number,
            transaction_date
        ) VALUES (
            p_product_id,
            p_product_id,
            p_warehouse_id,
            'sale',
            p_reference_type,
            p_reference_id,
            v_allocation.quantity_allocated,
            v_allocation.unit_cost,
            v_allocation.total_cost,
            v_allocation.batch_number,
            CURRENT_DATE
        );
    END LOOP;
    
    RETURN v_total_cogs;
END;
$$;

-- 7. Create function to add cost layer (on purchase/GRN)
CREATE OR REPLACE FUNCTION public.add_cost_layer(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_quantity DECIMAL(18, 4),
    p_unit_cost DECIMAL(18, 4),
    p_batch_number TEXT DEFAULT NULL,
    p_source_type TEXT DEFAULT 'purchase_invoice',
    p_source_id UUID DEFAULT NULL,
    p_source_number TEXT DEFAULT NULL,
    p_expiry_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_layer_id UUID;
BEGIN
    INSERT INTO inventory_cost_layers (
        product_id,
        warehouse_id,
        batch_number,
        unit_cost,
        quantity_original,
        quantity_remaining,
        source_document_type,
        source_document_id,
        source_document_number,
        expiry_date,
        created_by
    ) VALUES (
        p_product_id,
        p_warehouse_id,
        p_batch_number,
        p_unit_cost,
        p_quantity,
        p_quantity,
        p_source_type,
        p_source_id,
        p_source_number,
        p_expiry_date,
        auth.uid()
    )
    RETURNING id INTO v_layer_id;
    
    -- Log in stock_ledger
    INSERT INTO stock_ledger (
        item_id,
        product_id,
        warehouse_id,
        transaction_type,
        reference_type,
        reference_id,
        qty_in,
        unit_cost,
        total_cost,
        batch_number,
        transaction_date
    ) VALUES (
        p_product_id,
        p_product_id,
        p_warehouse_id,
        'purchase',
        p_source_type,
        p_source_id,
        p_quantity,
        p_unit_cost,
        p_quantity * p_unit_cost,
        p_batch_number,
        CURRENT_DATE
    );
    
    RETURN v_layer_id;
END;
$$;

-- 8. Create function to get current inventory valuation
CREATE OR REPLACE FUNCTION public.get_inventory_valuation(
    p_warehouse_id UUID DEFAULT NULL
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    warehouse_id UUID,
    warehouse_name TEXT,
    total_quantity DECIMAL(18, 4),
    total_value DECIMAL(18, 4),
    average_cost DECIMAL(18, 4),
    layer_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        icl.product_id,
        p.name::TEXT AS product_name,
        icl.warehouse_id,
        w.name::TEXT AS warehouse_name,
        SUM(icl.quantity_remaining) AS total_quantity,
        SUM(icl.quantity_remaining * icl.unit_cost) AS total_value,
        CASE 
            WHEN SUM(icl.quantity_remaining) > 0 
            THEN SUM(icl.quantity_remaining * icl.unit_cost) / SUM(icl.quantity_remaining)
            ELSE 0
        END AS average_cost,
        COUNT(*)::BIGINT AS layer_count
    FROM inventory_cost_layers icl
    JOIN products p ON p.id = icl.product_id
    JOIN warehouses w ON w.id = icl.warehouse_id
    WHERE icl.quantity_remaining > 0
      AND (p_warehouse_id IS NULL OR icl.warehouse_id = p_warehouse_id)
    GROUP BY icl.product_id, p.name, icl.warehouse_id, w.name;
END;
$$;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.allocate_fifo_cost TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_fifo_layers TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_cost_layer TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_valuation TO authenticated;
