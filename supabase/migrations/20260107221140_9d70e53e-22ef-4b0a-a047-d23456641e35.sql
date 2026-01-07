-- حذف الـ view القديمة وإعادة إنشائها
DROP VIEW IF EXISTS public.safe_employee_details CASCADE;

-- إنشاء view محدثة بدون بيانات اتصال حساسة
CREATE VIEW public.safe_employee_details
WITH (security_invoker = true)
AS
SELECT 
  id,
  employee_code,
  full_name,
  full_name_en,
  job_title,
  department,
  hire_date,
  is_active,
  created_at
FROM public.employees
WHERE has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]);

-- منح صلاحيات
GRANT SELECT ON public.safe_employee_details TO authenticated;

-- إضافة تعليق توثيقي
COMMENT ON VIEW public.safe_employee_details IS 'View للإدارة بدون بيانات اتصال حساسة أو رواتب';

-- دالة آمنة للوصول للرواتب مع تسجيل
CREATE OR REPLACE FUNCTION public.get_employee_salary(p_employee_id UUID)
RETURNS TABLE(salary NUMERIC, national_id_enc BYTEA)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- التحقق من صلاحية admin فقط
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- تسجيل الوصول
  INSERT INTO public.security_audit_log (
    table_name,
    record_id,
    operation,
    changed_by,
    new_data
  ) VALUES (
    'employee_salaries',
    p_employee_id::text,
    'SELECT',
    auth.uid(),
    jsonb_build_object('accessed_via', 'get_employee_salary', 'accessed_at', now())
  );
  
  RETURN QUERY
  SELECT es.salary, es.national_id_enc
  FROM public.employee_salaries es
  WHERE es.employee_id = p_employee_id;
END;
$$;