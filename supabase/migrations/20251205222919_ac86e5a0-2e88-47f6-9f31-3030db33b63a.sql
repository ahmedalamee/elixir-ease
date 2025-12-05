-- Add RLS policy to allow authenticated users to create their own customer record
-- This fixes the customer self-registration issue in CustomerAuth.tsx

CREATE POLICY "Users can create own customer record"
ON public.customers
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND NOT EXISTS (
    SELECT 1 FROM public.customers WHERE user_id = auth.uid()
  )
);