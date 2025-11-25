-- Create system_settings table for general application settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage all settings
CREATE POLICY "Admin manage system_settings"
ON public.system_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated staff can read settings
CREATE POLICY "Staff read system_settings"
ON public.system_settings
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role]));

-- Insert default settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('default_currency', '{"code": "SAR", "symbol": "ر.س"}', 'العملة الافتراضية للنظام'),
('default_tax', '{"tax_code": "VAT", "rate": 15}', 'الضريبة الافتراضية'),
('default_warehouse', '{"warehouse_id": null}', 'المستودع/الفرع الافتراضي'),
('company_info', '{"name": "", "address": "", "phone": "", "email": "", "tax_number": ""}', 'معلومات الشركة')
ON CONFLICT (setting_key) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();