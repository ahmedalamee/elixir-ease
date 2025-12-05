-- Fix RLS policy conflict in customer_health_records table
-- The overly permissive policy "Pharmacists and admins can view health records" 
-- overrides the restrictive "Pharmacist access for active prescriptions" policy

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Pharmacists and admins can view health records" ON public.customer_health_records;

-- Create a new admin-only full access policy
CREATE POLICY "Admins can view all health records"
ON public.customer_health_records
FOR SELECT
USING (
  public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role])
);

-- The existing "Pharmacist access for active prescriptions" policy remains
-- to restrict pharmacist access to only customers with recent prescriptions