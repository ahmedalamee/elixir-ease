-- ============================================================================
-- AR/AP GL RECONCILIATION ENGINE
-- ============================================================================

-- 1. AR Reconciliation Function
CREATE OR REPLACE FUNCTION reconcile_ar_with_gl(
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  subledger_balance NUMERIC,
  gl_balance NUMERIC,
  difference NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_ar_account_id UUID;
BEGIN
  -- Get AR control account from erp_account_mappings or gl_accounts
  SELECT debit_account_id INTO v_ar_account_id
  FROM erp_account_mappings
  WHERE module = 'sales' AND operation = 'credit_sale' AND is_active = true
  LIMIT 1;
  
  -- Fallback: look for AR account by code pattern (1210 = Accounts Receivable)
  IF v_ar_account_id IS NULL THEN
    SELECT id INTO v_ar_account_id
    FROM gl_accounts
    WHERE account_code LIKE '121%' AND is_active = true
    LIMIT 1;
  END IF;

  RETURN QUERY
  WITH subledger AS (
    -- Calculate subledger balance per customer from transactions
    SELECT 
      c.id AS cust_id,
      c.name AS cust_name,
      COALESCE(SUM(
        CASE 
          WHEN si.id IS NOT NULL THEN si.grand_total - COALESCE(si.paid_amount, 0)
          ELSE 0
        END
      ), 0) -
      COALESCE((
        SELECT SUM(sr.refund_amount)
        FROM sales_returns sr
        WHERE sr.customer_id = c.id AND sr.status = 'posted' AND sr.return_date <= p_as_of_date
      ), 0) -
      COALESCE((
        SELECT SUM(cp.amount)
        FROM customer_payments cp
        WHERE cp.customer_id = c.id AND cp.status = 'posted' AND cp.payment_date <= p_as_of_date
      ), 0) AS sub_balance
    FROM customers c
    LEFT JOIN sales_invoices si ON si.customer_id = c.id 
      AND si.status = 'posted' 
      AND si.invoice_date <= p_as_of_date
    WHERE c.is_active = true
    GROUP BY c.id, c.name
  ),
  gl_balances AS (
    -- Calculate GL balance per customer from journal entries
    SELECT 
      -- Try to extract customer_id from source_document_id for sales invoices
      si.customer_id AS cust_id,
      SUM(COALESCE(jl.debit, 0) - COALESCE(jl.credit, 0)) AS gl_bal
    FROM gl_journal_lines jl
    JOIN gl_journal_entries je ON je.id = jl.journal_id
    LEFT JOIN sales_invoices si ON je.source_document_id = si.id::text AND je.source_module = 'sales'
    WHERE jl.account_id = v_ar_account_id
      AND je.is_posted = true
      AND je.entry_date <= p_as_of_date
      AND si.customer_id IS NOT NULL
    GROUP BY si.customer_id
  )
  SELECT 
    s.cust_id,
    s.cust_name,
    ROUND(s.sub_balance, 2),
    ROUND(COALESCE(g.gl_bal, 0), 2),
    ROUND(s.sub_balance - COALESCE(g.gl_bal, 0), 2),
    CASE 
      WHEN ABS(s.sub_balance - COALESCE(g.gl_bal, 0)) < 0.01 THEN 'matched'
      WHEN g.gl_bal IS NULL AND s.sub_balance > 0.01 THEN 'only_in_subledger'
      WHEN s.sub_balance < 0.01 AND COALESCE(g.gl_bal, 0) > 0.01 THEN 'only_in_gl'
      ELSE 'mismatch'
    END
  FROM subledger s
  LEFT JOIN gl_balances g ON g.cust_id = s.cust_id
  WHERE s.sub_balance > 0.01 OR COALESCE(g.gl_bal, 0) > 0.01
  ORDER BY ABS(s.sub_balance - COALESCE(g.gl_bal, 0)) DESC;
END;
$$;

-- 2. AP Reconciliation Function
CREATE OR REPLACE FUNCTION reconcile_ap_with_gl(
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  supplier_id UUID,
  supplier_name TEXT,
  subledger_balance NUMERIC,
  gl_balance NUMERIC,
  difference NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_ap_account_id UUID;
BEGIN
  -- Get AP control account from erp_account_mappings
  SELECT credit_account_id INTO v_ap_account_id
  FROM erp_account_mappings
  WHERE module = 'purchases' AND operation = 'credit_purchase' AND is_active = true
  LIMIT 1;
  
  -- Fallback: look for AP account by code pattern (2110 = Accounts Payable)
  IF v_ap_account_id IS NULL THEN
    SELECT id INTO v_ap_account_id
    FROM gl_accounts
    WHERE account_code LIKE '211%' AND is_active = true
    LIMIT 1;
  END IF;

  RETURN QUERY
  WITH subledger AS (
    -- Calculate subledger balance per supplier from transactions
    SELECT 
      s.id AS sup_id,
      s.name AS sup_name,
      COALESCE(SUM(
        CASE 
          WHEN pi.id IS NOT NULL THEN pi.total_amount - COALESCE(pi.paid_amount, 0)
          ELSE 0
        END
      ), 0) -
      COALESCE((
        SELECT SUM(pr.refund_amount)
        FROM purchase_returns pr
        WHERE pr.supplier_id = s.id AND pr.status = 'posted' AND pr.return_date <= p_as_of_date
      ), 0) -
      COALESCE((
        SELECT SUM(cp.amount)
        FROM cash_payments cp
        WHERE cp.supplier_id = s.id AND cp.status = 'posted' AND cp.payment_date <= p_as_of_date
      ), 0) AS sub_balance
    FROM suppliers s
    LEFT JOIN purchase_invoices pi ON pi.supplier_id = s.id 
      AND pi.status = 'posted' 
      AND pi.invoice_date <= p_as_of_date
    WHERE s.is_active = true
    GROUP BY s.id, s.name
  ),
  gl_balances AS (
    -- Calculate GL balance per supplier from journal entries
    SELECT 
      pi.supplier_id AS sup_id,
      SUM(COALESCE(jl.credit, 0) - COALESCE(jl.debit, 0)) AS gl_bal
    FROM gl_journal_lines jl
    JOIN gl_journal_entries je ON je.id = jl.journal_id
    LEFT JOIN purchase_invoices pi ON je.source_document_id = pi.id::text AND je.source_module = 'purchases'
    WHERE jl.account_id = v_ap_account_id
      AND je.is_posted = true
      AND je.entry_date <= p_as_of_date
      AND pi.supplier_id IS NOT NULL
    GROUP BY pi.supplier_id
  )
  SELECT 
    s.sup_id,
    s.sup_name,
    ROUND(s.sub_balance, 2),
    ROUND(COALESCE(g.gl_bal, 0), 2),
    ROUND(s.sub_balance - COALESCE(g.gl_bal, 0), 2),
    CASE 
      WHEN ABS(s.sub_balance - COALESCE(g.gl_bal, 0)) < 0.01 THEN 'matched'
      WHEN g.gl_bal IS NULL AND s.sub_balance > 0.01 THEN 'only_in_subledger'
      WHEN s.sub_balance < 0.01 AND COALESCE(g.gl_bal, 0) > 0.01 THEN 'only_in_gl'
      ELSE 'mismatch'
    END
  FROM subledger s
  LEFT JOIN gl_balances g ON g.sup_id = s.sup_id
  WHERE s.sub_balance > 0.01 OR COALESCE(g.gl_bal, 0) > 0.01
  ORDER BY ABS(s.sub_balance - COALESCE(g.gl_bal, 0)) DESC;
END;
$$;

-- 3. Rebuild Customer Balance Function
CREATE OR REPLACE FUNCTION rebuild_customer_balance(
  p_customer_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- Calculate true balance from transaction history
  SELECT 
    COALESCE(SUM(si.grand_total - COALESCE(si.paid_amount, 0)), 0) -
    COALESCE((
      SELECT SUM(sr.refund_amount)
      FROM sales_returns sr
      WHERE sr.customer_id = p_customer_id AND sr.status = 'posted'
    ), 0) -
    COALESCE((
      SELECT SUM(cp.amount)
      FROM customer_payments cp
      WHERE cp.customer_id = p_customer_id AND cp.status = 'posted'
    ), 0)
  INTO v_new_balance
  FROM sales_invoices si
  WHERE si.customer_id = p_customer_id AND si.status = 'posted';

  -- Update customer balance
  UPDATE customers
  SET balance = COALESCE(v_new_balance, 0),
      updated_at = NOW()
  WHERE id = p_customer_id;

  RETURN COALESCE(v_new_balance, 0);
END;
$$;

-- 4. Rebuild Supplier Balance Function
CREATE OR REPLACE FUNCTION rebuild_supplier_balance(
  p_supplier_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- Calculate true balance from transaction history
  SELECT 
    COALESCE(SUM(pi.total_amount - COALESCE(pi.paid_amount, 0)), 0) -
    COALESCE((
      SELECT SUM(pr.refund_amount)
      FROM purchase_returns pr
      WHERE pr.supplier_id = p_supplier_id AND pr.status = 'posted'
    ), 0) -
    COALESCE((
      SELECT SUM(cp.amount)
      FROM cash_payments cp
      WHERE cp.supplier_id = p_supplier_id AND cp.status = 'posted'
    ), 0)
  INTO v_new_balance
  FROM purchase_invoices pi
  WHERE pi.supplier_id = p_supplier_id AND pi.status = 'posted';

  -- Update supplier balance
  UPDATE suppliers
  SET balance = COALESCE(v_new_balance, 0),
      updated_at = NOW()
  WHERE id = p_supplier_id;

  RETURN COALESCE(v_new_balance, 0);
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION reconcile_ar_with_gl(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_ap_with_gl(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION rebuild_customer_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rebuild_supplier_balance(UUID) TO authenticated;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer_status_date 
ON sales_invoices(customer_id, status, invoice_date);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier_status_date 
ON purchase_invoices(supplier_id, status, invoice_date);

CREATE INDEX IF NOT EXISTS idx_gl_journal_lines_account_id 
ON gl_journal_lines(account_id);

CREATE INDEX IF NOT EXISTS idx_gl_journal_entries_posted_date 
ON gl_journal_entries(is_posted, entry_date);