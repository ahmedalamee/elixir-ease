-- Update get_returnable_sales_invoices to exclude invoices with prevent_return = true
CREATE OR REPLACE FUNCTION public.get_returnable_sales_invoices(p_search TEXT DEFAULT NULL)
RETURNS TABLE (
    invoice_id UUID,
    invoice_number TEXT,
    invoice_date DATE,
    customer_name TEXT,
    total_amount NUMERIC,
    has_returns BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.id AS invoice_id,
        si.invoice_number,
        si.invoice_date::DATE,
        COALESCE(c.name, 'عميل نقدي') AS customer_name,
        si.total_amount,
        EXISTS (SELECT 1 FROM sales_returns sr WHERE sr.invoice_id = si.id) AS has_returns
    FROM sales_invoices si
    LEFT JOIN customers c ON si.customer_id = c.id
    WHERE si.status = 'posted'
      AND COALESCE(si.prevent_return, false) = false  -- Exclude invoices with prevent_return = true
      AND (
          p_search IS NULL 
          OR si.invoice_number ILIKE '%' || p_search || '%'
          OR c.name ILIKE '%' || p_search || '%'
      )
    ORDER BY si.invoice_date DESC, si.invoice_number DESC
    LIMIT 50;
END;
$$;