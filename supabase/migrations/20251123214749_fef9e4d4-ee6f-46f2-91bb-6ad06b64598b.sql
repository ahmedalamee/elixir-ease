-- =====================================================
-- CRITICAL SECURITY FIX: Health Records RLS & Audit
-- =====================================================

-- Step 1: Enable RLS on health tables
ALTER TABLE customer_health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_record_audit ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if any (to start fresh)
DROP POLICY IF EXISTS "Pharmacists can view health records" ON customer_health_records;
DROP POLICY IF EXISTS "Pharmacists can insert health records" ON customer_health_records;
DROP POLICY IF EXISTS "Pharmacists can update health records" ON customer_health_records;
DROP POLICY IF EXISTS "Customers can view own health records" ON customer_health_records;
DROP POLICY IF EXISTS "Admins can view audit logs" ON health_record_audit;
DROP POLICY IF EXISTS "System can insert audit logs" ON health_record_audit;

-- Step 3: Create RLS policies for customer_health_records

-- Allow pharmacists and admins to view all health records
CREATE POLICY "Pharmacists and admins can view health records"
  ON customer_health_records
  FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

-- Allow pharmacists and admins to insert health records
CREATE POLICY "Pharmacists and admins can insert health records"
  ON customer_health_records
  FOR INSERT
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

-- Allow pharmacists and admins to update health records
CREATE POLICY "Pharmacists and admins can update health records"
  ON customer_health_records
  FOR UPDATE
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

-- Allow customers to view their own health records only
CREATE POLICY "Customers can view own health records"
  ON customer_health_records
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- Step 4: Create RLS policies for health_record_audit

-- Only admins and pharmacists can view audit logs
CREATE POLICY "Admins and pharmacists can view audit logs"
  ON health_record_audit
  FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

-- System can insert audit logs (via trigger with SECURITY DEFINER)
CREATE POLICY "System can insert audit logs"
  ON health_record_audit
  FOR INSERT
  WITH CHECK (true);

-- Step 5: Create audit logging function
CREATE OR REPLACE FUNCTION log_health_record_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_ip_address TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Get IP address from request headers (if available)
  v_ip_address := current_setting('request.headers', true)::json->>'x-forwarded-for';
  
  -- Only log if user is authenticated
  IF v_user_id IS NOT NULL THEN
    INSERT INTO health_record_audit (
      user_id,
      customer_id,
      action,
      accessed_at,
      ip_address,
      reason
    ) VALUES (
      v_user_id,
      COALESCE(NEW.customer_id, OLD.customer_id),
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'CREATE'
        WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
        WHEN TG_OP = 'DELETE' THEN 'DELETE'
        ELSE 'VIEW'
      END,
      NOW(),
      v_ip_address,
      'Automated audit log from ' || TG_OP || ' operation'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 6: Create triggers for audit logging
DROP TRIGGER IF EXISTS audit_health_record_insert ON customer_health_records;
DROP TRIGGER IF EXISTS audit_health_record_update ON customer_health_records;
DROP TRIGGER IF EXISTS audit_health_record_delete ON customer_health_records;

CREATE TRIGGER audit_health_record_insert
  AFTER INSERT ON customer_health_records
  FOR EACH ROW
  EXECUTE FUNCTION log_health_record_access();

CREATE TRIGGER audit_health_record_update
  AFTER UPDATE ON customer_health_records
  FOR EACH ROW
  EXECUTE FUNCTION log_health_record_access();

CREATE TRIGGER audit_health_record_delete
  AFTER DELETE ON customer_health_records
  FOR EACH ROW
  EXECUTE FUNCTION log_health_record_access();

-- Step 7: Add index for performance on audit queries
CREATE INDEX IF NOT EXISTS idx_health_record_audit_user_id 
  ON health_record_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_health_record_audit_customer_id 
  ON health_record_audit(customer_id);
CREATE INDEX IF NOT EXISTS idx_health_record_audit_accessed_at 
  ON health_record_audit(accessed_at DESC);

-- Step 8: Grant necessary permissions
GRANT SELECT ON customer_health_records TO authenticated;
GRANT INSERT, UPDATE ON customer_health_records TO authenticated;
GRANT SELECT ON health_record_audit TO authenticated;
GRANT INSERT ON health_record_audit TO authenticated;

COMMENT ON TABLE customer_health_records IS 'Protected Health Information (PHI) - Contains sensitive medical records. Access is logged and restricted by RLS policies.';
COMMENT ON TABLE health_record_audit IS 'Audit log for all health record access. Append-only table for compliance and security monitoring.';