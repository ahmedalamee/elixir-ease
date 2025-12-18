
-- ============================================================================
-- FIX: Drop problematic trigger before recreating
-- ============================================================================

-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS trg_salary_audit ON public.employee_salaries;
DROP FUNCTION IF EXISTS public.log_salary_access();

-- Recreate the function with correct column reference (employee_id, not id)
CREATE OR REPLACE FUNCTION public.log_salary_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    table_name, record_id, action, changed_by, changed_at, old_data, new_data
  ) VALUES (
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

-- Recreate the trigger
CREATE TRIGGER trg_salary_audit
AFTER INSERT OR UPDATE OR DELETE ON public.employee_salaries
FOR EACH ROW EXECUTE FUNCTION public.log_salary_access();
