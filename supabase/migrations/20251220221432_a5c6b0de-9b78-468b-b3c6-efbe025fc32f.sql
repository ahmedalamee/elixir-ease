-- Fix convert_pr_to_po function with correct column names
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
        subtotal_fc, subtotal_bc, 
        tax_amount_fc, tax_amount_bc, 
        total_amount_fc, total_amount_bc,
        subtotal, tax_amount, total_amount,
        pr_id, status, created_by
    ) VALUES (
        v_po_number, p_supplier_id, v_pr.warehouse_id, v_pr.currency_code, v_pr.exchange_rate,
        v_pr.subtotal_fc, v_pr.subtotal_bc,
        COALESCE(v_pr.tax_fc, 0), COALESCE(v_pr.tax_bc, 0),
        v_pr.total_fc, v_pr.total_bc,
        v_pr.subtotal_fc, COALESCE(v_pr.tax_fc, 0), v_pr.total_fc,
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