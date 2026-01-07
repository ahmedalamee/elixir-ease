-- إنشاء view محدودة للمراجعة (بدون الصور الحساسة)
CREATE OR REPLACE VIEW public.wholesale_requests_summary
WITH (security_invoker = true)
AS
SELECT 
  id,
  request_number,
  company_name,
  company_name_en,
  contact_name,
  phone,
  email,
  city,
  status,
  reviewed_by,
  reviewed_at,
  rejection_reason,
  created_at,
  updated_at
FROM public.wholesale_account_requests
WHERE EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND role = 'admin'
);

-- منح صلاحيات
GRANT SELECT ON public.wholesale_requests_summary TO authenticated;

-- إنشاء جدول لتسجيل الوصول للمستندات الحساسة
CREATE TABLE IF NOT EXISTS public.sensitive_document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_id UUID NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

ALTER TABLE public.sensitive_document_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_access_log_admin_read"
ON public.sensitive_document_access_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "document_access_log_insert"
ON public.sensitive_document_access_log FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- دالة لتسجيل الوصول للمستندات
CREATE OR REPLACE FUNCTION public.log_document_access(
  p_document_type TEXT,
  p_document_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sensitive_document_access_log (user_id, document_type, document_id)
  VALUES (auth.uid(), p_document_type, p_document_id);
END;
$$;