-- Fix remaining functions with search_path security

-- Drop and recreate get_account_mapping with search_path
DROP FUNCTION IF EXISTS public.get_account_mapping(text, text, uuid);
CREATE FUNCTION public.get_account_mapping(p_module text, p_operation text, p_branch_id uuid DEFAULT NULL)
RETURNS TABLE(debit_account_id uuid, credit_account_id uuid, notes text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try to find branch-specific mapping first
  IF p_branch_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      m.debit_account_id,
      m.credit_account_id,
      m.notes
    FROM public.erp_account_mappings m
    WHERE m.module = p_module
      AND m.operation = p_operation
      AND m.branch_id = p_branch_id
      AND m.is_active = TRUE
    LIMIT 1;
    
    -- If found, return
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- Fall back to general mapping (branch_id IS NULL)
  RETURN QUERY
  SELECT 
    m.debit_account_id,
    m.credit_account_id,
    m.notes
  FROM public.erp_account_mappings m
  WHERE m.module = p_module
    AND m.operation = p_operation
    AND m.branch_id IS NULL
    AND m.is_active = TRUE
  LIMIT 1;
END;
$$;

-- Drop and recreate get_currency_summary with search_path
DROP FUNCTION IF EXISTS public.get_currency_summary(date, date);
CREATE FUNCTION public.get_currency_summary(p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE(currency_code character varying, currency_name text, total_sales numeric, total_purchases numeric, net_position numeric, exchange_gain_loss numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH sales_summary AS (
    SELECT 
      si.currency_code,
      SUM(si.total_amount) as sales_total,
      SUM(si.base_currency_total) as sales_base_total
    FROM public.sales_invoices si
    WHERE si.status = 'posted'
      AND (p_start_date IS NULL OR si.invoice_date >= p_start_date)
      AND (p_end_date IS NULL OR si.invoice_date <= p_end_date)
    GROUP BY si.currency_code
  ),
  purchase_summary AS (
    SELECT 
      pi.currency_code,
      SUM(pi.total_amount) as purchase_total,
      SUM(pi.base_currency_total) as purchase_base_total
    FROM public.purchase_invoices pi
    WHERE pi.status = 'posted'
      AND (p_start_date IS NULL OR pi.invoice_date >= p_start_date)
      AND (p_end_date IS NULL OR pi.invoice_date <= p_end_date)
    GROUP BY pi.currency_code
  )
  SELECT 
    COALESCE(s.currency_code, p.currency_code)::character varying as currency_code,
    c.name as currency_name,
    COALESCE(s.sales_total, 0) as total_sales,
    COALESCE(p.purchase_total, 0) as total_purchases,
    COALESCE(s.sales_total, 0) - COALESCE(p.purchase_total, 0) as net_position,
    COALESCE(s.sales_base_total, 0) - COALESCE(p.purchase_base_total, 0) as exchange_gain_loss
  FROM sales_summary s
  FULL OUTER JOIN purchase_summary p ON s.currency_code = p.currency_code
  LEFT JOIN public.currencies c ON c.code = COALESCE(s.currency_code, p.currency_code)
  ORDER BY 1;
END;
$$;

-- Fix convert_currency with search_path (this one should work as recreate)
CREATE OR REPLACE FUNCTION public.convert_currency(
  p_amount numeric,
  p_from_currency character varying,
  p_to_currency character varying,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_base_currency varchar(3) := 'YER';
BEGIN
  -- If same currency, return amount
  IF p_from_currency = p_to_currency THEN
    RETURN p_amount;
  END IF;
  
  -- If converting from base currency
  IF p_from_currency = v_base_currency THEN
    SELECT rate INTO v_rate
    FROM public.exchange_rates
    WHERE currency_code = p_to_currency
      AND rate_date <= p_date
    ORDER BY rate_date DESC
    LIMIT 1;
    
    IF v_rate IS NULL THEN
      RAISE EXCEPTION 'Exchange rate not found for %', p_to_currency;
    END IF;
    
    RETURN p_amount / v_rate;
  END IF;
  
  -- If converting to base currency
  IF p_to_currency = v_base_currency THEN
    SELECT rate INTO v_rate
    FROM public.exchange_rates
    WHERE currency_code = p_from_currency
      AND rate_date <= p_date
    ORDER BY rate_date DESC
    LIMIT 1;
    
    IF v_rate IS NULL THEN
      RAISE EXCEPTION 'Exchange rate not found for %', p_from_currency;
    END IF;
    
    RETURN p_amount * v_rate;
  END IF;
  
  -- Cross-currency: convert through base currency
  RETURN public.convert_currency(
    public.convert_currency(p_amount, p_from_currency, v_base_currency, p_date),
    v_base_currency,
    p_to_currency,
    p_date
  );
END;
$$;