-- Fix RLS policies for employees table to allow INSERT
-- Drop existing conflicting policy if any
DROP POLICY IF EXISTS "Admin full access to employees" ON public.employees;

-- Create separate policies for each operation
CREATE POLICY "Admin can insert employees"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update employees"
ON public.employees
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete employees"
ON public.employees
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can select all employees"
ON public.employees
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));