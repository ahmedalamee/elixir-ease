
-- =========================================================
-- Security Hardening: Fix Remaining Error-Level Issues
-- =========================================================

-- 2) EMPLOYEE_SALARIES: Drop existing policy first, then recreate
-- =========================================================

DROP POLICY IF EXISTS "employee_salaries_admin_only" ON public.employee_salaries;

-- Only admin can access salary data
CREATE POLICY "employee_salaries_admin_only"
ON public.employee_salaries
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Add audit trigger for salary access
CREATE OR REPLACE FUNCTION public.log_salary_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    table_name, record_id, action, changed_by, changed_at, new_data
  ) VALUES (
    'employee_salaries',
    COALESCE(NEW.id, OLD.id)::text,
    TG_OP,
    auth.uid(),
    now(),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_salary_audit ON public.employee_salaries;
CREATE TRIGGER trg_salary_audit
AFTER INSERT OR UPDATE OR DELETE ON public.employee_salaries
FOR EACH ROW EXECUTE FUNCTION public.log_salary_access();

-- 3) CUSTOMER_HEALTH_RECORDS: Reduce window from 4h to 30min
-- =========================================================

DROP POLICY IF EXISTS "health_records_admin_only" ON public.customer_health_records;
DROP POLICY IF EXISTS "health_records_pharmacist_30min" ON public.customer_health_records;

-- Admin only full access
CREATE POLICY "health_records_admin_only"
ON public.customer_health_records
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Pharmacist: 30 minute window with active prescription only
CREATE POLICY "health_records_pharmacist_30min"
ON public.customer_health_records
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'pharmacist'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.customer_id = customer_health_records.customer_id
      AND p.status IN ('pending', 'dispensing')
      AND p.created_at >= (now() - interval '30 minutes')
  )
);

-- 4) SALES_INVOICES: Drop any remaining and add tightened policies
-- =========================================================

DROP POLICY IF EXISTS "invoices_admin_full" ON public.sales_invoices;
DROP POLICY IF EXISTS "invoices_cashier_current_only" ON public.sales_invoices;
DROP POLICY IF EXISTS "invoices_cashier_insert" ON public.sales_invoices;
DROP POLICY IF EXISTS "invoices_cashier_update_draft" ON public.sales_invoices;
DROP POLICY IF EXISTS "invoices_pharmacist_recent" ON public.sales_invoices;
DROP POLICY IF EXISTS "invoices_pharmacist_insert" ON public.sales_invoices;
DROP POLICY IF EXISTS "invoices_pharmacist_update" ON public.sales_invoices;
DROP POLICY IF EXISTS "invoices_customer_own" ON public.sales_invoices;
DROP POLICY IF EXISTS "invoices_delete_admin_draft" ON public.sales_invoices;

-- Admin: full access
CREATE POLICY "invoices_admin_full"
ON public.sales_invoices
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Cashier: only current transaction (5 min window)
CREATE POLICY "invoices_cashier_current_only"
ON public.sales_invoices
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'cashier'::app_role)
  AND created_by = auth.uid()
  AND created_at >= (now() - interval '5 minutes')
);

CREATE POLICY "invoices_cashier_insert"
ON public.sales_invoices
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'cashier'::app_role)
  AND created_by = auth.uid()
);

CREATE POLICY "invoices_cashier_update_draft"
ON public.sales_invoices
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'cashier'::app_role)
  AND created_by = auth.uid()
  AND status = 'draft'
  AND created_at >= (now() - interval '5 minutes')
);

-- Pharmacist: only recent invoices (30 min) they're involved with
CREATE POLICY "invoices_pharmacist_recent"
ON public.sales_invoices
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'pharmacist'::app_role)
  AND (created_by = auth.uid() OR posted_by = auth.uid())
  AND created_at >= (now() - interval '30 minutes')
);

CREATE POLICY "invoices_pharmacist_insert"
ON public.sales_invoices
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'pharmacist'::app_role));

CREATE POLICY "invoices_pharmacist_update"
ON public.sales_invoices
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'pharmacist'::app_role)
  AND status = 'draft'
  AND created_at >= (now() - interval '30 minutes')
);

-- Customer: view own invoices only
CREATE POLICY "invoices_customer_own"
ON public.sales_invoices
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = sales_invoices.customer_id
      AND c.user_id = auth.uid()
  )
);

-- Delete: admin only, draft only
CREATE POLICY "invoices_delete_admin_draft"
ON public.sales_invoices
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND status = 'draft'
);
