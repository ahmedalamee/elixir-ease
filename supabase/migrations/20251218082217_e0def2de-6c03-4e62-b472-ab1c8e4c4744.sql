
BEGIN;

-- =========================================================
-- 1) EMPLOYEE: Isolate salary + national_id into employee_salaries
-- =========================================================

-- 1.1 Create table if not exists
CREATE TABLE IF NOT EXISTS public.employee_salaries (
  employee_id uuid PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  salary numeric NOT NULL DEFAULT 0,
  national_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.2 Backfill from employees only if columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='employees' AND column_name='salary'
  ) THEN
    EXECUTE $q$
      INSERT INTO public.employee_salaries (employee_id, salary, national_id)
      SELECT e.id, COALESCE(e.salary, 0), e.national_id
      FROM public.employees e
      WHERE NOT EXISTS (
        SELECT 1 FROM public.employee_salaries es WHERE es.employee_id = e.id
      )
    $q$;
  END IF;
END $$;

-- 1.3 Remove sensitive columns from employees (if exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='employees' AND column_name='salary'
  ) THEN
    EXECUTE 'ALTER TABLE public.employees DROP COLUMN salary';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='employees' AND column_name='national_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.employees DROP COLUMN national_id';
  END IF;
END $$;

-- 1.4 Enable & force RLS on employee_salaries
ALTER TABLE public.employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salaries FORCE ROW LEVEL SECURITY;

-- 1.5 Drop old policies if exist (idempotent)
DROP POLICY IF EXISTS employee_salaries_hr_only ON public.employee_salaries;
DROP POLICY IF EXISTS employee_salaries_hr_write ON public.employee_salaries;
DROP POLICY IF EXISTS employee_salaries_admin_only ON public.employee_salaries;
DROP POLICY IF EXISTS employee_salaries_admin_write ON public.employee_salaries;

-- 1.6 Create strict policy: ONLY admin can read salaries
CREATE POLICY employee_salaries_admin_only
ON public.employee_salaries
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- 1.7 Write policy for admin only
CREATE POLICY employee_salaries_admin_write
ON public.employee_salaries
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- 1.8 Privileges hardening
REVOKE ALL ON public.employee_salaries FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_salaries TO authenticated;

-- =========================================================
-- 2) CUSTOMERS: Strict RLS + POS view with masked data
-- =========================================================

-- 2.1 Ensure RLS enabled + forced on customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;

-- 2.2 Remove old broad policies
DROP POLICY IF EXISTS customers_cashier_15min ON public.customers;
DROP POLICY IF EXISTS customers_cashier_jit ON public.customers;
DROP POLICY IF EXISTS "Admin and pharmacist can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Cashier read active customers" ON public.customers;
DROP POLICY IF EXISTS "Customer can view own record" ON public.customers;
DROP POLICY IF EXISTS "Admin and pharmacist full access" ON public.customers;
DROP POLICY IF EXISTS customers_admin_accountant_only ON public.customers;
DROP POLICY IF EXISTS customers_self_read ON public.customers;
DROP POLICY IF EXISTS customers_pos_write ON public.customers;
DROP POLICY IF EXISTS customers_pos_update ON public.customers;
DROP POLICY IF EXISTS customers_admin_write ON public.customers;
DROP POLICY IF EXISTS customers_admin_update ON public.customers;

-- 2.3 Create strict select policy: only admin + pharmacist for full access
CREATE POLICY customers_admin_pharmacist_read
ON public.customers
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
);

-- 2.4 Customer can view their own record
CREATE POLICY customers_self_read
ON public.customers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2.5 Write policy for admin/pharmacist
CREATE POLICY customers_admin_pharmacist_insert
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
);

CREATE POLICY customers_admin_pharmacist_update
ON public.customers
FOR UPDATE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
)
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
);

-- 2.6 Privileges hardening on base table
REVOKE ALL ON public.customers FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;

-- 2.7 Create POS-safe view (masked phone, minimal fields)
DROP VIEW IF EXISTS public.customers_pos_view;

CREATE VIEW public.customers_pos_view
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.name,
  CASE
    WHEN c.phone IS NULL OR length(c.phone) < 3 THEN NULL
    ELSE left(c.phone, 3) || '****'
  END AS phone_masked,
  c.loyalty_points
FROM public.customers c
WHERE public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role, 'pharmacist'::app_role]);

-- 2.8 Lock down view access
REVOKE ALL ON public.customers_pos_view FROM PUBLIC;
GRANT SELECT ON public.customers_pos_view TO authenticated;

COMMIT;
