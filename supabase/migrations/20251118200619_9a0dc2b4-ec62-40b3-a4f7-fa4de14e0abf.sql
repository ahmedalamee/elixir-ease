-- Create function to post purchase invoice and update inventory
CREATE OR REPLACE FUNCTION post_purchase_invoice(p_invoice_id UUID)
RETURNS JSON AS $$
DECLARE
  v_invoice RECORD;
  v_item RECORD;
  v_journal_entry_id UUID;
  v_journal_entry_number TEXT;
  v_result JSON;
BEGIN
  -- Get invoice details
  SELECT * INTO v_invoice FROM purchase_invoices WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  
  IF v_invoice.status = 'posted' THEN
    RAISE EXCEPTION 'Invoice already posted';
  END IF;
  
  -- Update invoice status
  UPDATE purchase_invoices 
  SET status = 'posted',
      posted_at = now(),
      posted_by = auth.uid()
  WHERE id = p_invoice_id;
  
  -- Generate journal entry number
  v_journal_entry_number := 'JE-' || LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1 FROM journal_entries WHERE entry_number LIKE 'JE-%')::TEXT, 6, '0');
  
  -- Create journal entry
  INSERT INTO journal_entries (
    entry_number,
    entry_date,
    description,
    reference_type,
    reference_id,
    status,
    created_by
  ) VALUES (
    v_journal_entry_number,
    v_invoice.invoice_date,
    'Purchase Invoice ' || v_invoice.pi_number,
    'purchase_invoice',
    p_invoice_id,
    'posted',
    auth.uid()
  ) RETURNING id INTO v_journal_entry_id;
  
  -- Debit: Inventory/Purchases (assuming account code 1-1-001 for inventory)
  INSERT INTO journal_entry_lines (
    entry_id,
    line_no,
    account_id,
    debit_amount,
    credit_amount,
    description
  ) SELECT
    v_journal_entry_id,
    1,
    (SELECT id FROM gl_accounts WHERE account_code = '1-1-001' LIMIT 1),
    v_invoice.total_amount,
    0,
    'Purchase Invoice ' || v_invoice.pi_number;
  
  -- Credit: Accounts Payable (assuming account code 2-1-001)
  INSERT INTO journal_entry_lines (
    entry_id,
    line_no,
    account_id,
    debit_amount,
    credit_amount,
    description
  ) SELECT
    v_journal_entry_id,
    2,
    (SELECT id FROM gl_accounts WHERE account_code = '2-1-001' LIMIT 1),
    0,
    v_invoice.total_amount,
    'Purchase Invoice ' || v_invoice.pi_number;
  
  -- Update journal entry totals
  UPDATE journal_entries
  SET total_debit = v_invoice.total_amount,
      total_credit = v_invoice.total_amount,
      posted_at = now(),
      posted_by = auth.uid()
  WHERE id = v_journal_entry_id;
  
  -- Create document GL entry link
  INSERT INTO document_gl_entries (
    document_type,
    document_id,
    document_number,
    document_amount,
    journal_entry_id,
    status
  ) VALUES (
    'purchase_invoice',
    p_invoice_id,
    v_invoice.pi_number,
    v_invoice.total_amount,
    v_journal_entry_id,
    'posted'
  );
  
  -- Update supplier balance
  UPDATE suppliers
  SET balance = balance + v_invoice.total_amount
  WHERE id = v_invoice.supplier_id;
  
  v_result := json_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'journal_entry_id', v_journal_entry_id,
    'journal_entry_number', v_journal_entry_number,
    'message', 'Invoice posted successfully'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error posting invoice: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to post goods receipt and update inventory
CREATE OR REPLACE FUNCTION post_goods_receipt(p_grn_id UUID)
RETURNS JSON AS $$
DECLARE
  v_grn RECORD;
  v_item RECORD;
  v_batch_id UUID;
  v_result JSON;
BEGIN
  -- Get GRN details
  SELECT * INTO v_grn FROM goods_receipts WHERE id = p_grn_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GRN not found';
  END IF;
  
  IF v_grn.status = 'posted' THEN
    RAISE EXCEPTION 'GRN already posted';
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
    -- Create or update batch
    INSERT INTO batches (
      item_id,
      batch_no,
      expiry_date,
      qty,
      warehouse_id,
      created_at
    ) VALUES (
      v_item.item_id,
      v_item.lot_no,
      v_item.expiry_date,
      v_item.qty_received,
      v_grn.warehouse_id,
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
      qty_on_hand = warehouse_stock.qty_on_hand + v_item.qty_received,
      last_updated = now();
    
    -- Create stock ledger entry
    INSERT INTO stock_ledger (
      warehouse_id,
      item_id,
      batch_id,
      ref_type,
      ref_id,
      qty_in,
      qty_out,
      unit_cost,
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
      v_item.unit_cost,
      auth.uid(),
      now(),
      'Goods Receipt: ' || v_grn.grn_number
    );
    
    -- Update PO item received quantity if linked to PO
    IF v_item.po_item_id IS NOT NULL THEN
      UPDATE po_items
      SET qty_received = qty_received + v_item.qty_received
      WHERE id = v_item.po_item_id;
    END IF;
  END LOOP;
  
  -- Update PO status if all items received
  IF v_grn.po_id IS NOT NULL THEN
    UPDATE purchase_orders po
    SET status = CASE 
      WHEN (SELECT SUM(qty_ordered) FROM po_items WHERE po_id = po.id) = 
           (SELECT SUM(qty_received) FROM po_items WHERE po_id = po.id)
      THEN 'completed'
      ELSE 'partial'
    END
    WHERE po.id = v_grn.po_id;
  END IF;
  
  v_result := json_build_object(
    'success', true,
    'grn_id', p_grn_id,
    'message', 'GRN posted successfully and inventory updated'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error posting GRN: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update purchase order status
CREATE OR REPLACE FUNCTION update_po_status_on_grn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'posted' AND OLD.status <> 'posted' AND NEW.po_id IS NOT NULL THEN
    UPDATE purchase_orders
    SET status = CASE
      WHEN (SELECT COUNT(*) FROM goods_receipts WHERE po_id = NEW.po_id AND status = 'posted') > 0
      THEN 'received'
      ELSE status
    END
    WHERE id = NEW.po_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_po_status_on_grn
AFTER UPDATE ON goods_receipts
FOR EACH ROW
EXECUTE FUNCTION update_po_status_on_grn();