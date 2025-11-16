-- Add missing columns to purchase_invoices table
ALTER TABLE purchase_invoices
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS grn_id UUID REFERENCES goods_receipts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_grn_id ON purchase_invoices(grn_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_po_id ON purchase_invoices(po_id);

-- Add check constraint for invoice_type
ALTER TABLE purchase_invoices
ADD CONSTRAINT chk_invoice_type CHECK (invoice_type IN ('direct', 'grn', 'po'));