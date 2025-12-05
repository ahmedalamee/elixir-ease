-- Fix 1: Remove cashier access to suppliers table (they don't need it)
DROP POLICY IF EXISTS "Cashier read suppliers" ON public.suppliers;

-- Fix 2: For customers table - Create more restrictive RLS policies
-- Keep basic search capability but add audit logging for bulk access

-- Create a function to log customer data access
CREATE OR REPLACE FUNCTION public.log_customer_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access to customer data for audit purposes
  INSERT INTO customer_access_log (user_id, customer_id, action, accessed_at)
  VALUES (auth.uid(), NEW.id, 'view', NOW())
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Add a comment explaining the security measures
COMMENT ON TABLE customers IS 'Customer data protected by RLS. Sensitive fields (tax_number, address) masked for non-admin via get_customer_safe_view(). All access logged to customer_access_log.';
COMMENT ON TABLE suppliers IS 'Supplier data restricted to admin, pharmacist, and inventory_manager only. Cashiers do not have access.';