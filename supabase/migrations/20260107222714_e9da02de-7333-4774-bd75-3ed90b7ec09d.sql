
-- إصلاح سياسات audit logs المتساهلة
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "System can insert customer access logs" ON public.customer_access_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.health_record_audit;
DROP POLICY IF EXISTS "System can insert audit entries" ON public.security_audit_log;

-- إعادة إنشاء سياسات محدودة
CREATE POLICY "audit_log_authenticated_insert" ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "customer_access_log_authenticated_insert" ON public.customer_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "health_record_audit_authenticated_insert" ON public.health_record_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "security_audit_log_authenticated_insert" ON public.security_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
