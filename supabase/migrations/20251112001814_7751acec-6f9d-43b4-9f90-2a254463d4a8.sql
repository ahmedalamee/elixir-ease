-- Fix critical duplicate triggers issue
-- Remove new broken triggers that reference non-existent 'total' column
-- Keep old working triggers that correctly use 'total_amount'

-- Drop broken triggers on sales_invoices
DROP TRIGGER IF EXISTS trg_update_customer_from_sales_invoice ON sales_invoices;
DROP TRIGGER IF EXISTS trg_calculate_loyalty_points ON sales_invoices;

-- Drop broken trigger on customer_payments  
DROP TRIGGER IF EXISTS trg_update_customer_from_payment ON customer_payments;

-- Drop the broken functions
DROP FUNCTION IF EXISTS update_customer_from_sales_invoice();
DROP FUNCTION IF EXISTS calculate_loyalty_points();
DROP FUNCTION IF EXISTS update_customer_from_payment();

-- The old working triggers remain:
-- ✅ trigger_update_customer_on_invoice_post (uses NEW.total_amount correctly)
-- ✅ trigger_update_customer_on_payment_post (uses NEW.amount correctly)