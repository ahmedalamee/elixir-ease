-- Fix function search_path for security
CREATE OR REPLACE FUNCTION public.generate_ecommerce_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.ecommerce_orders
  WHERE order_number LIKE 'EC-%';
  
  new_number := 'EC-' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.generate_wholesale_request_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 4) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.wholesale_account_requests
  WHERE request_number LIKE 'WR-%';
  
  new_number := 'WR-' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;