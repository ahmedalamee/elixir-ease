-- Insert default inventory settings if they don't exist
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('allow_negative_stock', 'false', 'السماح بالمخزون السالب'),
  ('enable_advanced_pricing', 'true', 'تفعيل خيارات التسعير المتقدمة'),
  ('track_expiry_dates', 'true', 'تتبع تاريخ الصلاحية'),
  ('track_barcodes', 'true', 'تتبع الباركود'),
  ('enable_multiple_uoms', 'true', 'تفعيل وحدات القياس المتعددة'),
  ('show_stock_alerts', 'true', 'إظهار تنبيهات المخزون'),
  ('low_stock_alert_days', '30', 'عدد الأيام للتنبيه بالمخزون المنخفض'),
  ('expiry_alert_days', '30', 'عدد الأيام للتنبيه بقرب انتهاء الصلاحية'),
  ('default_price_list', '{}', 'قائمة الأسعار الافتراضية'),
  ('inventory_account_id', 'null', 'حساب المخزون الرئيسي')
ON CONFLICT (setting_key) DO NOTHING;