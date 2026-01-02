-- جدول فئات المتجر الإلكتروني
CREATE TABLE public.ecommerce_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.ecommerce_categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول منتجات المتجر الإلكتروني (مرتبطة بالمنتجات الأساسية)
CREATE TABLE public.ecommerce_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.ecommerce_categories(id),
  retail_price DECIMAL(15,2) NOT NULL,
  wholesale_price DECIMAL(15,2),
  description TEXT,
  description_en TEXT,
  images TEXT[],
  is_featured BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  min_wholesale_qty INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول طلبات حسابات الجملة
CREATE TABLE public.wholesale_account_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  company_name_en TEXT,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  commercial_register_number TEXT,
  commercial_register_image TEXT,
  national_id_number TEXT,
  national_id_image TEXT,
  tax_number TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  customer_id UUID REFERENCES public.customers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول طلبات المتجر الإلكتروني
CREATE TABLE public.ecommerce_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  external_order_id TEXT,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT,
  shipping_city TEXT,
  order_type TEXT DEFAULT 'retail' CHECK (order_type IN ('retail', 'wholesale')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partially_paid', 'refunded')),
  payment_method TEXT,
  currency_code TEXT DEFAULT 'YER',
  exchange_rate DECIMAL(15,6) DEFAULT 1,
  subtotal_fc DECIMAL(15,2) DEFAULT 0,
  subtotal_bc DECIMAL(15,2) DEFAULT 0,
  discount_amount_fc DECIMAL(15,2) DEFAULT 0,
  discount_amount_bc DECIMAL(15,2) DEFAULT 0,
  tax_amount_fc DECIMAL(15,2) DEFAULT 0,
  tax_amount_bc DECIMAL(15,2) DEFAULT 0,
  shipping_amount_fc DECIMAL(15,2) DEFAULT 0,
  shipping_amount_bc DECIMAL(15,2) DEFAULT 0,
  total_amount_fc DECIMAL(15,2) DEFAULT 0,
  total_amount_bc DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  internal_notes TEXT,
  source TEXT DEFAULT 'website',
  sales_invoice_id UUID REFERENCES public.sales_invoices(id),
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول بنود طلبات المتجر
CREATE TABLE public.ecommerce_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.ecommerce_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  ecommerce_product_id UUID REFERENCES public.ecommerce_products(id),
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_fc DECIMAL(15,2) NOT NULL,
  unit_price_bc DECIMAL(15,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount_fc DECIMAL(15,2) DEFAULT 0,
  discount_amount_bc DECIMAL(15,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount_fc DECIMAL(15,2) DEFAULT 0,
  tax_amount_bc DECIMAL(15,2) DEFAULT 0,
  line_total_fc DECIMAL(15,2) NOT NULL,
  line_total_bc DECIMAL(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول سجل المزامنة مع المتجر الخارجي
CREATE TABLE public.ecommerce_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('order', 'product', 'customer', 'inventory')),
  external_id TEXT,
  internal_id UUID,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'sync')),
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ecommerce_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_account_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ecommerce_categories
CREATE POLICY "ecommerce_categories_admin_full" ON public.ecommerce_categories
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "ecommerce_categories_read" ON public.ecommerce_categories
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'pharmacist'::app_role) OR has_role(auth.uid(), 'cashier'::app_role));

-- RLS Policies for ecommerce_products
CREATE POLICY "ecommerce_products_admin_full" ON public.ecommerce_products
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "ecommerce_products_read" ON public.ecommerce_products
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'pharmacist'::app_role) OR has_role(auth.uid(), 'cashier'::app_role));

-- RLS Policies for wholesale_account_requests
CREATE POLICY "wholesale_requests_admin_full" ON public.wholesale_account_requests
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ecommerce_orders
CREATE POLICY "ecommerce_orders_admin_full" ON public.ecommerce_orders
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "ecommerce_orders_staff_read" ON public.ecommerce_orders
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'pharmacist'::app_role));

-- RLS Policies for ecommerce_order_items
CREATE POLICY "ecommerce_order_items_admin_full" ON public.ecommerce_order_items
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "ecommerce_order_items_staff_read" ON public.ecommerce_order_items
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'pharmacist'::app_role));

-- RLS Policies for sync log
CREATE POLICY "sync_log_admin_only" ON public.ecommerce_sync_log
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_ecommerce_products_category ON public.ecommerce_products(category_id);
CREATE INDEX idx_ecommerce_products_product ON public.ecommerce_products(product_id);
CREATE INDEX idx_ecommerce_orders_status ON public.ecommerce_orders(status);
CREATE INDEX idx_ecommerce_orders_customer ON public.ecommerce_orders(customer_id);
CREATE INDEX idx_ecommerce_orders_type ON public.ecommerce_orders(order_type);
CREATE INDEX idx_ecommerce_order_items_order ON public.ecommerce_order_items(order_id);
CREATE INDEX idx_wholesale_requests_status ON public.wholesale_account_requests(status);

-- Functions
CREATE OR REPLACE FUNCTION public.generate_ecommerce_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.ecommerce_orders
  WHERE order_number LIKE 'EC-%';
  
  new_number := 'EC-' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_wholesale_request_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 4) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.wholesale_account_requests
  WHERE request_number LIKE 'WR-%';
  
  new_number := 'WR-' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updated_at
CREATE TRIGGER update_ecommerce_categories_updated_at
  BEFORE UPDATE ON public.ecommerce_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ecommerce_products_updated_at
  BEFORE UPDATE ON public.ecommerce_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wholesale_requests_updated_at
  BEFORE UPDATE ON public.wholesale_account_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ecommerce_orders_updated_at
  BEFORE UPDATE ON public.ecommerce_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();