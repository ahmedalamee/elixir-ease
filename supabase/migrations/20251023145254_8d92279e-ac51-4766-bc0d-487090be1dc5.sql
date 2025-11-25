-- Create UOM templates table
CREATE TABLE IF NOT EXISTS public.uom_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  abbreviation TEXT NOT NULL,
  uom_type TEXT, -- 'weight', 'volume', 'length', 'unit', 'area'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.uom_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin manage uom_templates"
ON public.uom_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read uom_templates"
ON public.uom_templates FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role, 'cashier'::app_role]));

-- Add trigger
CREATE TRIGGER update_uom_templates_updated_at
BEFORE UPDATE ON public.uom_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default UOMs
INSERT INTO public.uom_templates (name, name_en, abbreviation, uom_type) VALUES
('قطعة', 'Piece', 'PC', 'unit'),
('علبة', 'Box', 'BOX', 'unit'),
('كرتون', 'Carton', 'CTN', 'unit'),
('كيلوجرام', 'Kilogram', 'KG', 'weight'),
('جرام', 'Gram', 'G', 'weight'),
('لتر', 'Liter', 'L', 'volume'),
('مللتر', 'Milliliter', 'ML', 'volume')
ON CONFLICT DO NOTHING;