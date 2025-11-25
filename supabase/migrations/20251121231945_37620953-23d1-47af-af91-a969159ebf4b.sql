-- إخفاء Materialized Views من API (مصحح)

CREATE SCHEMA IF NOT EXISTS analytics;

-- نقل Materialized Views (الـ indexes تنتقل معهم تلقائياً)
ALTER MATERIALIZED VIEW public.mv_sales_summary SET SCHEMA analytics;
ALTER MATERIALIZED VIEW public.mv_inventory_summary SET SCHEMA analytics;

-- تحديث دوال التحديث
CREATE OR REPLACE FUNCTION public.refresh_sales_summary()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = analytics, public
AS $$
BEGIN 
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_sales_summary; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.refresh_inventory_summary()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = analytics, public
AS $$
BEGIN 
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_inventory_summary; 
END; 
$$;

-- إنشاء Views آمنة للوصول
DROP VIEW IF EXISTS public.sales_summary_view;
DROP VIEW IF EXISTS public.inventory_summary_view;

CREATE VIEW public.sales_summary_view 
WITH (security_invoker = on) AS
SELECT * FROM analytics.mv_sales_summary;

CREATE VIEW public.inventory_summary_view 
WITH (security_invoker = on) AS
SELECT * FROM analytics.mv_inventory_summary;

-- منح الصلاحيات
GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT SELECT ON analytics.mv_sales_summary TO authenticated;
GRANT SELECT ON analytics.mv_inventory_summary TO authenticated;