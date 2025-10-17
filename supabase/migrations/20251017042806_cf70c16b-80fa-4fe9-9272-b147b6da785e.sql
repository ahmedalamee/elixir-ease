-- Create ENUMs for product forms and status
CREATE TYPE product_form AS ENUM ('tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'suppository', 'powder', 'solution', 'suspension', 'other');

CREATE TYPE product_status AS ENUM ('active', 'inactive', 'discontinued', 'pending');

CREATE TYPE uom_type AS ENUM ('piece', 'box', 'strip', 'bottle', 'vial', 'tube', 'sachet', 'ampoule', 'carton', 'pack');

-- Create manufacturers table
CREATE TABLE public.manufacturers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  country TEXT,
  contact_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create therapeutic classes table
CREATE TABLE public.therapeutic_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  code TEXT UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create units of measurement table
CREATE TABLE public.uoms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  uom_type uom_type NOT NULL,
  symbol TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create price lists table
CREATE TABLE public.price_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update products table with new fields
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS generic_name TEXT,
  ADD COLUMN IF NOT EXISTS strength TEXT,
  ADD COLUMN IF NOT EXISTS form product_form,
  ADD COLUMN IF NOT EXISTS manufacturer_id UUID REFERENCES public.manufacturers(id),
  ADD COLUMN IF NOT EXISTS therapeutic_class_id UUID REFERENCES public.therapeutic_classes(id),
  ADD COLUMN IF NOT EXISTS base_uom_id UUID REFERENCES public.uoms(id),
  ADD COLUMN IF NOT EXISTS sellable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS storage_conditions JSONB,
  ADD COLUMN IF NOT EXISTS status product_status DEFAULT 'active';

-- Create item UOM table (different units for same product)
CREATE TABLE public.item_uoms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  uom_id UUID NOT NULL REFERENCES public.uoms(id),
  conversion_factor DECIMAL(10, 4) NOT NULL DEFAULT 1,
  is_base BOOLEAN DEFAULT false,
  barcode TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(item_id, uom_id)
);

-- Create item prices table (different prices per price list)
CREATE TABLE public.item_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  uom_id UUID REFERENCES public.uoms(id),
  price DECIMAL(10, 2) NOT NULL,
  min_price DECIMAL(10, 2),
  max_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'SAR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(item_id, price_list_id, uom_id)
);

-- Create item barcodes table (multiple barcodes per product)
CREATE TABLE public.item_barcodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  uom_id UUID REFERENCES public.uoms(id),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(item_id, barcode)
);

-- Create item substitutions table (alternative products)
CREATE TABLE public.item_substitutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alt_item_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(item_id, alt_item_id),
  CHECK (item_id != alt_item_id)
);

-- Create product batches table for FEFO tracking
CREATE TABLE public.product_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  expiry_date DATE NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  is_expired BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, batch_number)
);

-- Create function to check and update expired batches
CREATE OR REPLACE FUNCTION public.check_batch_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_expired := (NEW.expiry_date < CURRENT_DATE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update is_expired on insert/update
CREATE TRIGGER update_batch_expiry
  BEFORE INSERT OR UPDATE ON public.product_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.check_batch_expiry();

-- Enable RLS on all new tables
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapeutic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_uoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for manufacturers
CREATE POLICY "All staff read manufacturers" ON public.manufacturers
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Admin and inventory manager manage manufacturers" ON public.manufacturers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_manager'::app_role));

-- RLS Policies for therapeutic_classes
CREATE POLICY "All staff read therapeutic_classes" ON public.therapeutic_classes
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Admin manage therapeutic_classes" ON public.therapeutic_classes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for uoms
CREATE POLICY "All staff read uoms" ON public.uoms
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Admin manage uoms" ON public.uoms
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for price_lists
CREATE POLICY "All staff read price_lists" ON public.price_lists
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));

CREATE POLICY "Admin manage price_lists" ON public.price_lists
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for item_uoms
CREATE POLICY "All staff read item_uoms" ON public.item_uoms
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Admin and inventory manager manage item_uoms" ON public.item_uoms
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_manager'::app_role));

-- RLS Policies for item_prices
CREATE POLICY "All staff read item_prices" ON public.item_prices
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));

CREATE POLICY "Admin manage item_prices" ON public.item_prices
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for item_barcodes
CREATE POLICY "All staff read item_barcodes" ON public.item_barcodes
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Admin and inventory manager manage item_barcodes" ON public.item_barcodes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_manager'::app_role));

-- RLS Policies for item_substitutions
CREATE POLICY "All staff read item_substitutions" ON public.item_substitutions
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Admin and pharmacist manage item_substitutions" ON public.item_substitutions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'pharmacist'::app_role));

-- RLS Policies for product_batches
CREATE POLICY "All staff read product_batches" ON public.product_batches
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Admin and inventory manager manage product_batches" ON public.product_batches
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_manager'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_manufacturers_updated_at BEFORE UPDATE ON public.manufacturers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_therapeutic_classes_updated_at BEFORE UPDATE ON public.therapeutic_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_price_lists_updated_at BEFORE UPDATE ON public.price_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_item_prices_updated_at BEFORE UPDATE ON public.item_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_batches_updated_at BEFORE UPDATE ON public.product_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default UOMs
INSERT INTO public.uoms (name, name_en, uom_type, symbol) VALUES
  ('قطعة', 'Piece', 'piece', 'pc'),
  ('علبة', 'Box', 'box', 'box'),
  ('شريط', 'Strip', 'strip', 'strip'),
  ('زجاجة', 'Bottle', 'bottle', 'btl'),
  ('قارورة', 'Vial', 'vial', 'vial'),
  ('أنبوب', 'Tube', 'tube', 'tube'),
  ('كيس', 'Sachet', 'sachet', 'sach'),
  ('أمبول', 'Ampoule', 'ampoule', 'amp'),
  ('كرتون', 'Carton', 'carton', 'ctn'),
  ('عبوة', 'Pack', 'pack', 'pack');

-- Insert default price list
INSERT INTO public.price_lists (name, name_en, description, is_default, is_active) VALUES
  ('قائمة الأسعار الافتراضية', 'Default Price List', 'Default pricing for all customers', true, true);

-- Create indexes for better performance
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_manufacturer ON public.products(manufacturer_id);
CREATE INDEX idx_products_therapeutic_class ON public.products(therapeutic_class_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_item_barcodes_barcode ON public.item_barcodes(barcode);
CREATE INDEX idx_product_batches_expiry ON public.product_batches(expiry_date);
CREATE INDEX idx_product_batches_product ON public.product_batches(product_id);
CREATE INDEX idx_item_prices_item ON public.item_prices(item_id);
CREATE INDEX idx_item_uoms_item ON public.item_uoms(item_id);