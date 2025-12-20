-- Create security definer function to check if user already has a customer record
CREATE OR REPLACE FUNCTION public.user_has_customer_record(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM customers WHERE user_id = p_user_id
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Customers can self-register once" ON customers;

-- Recreate without recursion using the security definer function
CREATE POLICY "Customers can self-register once" ON customers
FOR INSERT TO authenticated
WITH CHECK (
  user_id IS NOT NULL 
  AND auth.uid() = user_id 
  AND NOT user_has_customer_record(auth.uid())
);