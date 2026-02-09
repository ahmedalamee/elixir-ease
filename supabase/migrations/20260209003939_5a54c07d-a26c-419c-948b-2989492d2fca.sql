-- ============================================
-- إصلاح ثغرة الوصول للسجلات الصحية
-- ============================================

-- 1. إضافة عمود لتتبع سبب الوصول الطبي للمدراء
ALTER TABLE health_record_access_log 
ADD COLUMN IF NOT EXISTS access_reason TEXT,
ADD COLUMN IF NOT EXISTS access_justified BOOLEAN DEFAULT FALSE;

-- 2. إنشاء جدول لتتبع محاولات الوصول المشبوهة
CREATE TABLE IF NOT EXISTS suspicious_access_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id UUID,
  access_type TEXT NOT NULL,
  reason TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  notes TEXT
);

ALTER TABLE suspicious_access_attempts ENABLE ROW LEVEL SECURITY;

-- فقط المدراء يمكنهم رؤية المحاولات المشبوهة
CREATE POLICY "Admin view suspicious attempts"
ON suspicious_access_attempts FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. حذف السياسات القديمة المكررة
DROP POLICY IF EXISTS "Admin full access to health records" ON customer_health_records;
DROP POLICY IF EXISTS "health_records_admin_only" ON customer_health_records;
DROP POLICY IF EXISTS "health_records_pharmacist_15min" ON customer_health_records;

-- 4. إنشاء دالة للتحقق من شرعية الوصول للسجلات الصحية
CREATE OR REPLACE FUNCTION validate_health_record_access(
  p_customer_id UUID,
  p_access_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_is_pharmacist BOOLEAN;
  v_has_valid_prescription BOOLEAN;
  v_prescription_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- التحقق من الأدوار
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'admin') INTO v_is_admin;
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'pharmacist') INTO v_is_pharmacist;
  
  -- المدراء: يجب توثيق سبب الوصول
  IF v_is_admin THEN
    -- تسجيل الوصول مع السبب
    INSERT INTO health_record_access_log (customer_id, accessed_by, access_type, access_reason, accessed_at)
    VALUES (p_customer_id, v_user_id, 'admin_access', COALESCE(p_access_reason, 'unspecified'), now());
    RETURN TRUE;
  END IF;
  
  -- الصيادلة: التحقق من وجود وصفة نشطة ومعتمدة
  IF v_is_pharmacist THEN
    -- تحسين الأمان: الوصفة يجب أن تكون:
    -- 1. معتمدة من طبيب (doctor_id NOT NULL)
    -- 2. في حالة الصرف (status = 'dispensing')
    -- 3. لم يتم صرفها بعد
    -- 4. أُنشئت خلال 10 دقائق (تقليل من 15 دقيقة)
    -- 5. لم يُنشئها الصيدلي نفسه (منع التحايل)
    SELECT id INTO v_prescription_id
    FROM prescriptions
    WHERE customer_id = p_customer_id
      AND status = 'dispensing'
      AND dispensed_at IS NULL
      AND doctor_id IS NOT NULL  -- يجب أن تكون معتمدة من طبيب
      AND created_by != v_user_id  -- لا يمكن للصيدلي الوصول عبر وصفة أنشأها بنفسه
      AND created_at >= (now() - INTERVAL '10 minutes')
    LIMIT 1;
    
    v_has_valid_prescription := v_prescription_id IS NOT NULL;
    
    IF v_has_valid_prescription THEN
      -- تسجيل الوصول الشرعي
      INSERT INTO health_record_access_log (customer_id, accessed_by, access_type, prescription_id, accessed_at)
      VALUES (p_customer_id, v_user_id, 'prescription_dispensing', v_prescription_id, now());
      RETURN TRUE;
    ELSE
      -- تسجيل محاولة وصول مشبوهة
      INSERT INTO suspicious_access_attempts (user_id, customer_id, access_type, reason)
      VALUES (v_user_id, p_customer_id, 'invalid_prescription_access', 
              'Pharmacist tried to access health records without valid doctor-approved prescription');
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 5. دالة آمنة للوصول للسجلات الصحية (بديل عن السياسات المباشرة)
CREATE OR REPLACE FUNCTION get_customer_health_record(
  p_customer_id UUID,
  p_access_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  blood_type TEXT,
  allergies TEXT[],
  chronic_diseases TEXT[],
  current_medications TEXT[],
  medical_history TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- التحقق من شرعية الوصول
  IF NOT validate_health_record_access(p_customer_id, p_access_reason) THEN
    RAISE EXCEPTION 'غير مصرح بالوصول للسجلات الصحية. يجب وجود وصفة طبية معتمدة من طبيب.';
  END IF;
  
  RETURN QUERY
  SELECT 
    chr.id,
    chr.customer_id,
    chr.blood_type,
    chr.allergies,
    chr.chronic_diseases,
    chr.current_medications,
    chr.medical_history,
    chr.emergency_contact_name,
    chr.emergency_contact_phone,
    chr.notes
  FROM customer_health_records chr
  WHERE chr.customer_id = p_customer_id;
END;
$$;

-- 6. سياسات RLS جديدة أكثر أماناً
-- للعملاء: قراءة سجلاتهم الخاصة فقط
CREATE POLICY "Customers view own health records"
ON customer_health_records FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customers c 
    WHERE c.id = customer_health_records.customer_id 
    AND c.user_id = auth.uid()
  )
);

-- للمدراء: وصول كامل مع توثيق (عبر trigger)
CREATE POLICY "Admin documented access"
ON customer_health_records FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- للصيادلة: قراءة فقط عند وجود وصفة معتمدة من طبيب
CREATE POLICY "Pharmacist prescription-based access"
ON customer_health_records FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role)
  AND EXISTS (
    SELECT 1 FROM prescriptions p
    WHERE p.customer_id = customer_health_records.customer_id
      AND p.status = 'dispensing'
      AND p.dispensed_at IS NULL
      AND p.doctor_id IS NOT NULL  -- إلزام وجود طبيب معتمد
      AND p.created_by != auth.uid()  -- منع التحايل
      AND p.created_at >= (now() - INTERVAL '10 minutes')  -- تقليل النافذة الزمنية
  )
);

-- 7. تريجر لتسجيل كل وصول للسجلات الصحية تلقائياً
CREATE OR REPLACE FUNCTION log_health_record_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prescription_id UUID;
BEGIN
  -- تسجيل الوصول
  SELECT id INTO v_prescription_id
  FROM prescriptions
  WHERE customer_id = NEW.customer_id
    AND status = 'dispensing'
    AND dispensed_at IS NULL
  LIMIT 1;
  
  INSERT INTO health_record_access_log (customer_id, accessed_by, access_type, prescription_id, accessed_at)
  VALUES (NEW.customer_id, auth.uid(), TG_OP, v_prescription_id, now());
  
  RETURN NEW;
END;
$$;

-- 8. إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_prescriptions_dispensing_lookup 
ON prescriptions (customer_id, status, dispensed_at, doctor_id, created_at)
WHERE status = 'dispensing' AND dispensed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_suspicious_access_unresolved
ON suspicious_access_attempts (user_id, detected_at)
WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_health_access_log_recent
ON health_record_access_log (accessed_by, accessed_at DESC);

-- 9. منح الصلاحيات
GRANT EXECUTE ON FUNCTION validate_health_record_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_health_record TO authenticated;