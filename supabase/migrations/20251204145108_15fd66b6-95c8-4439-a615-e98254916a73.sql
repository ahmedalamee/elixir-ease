-- =============================================
-- Customer & Supplier Aging Reports Functions
-- =============================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_customer_aging(DATE);
DROP FUNCTION IF EXISTS get_supplier_aging(DATE);

-- 1. Customer Aging Report Function
CREATE OR REPLACE FUNCTION get_customer_aging(
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  current_amount NUMERIC,
  bucket_1_30 NUMERIC,
  bucket_31_60 NUMERIC,
  bucket_61_90 NUMERIC,
  bucket_91_120 NUMERIC,
  bucket_over_120 NUMERIC,
  total_outstanding NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  WITH invoice_balances AS (
    -- Get all posted sales invoices with remaining balance
    SELECT 
      si.customer_id,
      c.name AS customer_name,
      si.id AS document_id,
      'invoice' AS doc_type,
      COALESCE(si.due_date, si.invoice_date) AS base_date,
      (si.total_amount - si.paid_amount) AS open_amount
    FROM sales_invoices si
    JOIN customers c ON c.id = si.customer_id
    WHERE si.status = 'posted'
      AND si.invoice_date <= p_as_of_date
      AND (si.total_amount - si.paid_amount) > 0.01
    
    UNION ALL
    
    -- Subtract posted sales returns (credit notes)
    SELECT 
      sr.customer_id,
      c.name AS customer_name,
      sr.id AS document_id,
      'return' AS doc_type,
      sr.return_date AS base_date,
      -sr.refund_amount AS open_amount
    FROM sales_returns sr
    JOIN customers c ON c.id = sr.customer_id
    WHERE sr.status = 'posted'
      AND sr.return_date <= p_as_of_date
  ),
  aged_balances AS (
    SELECT
      ib.customer_id,
      ib.customer_name,
      ib.open_amount,
      (p_as_of_date - ib.base_date) AS days_overdue
    FROM invoice_balances ib
  )
  SELECT
    ab.customer_id,
    ab.customer_name,
    -- Current: not yet due (days_overdue <= 0)
    SUM(CASE WHEN ab.days_overdue <= 0 THEN ab.open_amount ELSE 0 END)::NUMERIC AS current_amount,
    -- 1-30 days overdue
    SUM(CASE WHEN ab.days_overdue BETWEEN 1 AND 30 THEN ab.open_amount ELSE 0 END)::NUMERIC AS bucket_1_30,
    -- 31-60 days overdue
    SUM(CASE WHEN ab.days_overdue BETWEEN 31 AND 60 THEN ab.open_amount ELSE 0 END)::NUMERIC AS bucket_31_60,
    -- 61-90 days overdue
    SUM(CASE WHEN ab.days_overdue BETWEEN 61 AND 90 THEN ab.open_amount ELSE 0 END)::NUMERIC AS bucket_61_90,
    -- 91-120 days overdue
    SUM(CASE WHEN ab.days_overdue BETWEEN 91 AND 120 THEN ab.open_amount ELSE 0 END)::NUMERIC AS bucket_91_120,
    -- Over 120 days
    SUM(CASE WHEN ab.days_overdue > 120 THEN ab.open_amount ELSE 0 END)::NUMERIC AS bucket_over_120,
    -- Total
    SUM(ab.open_amount)::NUMERIC AS total_outstanding
  FROM aged_balances ab
  GROUP BY ab.customer_id, ab.customer_name
  HAVING SUM(ab.open_amount) <> 0
  ORDER BY SUM(ab.open_amount) DESC;
END;
$$;

-- 2. Supplier Aging Report Function
CREATE OR REPLACE FUNCTION get_supplier_aging(
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  supplier_id UUID,
  supplier_name TEXT,
  current_amount NUMERIC,
  bucket_1_30 NUMERIC,
  bucket_31_60 NUMERIC,
  bucket_61_90 NUMERIC,
  bucket_91_120 NUMERIC,
  bucket_over_120 NUMERIC,
  total_outstanding NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  WITH invoice_balances AS (
    -- Get all posted purchase invoices with remaining balance
    SELECT 
      pi.supplier_id,
      s.name AS supplier_name,
      pi.id AS document_id,
      'invoice' AS doc_type,
      COALESCE(pi.due_date, pi.invoice_date) AS base_date,
      (pi.total_amount - pi.paid_amount) AS open_amount
    FROM purchase_invoices pi
    JOIN suppliers s ON s.id = pi.supplier_id
    WHERE pi.status = 'posted'
      AND pi.invoice_date <= p_as_of_date
      AND (pi.total_amount - pi.paid_amount) > 0.01
    
    UNION ALL
    
    -- Subtract posted purchase returns (debit notes)
    SELECT 
      pr.supplier_id,
      s.name AS supplier_name,
      pr.id AS document_id,
      'return' AS doc_type,
      pr.return_date AS base_date,
      -pr.total_amount AS open_amount
    FROM purchase_returns pr
    JOIN suppliers s ON s.id = pr.supplier_id
    WHERE pr.status = 'posted'
      AND pr.return_date <= p_as_of_date
  ),
  aged_balances AS (
    SELECT
      ib.supplier_id,
      ib.supplier_name,
      ib.open_amount,
      (p_as_of_date - ib.base_date) AS days_overdue
    FROM invoice_balances ib
  )
  SELECT
    ab.supplier_id,
    ab.supplier_name,
    -- Current: not yet due (days_overdue <= 0)
    SUM(CASE WHEN ab.days_overdue <= 0 THEN ab.open_amount ELSE 0 END)::NUMERIC AS current_amount,
    -- 1-30 days overdue
    SUM(CASE WHEN ab.days_overdue BETWEEN 1 AND 30 THEN ab.open_amount ELSE 0 END)::NUMERIC AS bucket_1_30,
    -- 31-60 days overdue
    SUM(CASE WHEN ab.days_overdue BETWEEN 31 AND 60 THEN ab.open_amount ELSE 0 END)::NUMERIC AS bucket_31_60,
    -- 61-90 days overdue
    SUM(CASE WHEN ab.days_overdue BETWEEN 61 AND 90 THEN ab.open_amount ELSE 0 END)::NUMERIC AS bucket_61_90,
    -- 91-120 days overdue
    SUM(CASE WHEN ab.days_overdue BETWEEN 91 AND 120 THEN ab.open_amount ELSE 0 END)::NUMERIC AS bucket_91_120,
    -- Over 120 days
    SUM(CASE WHEN ab.days_overdue > 120 THEN ab.open_amount ELSE 0 END)::NUMERIC AS bucket_over_120,
    -- Total
    SUM(ab.open_amount)::NUMERIC AS total_outstanding
  FROM aged_balances ab
  GROUP BY ab.supplier_id, ab.supplier_name
  HAVING SUM(ab.open_amount) <> 0
  ORDER BY SUM(ab.open_amount) DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_customer_aging(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_supplier_aging(DATE) TO authenticated;

-- Add indexes for performance (if not exist)
CREATE INDEX IF NOT EXISTS idx_sales_invoices_aging 
  ON sales_invoices(customer_id, status, invoice_date, due_date) 
  WHERE status = 'posted';

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_aging 
  ON purchase_invoices(supplier_id, status, invoice_date, due_date) 
  WHERE status = 'posted';

CREATE INDEX IF NOT EXISTS idx_sales_returns_aging 
  ON sales_returns(customer_id, status, return_date) 
  WHERE status = 'posted';

CREATE INDEX IF NOT EXISTS idx_purchase_returns_aging 
  ON purchase_returns(supplier_id, status, return_date) 
  WHERE status = 'posted';