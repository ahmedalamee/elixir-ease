
-- Fix: The trigger update_po_status_on_grn tries to set status to 'received' 
-- which is not in the allowed values ['draft', 'submitted', 'approved', 'partial', 'completed', 'cancelled']

-- Drop the conflicting trigger first
DROP TRIGGER IF EXISTS trg_update_po_status_on_grn ON goods_receipts;

-- Drop the old function
DROP FUNCTION IF EXISTS update_po_status_on_grn();

-- The post_goods_receipt function already handles PO status updates correctly
-- (sets to 'completed' or 'partial' which are valid values)
-- So we don't need this duplicate trigger
