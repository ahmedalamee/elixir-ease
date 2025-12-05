-- =====================================================
-- Stock Adjustments System with FIFO & GL Integration
-- نظام تسويات المخزون مع تكامل FIFO والقيود المحاسبية
-- =====================================================

-- 1. Create stock_adjustments table
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    adjustment_number TEXT NOT NULL UNIQUE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT NOT NULL CHECK (reason IN ('stock_count', 'damaged', 'expired', 'found', 'opening_balance', 'theft', 'donation', 'other')),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
    total_difference_qty NUMERIC DEFAULT 0,
    total_difference_value NUMERIC DEFAULT 0,
    journal_entry_id UUID REFERENCES gl_journal_entries(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    posted_by UUID REFERENCES auth.users(id),
    posted_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES auth.users(id),
    cancelled_at TIMESTAMPTZ
);

-- 2. Create stock_adjustment_items table
CREATE TABLE IF NOT EXISTS public.stock_adjustment_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    adjustment_id UUID NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    batch_number TEXT,
    quantity_before NUMERIC NOT NULL DEFAULT 0,
    quantity_after NUMERIC NOT NULL DEFAULT 0,
    quantity_diff NUMERIC NOT NULL DEFAULT 0,
    unit_cost NUMERIC DEFAULT 0,
    total_cost_diff NUMERIC DEFAULT 0,
    line_reason TEXT,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_warehouse_date ON stock_adjustments(warehouse_id, adjustment_date);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_status ON stock_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_stock_adjustment_items_adjustment ON stock_adjustment_items(adjustment_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustment_items_product ON stock_adjustment_items(product_id);

-- 4. Enable RLS
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for stock_adjustments
CREATE POLICY "Staff can view stock adjustments" ON stock_adjustments
    FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Inventory staff can create stock adjustments" ON stock_adjustments
    FOR INSERT WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Inventory staff can update draft adjustments" ON stock_adjustments
    FOR UPDATE USING (status = 'draft' AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Admin can delete draft adjustments" ON stock_adjustments
    FOR DELETE USING (status = 'draft' AND has_role(auth.uid(), 'admin'::app_role));

-- 6. RLS Policies for stock_adjustment_items
CREATE POLICY "Staff can view adjustment items" ON stock_adjustment_items
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM stock_adjustments sa 
        WHERE sa.id = stock_adjustment_items.adjustment_id 
        AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role, 'pharmacist'::app_role])
    ));

CREATE POLICY "Inventory staff can manage adjustment items" ON stock_adjustment_items
    FOR ALL USING (EXISTS (
        SELECT 1 FROM stock_adjustments sa 
        WHERE sa.id = stock_adjustment_items.adjustment_id 
        AND sa.status = 'draft'
        AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role])
    ));

-- 7. Create GL accounts for inventory adjustments if not exist (without parent_id)
INSERT INTO gl_accounts (id, account_code, account_name, account_name_en, account_type, is_active)
SELECT gen_random_uuid(), '5300', 'خسائر المخزون', 'Inventory Losses', 'expense', true
WHERE NOT EXISTS (SELECT 1 FROM gl_accounts WHERE account_code = '5300');

INSERT INTO gl_accounts (id, account_code, account_name, account_name_en, account_type, is_active)
SELECT gen_random_uuid(), '5310', 'خسائر تلف المخزون', 'Inventory Damage Losses', 'expense', true
WHERE NOT EXISTS (SELECT 1 FROM gl_accounts WHERE account_code = '5310');

INSERT INTO gl_accounts (id, account_code, account_name, account_name_en, account_type, is_active)
SELECT gen_random_uuid(), '5320', 'خسائر انتهاء الصلاحية', 'Expiry Losses', 'expense', true
WHERE NOT EXISTS (SELECT 1 FROM gl_accounts WHERE account_code = '5320');

INSERT INTO gl_accounts (id, account_code, account_name, account_name_en, account_type, is_active)
SELECT gen_random_uuid(), '5330', 'خسائر سرقة وعجز', 'Theft & Shortage Losses', 'expense', true
WHERE NOT EXISTS (SELECT 1 FROM gl_accounts WHERE account_code = '5330');

INSERT INTO gl_accounts (id, account_code, account_name, account_name_en, account_type, is_active)
SELECT gen_random_uuid(), '4300', 'إيرادات أخرى', 'Other Income', 'revenue', true
WHERE NOT EXISTS (SELECT 1 FROM gl_accounts WHERE account_code = '4300');

INSERT INTO gl_accounts (id, account_code, account_name, account_name_en, account_type, is_active)
SELECT gen_random_uuid(), '4310', 'أرباح تسويات المخزون', 'Inventory Adjustment Gains', 'revenue', true
WHERE NOT EXISTS (SELECT 1 FROM gl_accounts WHERE account_code = '4310');

-- 8. Generate adjustment number function
CREATE OR REPLACE FUNCTION generate_adjustment_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_year TEXT;
    v_seq INT;
    v_number TEXT;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CASE 
            WHEN adjustment_number ~ ('^ADJ-' || v_year || '-[0-9]+$')
            THEN CAST(SPLIT_PART(adjustment_number, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1 INTO v_seq
    FROM stock_adjustments
    WHERE adjustment_number LIKE 'ADJ-' || v_year || '-%';
    
    v_number := 'ADJ-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
    
    RETURN v_number;
END;
$$;

-- 9. Post inventory adjustment function
CREATE OR REPLACE FUNCTION post_inventory_adjustment(p_adjustment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_adj RECORD;
    v_line RECORD;
    v_period_id UUID;
    v_je_id UUID;
    v_je_number TEXT;
    v_total_increase_value NUMERIC := 0;
    v_total_decrease_value NUMERIC := 0;
    v_inventory_account_id UUID;
    v_loss_account_id UUID;
    v_gain_account_id UUID;
    v_line_cost NUMERIC;
    v_now TIMESTAMPTZ := now();
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول لترحيل التسوية';
    END IF;

    -- 1. Load adjustment and validate
    SELECT * INTO v_adj FROM stock_adjustments WHERE id = p_adjustment_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'التسوية غير موجودة';
    END IF;
    
    IF v_adj.status != 'draft' THEN
        RAISE EXCEPTION 'يمكن ترحيل التسويات المسودة فقط. الحالة الحالية: %', v_adj.status;
    END IF;

    -- 2. Validate posting period
    SELECT validate_posting_period_strict(v_adj.adjustment_date) INTO v_period_id;

    -- 3. Get GL account IDs
    SELECT id INTO v_inventory_account_id FROM gl_accounts WHERE account_code = '1310' AND is_active = true;
    IF v_inventory_account_id IS NULL THEN
        SELECT id INTO v_inventory_account_id FROM gl_accounts WHERE account_code = '1130' AND is_active = true;
    END IF;
    IF v_inventory_account_id IS NULL THEN
        RAISE EXCEPTION 'حساب المخزون غير موجود';
    END IF;

    -- Get loss/gain accounts based on reason
    CASE v_adj.reason
        WHEN 'damaged' THEN
            SELECT id INTO v_loss_account_id FROM gl_accounts WHERE account_code = '5310' AND is_active = true;
        WHEN 'expired' THEN
            SELECT id INTO v_loss_account_id FROM gl_accounts WHERE account_code = '5320' AND is_active = true;
        WHEN 'theft' THEN
            SELECT id INTO v_loss_account_id FROM gl_accounts WHERE account_code = '5330' AND is_active = true;
        ELSE
            SELECT id INTO v_loss_account_id FROM gl_accounts WHERE account_code = '5300' AND is_active = true;
    END CASE;
    
    SELECT id INTO v_gain_account_id FROM gl_accounts WHERE account_code = '4310' AND is_active = true;
    
    IF v_loss_account_id IS NULL THEN
        RAISE EXCEPTION 'حساب خسائر المخزون غير موجود';
    END IF;

    -- 4. Process each line item
    FOR v_line IN 
        SELECT * FROM stock_adjustment_items WHERE adjustment_id = p_adjustment_id
    LOOP
        IF v_line.quantity_diff > 0 THEN
            -- Stock INCREASE: Add cost layer
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
                received_date,
                created_by
            ) VALUES (
                v_line.product_id,
                v_adj.warehouse_id,
                v_line.batch_number,
                COALESCE(v_line.unit_cost, 0),
                v_line.quantity_diff,
                v_line.quantity_diff,
                'stock_adjustment',
                p_adjustment_id,
                v_adj.adjustment_number,
                v_line.expiry_date,
                v_adj.adjustment_date,
                v_user_id
            );

            v_line_cost := v_line.quantity_diff * COALESCE(v_line.unit_cost, 0);
            v_total_increase_value := v_total_increase_value + v_line_cost;

            -- Update warehouse_stock
            INSERT INTO warehouse_stock (warehouse_id, item_id, qty_on_hand, last_updated)
            VALUES (v_adj.warehouse_id, v_line.product_id, v_line.quantity_diff, v_now)
            ON CONFLICT (warehouse_id, item_id) 
            DO UPDATE SET 
                qty_on_hand = warehouse_stock.qty_on_hand + v_line.quantity_diff,
                last_updated = v_now;

            -- Log to stock_ledger
            INSERT INTO stock_ledger (
                item_id, product_id, warehouse_id, transaction_type, reference_type,
                reference_id, qty_in, unit_cost, batch_number, notes
            ) VALUES (
                v_line.product_id, v_line.product_id, v_adj.warehouse_id,
                'adjustment_in', 'stock_adjustment', p_adjustment_id,
                v_line.quantity_diff, v_line.unit_cost, v_line.batch_number,
                'تسوية مخزون - زيادة: ' || v_adj.adjustment_number
            );

        ELSIF v_line.quantity_diff < 0 THEN
            -- Stock DECREASE: Consume FIFO layers
            v_line_cost := consume_fifo_layers(
                v_line.product_id,
                v_adj.warehouse_id,
                ABS(v_line.quantity_diff),
                'stock_adjustment',
                p_adjustment_id
            );
            
            v_total_decrease_value := v_total_decrease_value + v_line_cost;

            -- Update warehouse_stock
            UPDATE warehouse_stock 
            SET qty_on_hand = qty_on_hand - ABS(v_line.quantity_diff),
                last_updated = v_now
            WHERE warehouse_id = v_adj.warehouse_id AND item_id = v_line.product_id;

            -- Log to stock_ledger
            INSERT INTO stock_ledger (
                item_id, product_id, warehouse_id, transaction_type, reference_type,
                reference_id, qty_out, cogs_amount, batch_number, notes
            ) VALUES (
                v_line.product_id, v_line.product_id, v_adj.warehouse_id,
                'adjustment_out', 'stock_adjustment', p_adjustment_id,
                ABS(v_line.quantity_diff), v_line_cost, v_line.batch_number,
                'تسوية مخزون - نقص: ' || v_adj.adjustment_number
            );

            -- Update line with actual FIFO cost
            UPDATE stock_adjustment_items 
            SET total_cost_diff = v_line_cost,
                unit_cost = CASE WHEN ABS(v_line.quantity_diff) > 0 
                            THEN v_line_cost / ABS(v_line.quantity_diff) 
                            ELSE 0 END
            WHERE id = v_line.id;
        END IF;
    END LOOP;

    -- 5. Create GL Journal Entry if there's any value
    IF v_total_increase_value > 0 OR v_total_decrease_value > 0 THEN
        -- Generate journal entry number
        SELECT 'JE-' || to_char(CURRENT_DATE, 'YYYY') || '-' || 
               LPAD((COALESCE(MAX(CAST(SPLIT_PART(entry_no, '-', 3) AS INTEGER)), 0) + 1)::TEXT, 5, '0')
        INTO v_je_number
        FROM gl_journal_entries
        WHERE entry_no LIKE 'JE-' || to_char(CURRENT_DATE, 'YYYY') || '-%';

        INSERT INTO gl_journal_entries (
            entry_no,
            entry_date,
            posting_date,
            description,
            source_module,
            source_document_id,
            is_posted,
            accounting_period_id,
            created_by
        ) VALUES (
            v_je_number,
            v_adj.adjustment_date,
            v_adj.adjustment_date,
            'تسوية مخزون: ' || v_adj.adjustment_number || ' - ' || 
                CASE v_adj.reason 
                    WHEN 'stock_count' THEN 'فرق جرد'
                    WHEN 'damaged' THEN 'هالك'
                    WHEN 'expired' THEN 'منتهي الصلاحية'
                    WHEN 'found' THEN 'مخزون مكتشف'
                    WHEN 'opening_balance' THEN 'رصيد افتتاحي'
                    WHEN 'theft' THEN 'سرقة'
                    WHEN 'donation' THEN 'منحة'
                    ELSE 'أخرى'
                END,
            'stock_adjustment',
            p_adjustment_id::TEXT,
            true,
            v_period_id,
            v_user_id
        ) RETURNING id INTO v_je_id;

        -- Journal lines for DECREASE (Loss)
        IF v_total_decrease_value > 0 THEN
            INSERT INTO gl_journal_lines (journal_entry_id, account_id, debit, credit, description, line_no)
            VALUES (v_je_id, v_loss_account_id, v_total_decrease_value, 0, 
                    'خسائر تسوية مخزون - ' || v_adj.adjustment_number, 1);
            
            INSERT INTO gl_journal_lines (journal_entry_id, account_id, debit, credit, description, line_no)
            VALUES (v_je_id, v_inventory_account_id, 0, v_total_decrease_value, 
                    'نقص المخزون - ' || v_adj.adjustment_number, 2);
        END IF;

        -- Journal lines for INCREASE (Gain)
        IF v_total_increase_value > 0 THEN
            INSERT INTO gl_journal_lines (journal_entry_id, account_id, debit, credit, description, line_no)
            VALUES (v_je_id, v_inventory_account_id, v_total_increase_value, 0, 
                    'زيادة المخزون - ' || v_adj.adjustment_number, 
                    CASE WHEN v_total_decrease_value > 0 THEN 3 ELSE 1 END);
            
            INSERT INTO gl_journal_lines (journal_entry_id, account_id, debit, credit, description, line_no)
            VALUES (v_je_id, COALESCE(v_gain_account_id, v_loss_account_id), 0, v_total_increase_value, 
                    'أرباح تسوية مخزون - ' || v_adj.adjustment_number, 
                    CASE WHEN v_total_decrease_value > 0 THEN 4 ELSE 2 END);
        END IF;
    END IF;

    -- 6. Update adjustment status
    UPDATE stock_adjustments
    SET status = 'posted',
        journal_entry_id = v_je_id,
        posted_by = v_user_id,
        posted_at = v_now,
        total_difference_value = v_total_increase_value - v_total_decrease_value
    WHERE id = p_adjustment_id;

    -- 7. Return summary
    RETURN jsonb_build_object(
        'success', true,
        'adjustment_id', p_adjustment_id,
        'adjustment_number', v_adj.adjustment_number,
        'journal_entry_id', v_je_id,
        'journal_entry_number', v_je_number,
        'total_increase_value', v_total_increase_value,
        'total_decrease_value', v_total_decrease_value,
        'net_value', v_total_increase_value - v_total_decrease_value
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'فشل في ترحيل التسوية: %', SQLERRM;
END;
$$;

-- 10. Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_adjustment_number() TO authenticated;
GRANT EXECUTE ON FUNCTION post_inventory_adjustment(UUID) TO authenticated;