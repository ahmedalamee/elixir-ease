-- Create generate_po_number function
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
    v_number TEXT;
BEGIN
    SELECT COUNT(*) + 1 INTO v_count FROM purchase_orders;
    v_number := 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_count::TEXT, 4, '0');
    RETURN v_number;
END;
$$;