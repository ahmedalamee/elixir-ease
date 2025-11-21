-- إصلاح التحذيرات الأمنية

-- 1. إضافة search_path للدوال
CREATE OR REPLACE FUNCTION public.refresh_sales_summary()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN 
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_sales_summary; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.refresh_inventory_summary()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN 
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_inventory_summary; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.encrypt_data(data TEXT, key TEXT DEFAULT 'default_key')
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN 
  RETURN encode(pgp_sym_encrypt(data, key), 'base64'); 
END; 
$$;

CREATE OR REPLACE FUNCTION public.decrypt_data(encrypted TEXT, key TEXT DEFAULT 'default_key')
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN 
  RETURN pgp_sym_decrypt(decode(encrypted, 'base64'), key);
EXCEPTION 
  WHEN OTHERS THEN RETURN NULL; 
END; 
$$;

-- 2. تفعيل RLS على Materialized Views
ALTER MATERIALIZED VIEW public.mv_sales_summary OWNER TO postgres;
ALTER MATERIALIZED VIEW public.mv_inventory_summary OWNER TO postgres;

-- إنشاء جدول view لحماية Materialized Views
CREATE OR REPLACE VIEW public.sales_summary_view AS
SELECT * FROM public.mv_sales_summary;

CREATE OR REPLACE VIEW public.inventory_summary_view AS
SELECT * FROM public.mv_inventory_summary;

-- تفعيل RLS على Views
ALTER VIEW public.sales_summary_view SET (security_invoker = on);
ALTER VIEW public.inventory_summary_view SET (security_invoker = on);