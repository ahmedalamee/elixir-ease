-- Insert new inventory settings keys
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES 
  ('enable_stock_orders', 'false'::jsonb),
  ('enable_sales_stock_vouchers', 'false'::jsonb),
  ('enable_purchase_stock_vouchers', 'false'::jsonb),
  ('track_by_serial_batch_expiry', 'false'::jsonb),
  ('enable_multi_units', 'false'::jsonb),
  ('inventory_calculation_by_date', 'false'::jsonb),
  ('enable_assemblies_compound_units', 'false'::jsonb),
  ('show_total_available_quantity', 'false'::jsonb),
  ('sales_return_cost_method', '"sales_price"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;