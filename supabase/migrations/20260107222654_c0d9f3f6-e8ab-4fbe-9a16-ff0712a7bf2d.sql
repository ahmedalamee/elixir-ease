
-- إنشاء view آمن للعملاء للكاشير (معلومات محدودة جداً)
DROP VIEW IF EXISTS public.customers_cashier_limited;
CREATE VIEW public.customers_cashier_limited 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  phone
FROM public.customers;

GRANT SELECT ON public.customers_cashier_limited TO authenticated;
