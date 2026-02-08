-- Fix the overly permissive INSERT policy on salary_access_log
-- Only system/triggers should be able to insert, not any authenticated user

DROP POLICY IF EXISTS "salary_access_log_system_insert" ON public.salary_access_log;

-- More restrictive insert policy - only allows inserts from trigger context or admin
CREATE POLICY "salary_access_log_trigger_insert"
ON public.salary_access_log
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow inserts from trigger context (current_setting check)
  current_setting('app.current_function', true) IS NOT NULL
  OR has_role(auth.uid(), 'admin'::app_role)
);