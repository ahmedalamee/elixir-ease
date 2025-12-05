-- Fix: Restrict sensitive customer fields from non-admin staff
-- Create a secure view that hides tax_number and address for non-admin users

-- Create a security definer function to get safe customer data
CREATE OR REPLACE FUNCTION public.get_customer_safe_view()
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  email text,
  address text,
  tax_number text,
  credit_limit numeric,
  balance numeric,
  loyalty_points integer,
  currency_code varchar,
  payment_terms text,
  is_active boolean,
  segment text,
  price_list_id uuid,
  last_transaction_date timestamptz,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    -- Only show address to admin
    CASE WHEN is_admin THEN c.address ELSE '***' END as address,
    -- Only show tax_number to admin
    CASE WHEN is_admin THEN c.tax_number ELSE '***' END as tax_number,
    c.credit_limit,
    c.balance,
    c.loyalty_points,
    c.currency_code,
    c.payment_terms,
    c.is_active,
    c.segment,
    c.price_list_id,
    c.last_transaction_date,
    c.user_id,
    c.created_at,
    c.updated_at
  FROM customers c;
END;
$$;

-- Add audit logging for customer data access
CREATE TABLE IF NOT EXISTS public.customer_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  customer_id uuid REFERENCES customers(id),
  action text NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  ip_address text
);

-- Enable RLS on access log
ALTER TABLE public.customer_access_log ENABLE ROW LEVEL SECURITY;

-- Only admin can view access logs
CREATE POLICY "Admin can view customer access logs"
ON public.customer_access_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- System can insert access logs
CREATE POLICY "System can insert customer access logs"
ON public.customer_access_log
FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_customer_access_log_customer ON public.customer_access_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_access_log_user ON public.customer_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_access_log_accessed_at ON public.customer_access_log(accessed_at DESC);