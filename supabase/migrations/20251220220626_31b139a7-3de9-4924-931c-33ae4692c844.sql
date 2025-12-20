-- Fix convert_pr_to_po function to use correct column names
CREATE OR REPLACE FUNCTION public.convert_pr_to_po(p_pr_id UUID, p_supplier_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pr RECORD;
    v_po_id UUID;
    v_po_number TEXT;
    v_item RECORD;
    v_line_no INTEGER := 0;
BEGIN
    SELECT * INTO v_pr FROM purchase_requisitions WHERE id = p_pr_id;
    
    IF v_pr IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'PR not found');
    END IF;
    
    IF v_pr.status NOT IN ('approved', 'converted_to_rfq') THEN
        RETURN jsonb_build_object('success', false, 'error', 'PR must be approved');
    END IF;
    
    v_po_number := generate_po_number();
    
    INSERT INTO purchase_orders (
        po_number, supplier_id, warehouse_id, currency_code, exchange_rate,
        subtotal_fc, discount_fc, tax_fc, total_fc,
        subtotal_bc, discount_bc, tax_bc, total_bc,
        pr_id, status, created_by
    ) VALUES (
        v_po_number, p_supplier_id, v_pr.warehouse_id, v_pr.currency_code, v_pr.exchange_rate,
        v_pr.subtotal_fc, v_pr.discount_fc, v_pr.tax_fc, v_pr.total_fc,
        v_pr.subtotal_bc, v_pr.discount_bc, v_pr.tax_bc, v_pr.total_bc,
        p_pr_id, 'draft', auth.uid()
    ) RETURNING id INTO v_po_id;
    
    FOR v_item IN SELECT * FROM pr_items WHERE pr_id = p_pr_id ORDER BY line_no
    LOOP
        v_line_no := v_line_no + 1;
        INSERT INTO po_items (
            po_id, item_id, uom_id, qty_ordered, price_fc, price_bc,
            net_amount_fc, net_amount_bc, line_no
        ) VALUES (
            v_po_id, v_item.product_id, v_item.uom_id, v_item.requested_qty,
            COALESCE(v_item.estimated_unit_cost_fc, 0), COALESCE(v_item.estimated_unit_cost_bc, 0),
            COALESCE(v_item.line_total_fc, 0), COALESCE(v_item.line_total_bc, 0), v_line_no
        );
    END LOOP;
    
    UPDATE purchase_requisitions 
    SET status = 'converted_to_po', updated_at = now()
    WHERE id = p_pr_id;
    
    RETURN jsonb_build_object('success', true, 'po_id', v_po_id, 'po_number', v_po_number);
END;
$$;

-- Fix convert_quote_to_po function to use correct column names
CREATE OR REPLACE FUNCTION public.convert_quote_to_po(p_quote_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quote RECORD;
    v_rfq RECORD;
    v_po_id UUID;
    v_po_number TEXT;
    v_item RECORD;
    v_line_no INTEGER := 0;
BEGIN
    SELECT q.*, s.name as supplier_name 
    INTO v_quote 
    FROM rfq_quotes q
    JOIN suppliers s ON s.id = q.supplier_id
    WHERE q.id = p_quote_id;
    
    IF v_quote IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quote not found');
    END IF;
    
    SELECT * INTO v_rfq FROM rfq_requests WHERE id = v_quote.rfq_id;
    
    UPDATE rfq_quotes SET is_winner = false WHERE rfq_id = v_quote.rfq_id;
    UPDATE rfq_quotes SET is_winner = true, status = 'selected' WHERE id = p_quote_id;
    
    v_po_number := generate_po_number();
    
    INSERT INTO purchase_orders (
        po_number, supplier_id, warehouse_id, currency_code, exchange_rate,
        subtotal_fc, discount_fc, tax_fc, total_fc,
        subtotal_bc, discount_bc, tax_bc, total_bc,
        rfq_id, quote_id, status, created_by
    ) VALUES (
        v_po_number, v_quote.supplier_id, v_rfq.warehouse_id, 
        v_quote.currency_code, v_quote.exchange_rate,
        v_quote.subtotal_fc, v_quote.discount_fc, v_quote.tax_fc, v_quote.total_fc,
        v_quote.subtotal_bc, v_quote.discount_bc, v_quote.tax_bc, v_quote.total_bc,
        v_rfq.id, p_quote_id, 'draft', auth.uid()
    ) RETURNING id INTO v_po_id;
    
    FOR v_item IN SELECT * FROM rfq_quote_items WHERE quote_id = p_quote_id ORDER BY line_no
    LOOP
        v_line_no := v_line_no + 1;
        INSERT INTO po_items (
            po_id, item_id, uom_id, qty_ordered, price_fc, price_bc,
            net_amount_fc, net_amount_bc, line_no
        ) VALUES (
            v_po_id, v_item.product_id, v_item.uom_id, v_item.quantity,
            COALESCE(v_item.unit_price_fc, 0), COALESCE(v_item.unit_price_bc, 0),
            COALESCE(v_item.line_total_fc, 0), COALESCE(v_item.line_total_bc, 0), v_line_no
        );
    END LOOP;
    
    UPDATE rfq_requests SET status = 'awarded', updated_at = now() WHERE id = v_quote.rfq_id;
    
    IF v_rfq.pr_id IS NOT NULL THEN
        UPDATE purchase_requisitions 
        SET status = 'converted_to_po', updated_at = now()
        WHERE id = v_rfq.pr_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'po_id', v_po_id, 'po_number', v_po_number);
END;
$$;