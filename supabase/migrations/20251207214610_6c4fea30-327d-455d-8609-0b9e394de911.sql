-- Drop overly permissive RLS policies on customer_health_records
-- These policies allow any pharmacist to access ALL health records, bypassing the prescription-based restriction

DROP POLICY IF EXISTS "auth_staff_view_health" ON public.customer_health_records;
DROP POLICY IF EXISTS "auth_staff_update_health" ON public.customer_health_records;
DROP POLICY IF EXISTS "Pharmacists and admins can update health records" ON public.customer_health_records;
DROP POLICY IF EXISTS "Pharmacists and admins can insert health records" ON public.customer_health_records;

-- The following policies remain intact (they are correctly restrictive):
-- - "Admin full access to health records" (admin only)
-- - "Pharmacist access for active prescriptions" (7-day prescription check)
-- - "Customers can view own health records" (self-access only)