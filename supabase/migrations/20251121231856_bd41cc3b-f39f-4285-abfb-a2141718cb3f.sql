-- تعزيز الأمان والأداء

-- 1. جدول تتبع الأنشطة
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user ON public.user_activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_log_action ON public.user_activity_log(action_type);

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_view_all_activities"
  ON public.user_activity_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. دالة التتبع
CREATE OR REPLACE FUNCTION public.log_user_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_action TEXT;
BEGIN
  v_action := TG_OP || '_' || TG_TABLE_NAME;
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.user_activity_log (user_id, action_type, table_name, record_id, old_values)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'), v_action, TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSE
    INSERT INTO public.user_activity_log (user_id, action_type, table_name, record_id, old_values, new_values)
    VALUES (COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'), v_action, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$;

-- 3. Triggers للجداول الحساسة
CREATE TRIGGER log_sales_invoices AFTER INSERT OR UPDATE OR DELETE ON public.sales_invoices FOR EACH ROW EXECUTE FUNCTION public.log_user_activity();
CREATE TRIGGER log_customers AFTER INSERT OR UPDATE OR DELETE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.log_user_activity();
CREATE TRIGGER log_health_records AFTER INSERT OR UPDATE OR DELETE ON public.customer_health_records FOR EACH ROW EXECUTE FUNCTION public.log_user_activity();
CREATE TRIGGER log_prescriptions AFTER INSERT OR UPDATE OR DELETE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.log_user_activity();

-- 4. Materialized View للمبيعات
CREATE MATERIALIZED VIEW public.mv_sales_summary AS
SELECT 
  DATE(invoice_date) as sale_date,
  customer_id,
  COUNT(*) as invoice_count,
  SUM(subtotal) as total_subtotal,
  SUM(discount_amount) as total_discount,
  SUM(tax_amount) as total_tax,
  SUM(total_amount) as total_sales
FROM public.sales_invoices
WHERE status = 'posted'
GROUP BY DATE(invoice_date), customer_id;

CREATE UNIQUE INDEX idx_mv_sales_pk ON public.mv_sales_summary(sale_date, customer_id);

-- 5. Materialized View للمخزون
CREATE MATERIALIZED VIEW public.mv_inventory_summary AS
SELECT 
  p.id,
  p.name,
  p.category_id,
  COALESCE(SUM(ws.qty_on_hand), 0) as total_stock,
  COALESCE(SUM(ws.qty_reserved), 0) as total_reserved,
  p.cost_price,
  p.price,
  COALESCE(SUM(ws.qty_on_hand * p.cost_price), 0) as total_cost_value,
  COALESCE(SUM(ws.qty_on_hand * p.price), 0) as total_retail_value
FROM public.products p
LEFT JOIN public.warehouse_stock ws ON ws.item_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.category_id, p.cost_price, p.price;

CREATE UNIQUE INDEX idx_mv_inventory_pk ON public.mv_inventory_summary(id);

-- 6. دوال التحديث
CREATE OR REPLACE FUNCTION public.refresh_sales_summary()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_sales_summary; END; $$;

CREATE OR REPLACE FUNCTION public.refresh_inventory_summary()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_inventory_summary; END; $$;

-- 7. تعزيز RLS
DROP POLICY IF EXISTS "Healthcare professionals can view health records" ON public.customer_health_records;
DROP POLICY IF EXISTS "Healthcare professionals can update health records" ON public.customer_health_records;

CREATE POLICY "auth_staff_view_health" ON public.customer_health_records FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'pharmacist']::app_role[]));

CREATE POLICY "auth_staff_update_health" ON public.customer_health_records FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'pharmacist']::app_role[]));

-- 8. دوال التشفير
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.encrypt_data(data TEXT, key TEXT DEFAULT 'default_key')
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN RETURN encode(pgp_sym_encrypt(data, key), 'base64'); END; $$;

CREATE OR REPLACE FUNCTION public.decrypt_data(encrypted TEXT, key TEXT DEFAULT 'default_key')
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN RETURN pgp_sym_decrypt(decode(encrypted, 'base64'), key);
EXCEPTION WHEN OTHERS THEN RETURN NULL; END; $$;