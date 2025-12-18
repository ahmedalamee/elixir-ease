
-- Fix: Change record_id column to text type for flexibility
ALTER TABLE public.security_audit_log ALTER COLUMN record_id TYPE text USING record_id::text;

-- Recreate log_salary_access with correct types
CREATE OR REPLACE FUNCTION public.log_salary_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (table_name, record_id, action, changed_by, changed_at, old_data, new_data)
  VALUES (
    'employee_salaries',
    COALESCE(NEW.employee_id, OLD.employee_id)::text,
    TG_OP,
    auth.uid(),
    now(),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
