
-- =====================================================
-- FIX: Recreate views with correct PostgreSQL 13 syntax
-- =====================================================

-- Drop and recreate with correct syntax for safe_employee_basic
DROP VIEW IF EXISTS safe_employee_basic;
CREATE VIEW safe_employee_basic 
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  employee_code,
  full_name,
  full_name_en,
  phone,
  email,
  hire_date,
  job_title,
  department,
  is_active,
  notes,
  created_at,
  updated_at
FROM employees;

GRANT SELECT ON safe_employee_basic TO authenticated;

-- Drop and recreate cashier_prescription_view with correct syntax
DROP VIEW IF EXISTS cashier_prescription_view;
CREATE VIEW cashier_prescription_view 
WITH (security_invoker = true) AS
SELECT 
  id,
  prescription_number,
  status,
  customer_id
FROM prescriptions
WHERE status IN ('pending', 'dispensed');

GRANT SELECT ON cashier_prescription_view TO authenticated;
