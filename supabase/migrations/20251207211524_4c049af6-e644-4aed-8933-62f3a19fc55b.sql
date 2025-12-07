-- Add currency_code to suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'YER';

-- Add FC/BC columns to purchase_invoices
ALTER TABLE purchase_invoices 
ADD COLUMN IF NOT EXISTS subtotal_fc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal_bc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount_fc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount_bc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount_fc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount_bc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount_fc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount_bc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_amount_fc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_amount_bc NUMERIC DEFAULT 0;

-- Update existing purchase_invoices to populate FC/BC from existing values
UPDATE purchase_invoices 
SET 
  subtotal_fc = COALESCE(subtotal, 0),
  subtotal_bc = COALESCE(subtotal, 0) * COALESCE(exchange_rate, 1),
  discount_amount_fc = COALESCE(discount_amount, 0),
  discount_amount_bc = COALESCE(discount_amount, 0) * COALESCE(exchange_rate, 1),
  tax_amount_fc = COALESCE(tax_amount, 0),
  tax_amount_bc = COALESCE(tax_amount, 0) * COALESCE(exchange_rate, 1),
  total_amount_fc = COALESCE(total_amount, 0),
  total_amount_bc = COALESCE(total_amount, 0) * COALESCE(exchange_rate, 1),
  paid_amount_fc = COALESCE(paid_amount, 0),
  paid_amount_bc = COALESCE(paid_amount, 0) * COALESCE(exchange_rate, 1),
  currency_code = COALESCE(currency_code, 'YER')
WHERE subtotal_fc = 0 OR subtotal_fc IS NULL;

-- Add FC/BC columns to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'YER',
ADD COLUMN IF NOT EXISTS subtotal_fc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal_bc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount_fc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount_bc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount_fc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount_bc NUMERIC DEFAULT 0;

-- Update existing purchase_orders to populate FC/BC from existing values
UPDATE purchase_orders 
SET 
  subtotal_fc = COALESCE(subtotal, 0),
  subtotal_bc = COALESCE(subtotal, 0) * COALESCE(exchange_rate, 1),
  tax_amount_fc = COALESCE(tax_amount, 0),
  tax_amount_bc = COALESCE(tax_amount, 0) * COALESCE(exchange_rate, 1),
  total_amount_fc = COALESCE(total_amount, 0),
  total_amount_bc = COALESCE(total_amount, 0) * COALESCE(exchange_rate, 1),
  currency_code = COALESCE(currency_code, 'YER')
WHERE subtotal_fc = 0 OR subtotal_fc IS NULL;

-- Add currency fields to sales_invoices for POS if not exists (for completeness)
-- These should already exist from previous migrations but let's ensure
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_invoices' AND column_name = 'subtotal_fc') THEN
    ALTER TABLE sales_invoices ADD COLUMN subtotal_fc NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_invoices' AND column_name = 'subtotal_bc') THEN
    ALTER TABLE sales_invoices ADD COLUMN subtotal_bc NUMERIC DEFAULT 0;
  END IF;
END $$;