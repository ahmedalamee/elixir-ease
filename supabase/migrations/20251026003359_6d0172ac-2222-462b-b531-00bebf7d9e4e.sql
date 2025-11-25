-- Create insurance_companies table
CREATE TABLE IF NOT EXISTS public.insurance_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  code TEXT UNIQUE NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  website TEXT,
  tax_number TEXT,
  credit_limit NUMERIC DEFAULT 0,
  payment_terms TEXT,
  discount_percentage NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  code TEXT UNIQUE NOT NULL,
  method_type TEXT NOT NULL CHECK (method_type IN ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'mobile_payment', 'insurance', 'check', 'other')),
  account_id UUID REFERENCES public.gl_accounts(id),
  is_active BOOLEAN DEFAULT true,
  requires_reference BOOLEAN DEFAULT false,
  max_transaction_amount NUMERIC,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add currency link to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'SAR' REFERENCES public.currencies(code);

-- Create customer_insurance table for linking customers with insurance
CREATE TABLE IF NOT EXISTS public.customer_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  insurance_company_id UUID NOT NULL REFERENCES public.insurance_companies(id) ON DELETE CASCADE,
  policy_number TEXT NOT NULL,
  coverage_percentage NUMERIC DEFAULT 100,
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, insurance_company_id, policy_number)
);

-- Enable RLS
ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_insurance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insurance_companies
CREATE POLICY "Admin and pharmacist manage insurance companies"
ON public.insurance_companies FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'pharmacist'::app_role));

CREATE POLICY "All staff read insurance companies"
ON public.insurance_companies FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));

-- RLS Policies for payment_methods
CREATE POLICY "Admin manage payment methods"
ON public.payment_methods FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All staff read payment methods"
ON public.payment_methods FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));

-- RLS Policies for customer_insurance
CREATE POLICY "Admin and pharmacist manage customer insurance"
ON public.customer_insurance FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'pharmacist'::app_role));

CREATE POLICY "All staff read customer insurance"
ON public.customer_insurance FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_insurance_companies_code ON public.insurance_companies(code);
CREATE INDEX IF NOT EXISTS idx_insurance_companies_active ON public.insurance_companies(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_code ON public.payment_methods(code);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON public.payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_customer_insurance_customer ON public.customer_insurance(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_insurance_company ON public.customer_insurance(insurance_company_id);
CREATE INDEX IF NOT EXISTS idx_customers_currency ON public.customers(currency_code);

-- Create triggers for updated_at
CREATE TRIGGER update_insurance_companies_updated_at
  BEFORE UPDATE ON public.insurance_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_insurance_updated_at
  BEFORE UPDATE ON public.customer_insurance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default payment methods
INSERT INTO public.payment_methods (name, name_en, code, method_type, requires_reference) VALUES
('نقدي', 'Cash', 'CASH', 'cash', false),
('بطاقة ائتمانية', 'Credit Card', 'CREDIT', 'credit_card', true),
('بطاقة مدينة', 'Debit Card', 'DEBIT', 'debit_card', true),
('تحويل بنكي', 'Bank Transfer', 'BANK', 'bank_transfer', true),
('تأمين', 'Insurance', 'INSURANCE', 'insurance', true),
('شيك', 'Check', 'CHECK', 'check', true)
ON CONFLICT (code) DO NOTHING;