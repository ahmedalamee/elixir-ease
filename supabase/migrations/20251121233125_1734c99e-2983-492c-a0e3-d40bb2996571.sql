-- =====================================================
-- نظام مرتجعات المبيعات والمشتريات
-- Sales & Purchase Returns System
-- =====================================================

-- جدول مرتجعات المبيعات
CREATE TABLE IF NOT EXISTS public.sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT NOT NULL UNIQUE,
  invoice_id UUID REFERENCES public.sales_invoices(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  return_type TEXT NOT NULL CHECK (return_type IN ('full', 'partial')), -- كامل أو جزئي
  reason TEXT NOT NULL, -- سبب المرتجع
  subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount NUMERIC NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  refund_amount NUMERIC NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
  refund_method TEXT CHECK (refund_method IN ('cash', 'bank_transfer', 'credit_note', 'customer_balance')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  posted_by UUID,
  posted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول بنود مرتجعات المبيعات
CREATE TABLE IF NOT EXISTS public.sales_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  invoice_item_id UUID REFERENCES public.sales_invoice_items(id),
  item_id UUID NOT NULL REFERENCES public.products(id),
  batch_number TEXT,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  discount_amount NUMERIC DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount NUMERIC DEFAULT 0 CHECK (tax_amount >= 0),
  line_total NUMERIC NOT NULL CHECK (line_total >= 0),
  return_reason TEXT,
  condition TEXT CHECK (condition IN ('good', 'damaged', 'expired')), -- حالة المنتج
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول مرتجعات المشتريات
CREATE TABLE IF NOT EXISTS public.purchase_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT NOT NULL UNIQUE,
  purchase_invoice_id UUID REFERENCES public.purchase_invoices(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  return_type TEXT NOT NULL CHECK (return_type IN ('full', 'partial')),
  reason TEXT NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount NUMERIC NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  refund_amount NUMERIC NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
  refund_method TEXT CHECK (refund_method IN ('cash', 'bank_transfer', 'debit_note', 'supplier_balance')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  posted_by UUID,
  posted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول بنود مرتجعات المشتريات
CREATE TABLE IF NOT EXISTS public.purchase_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.products(id),
  batch_number TEXT,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC NOT NULL CHECK (unit_cost >= 0),
  line_total NUMERIC NOT NULL CHECK (line_total >= 0),
  return_reason TEXT,
  condition TEXT CHECK (condition IN ('good', 'damaged', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- نظام التوافق الضريبي مع هيئة الزكاة والضريبة السعودية
-- Saudi ZATCA Tax Compliance System
-- =====================================================

-- جدول الفترات الضريبية
CREATE TABLE IF NOT EXISTS public.tax_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_number TEXT NOT NULL UNIQUE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'submitted')),
  total_sales NUMERIC DEFAULT 0,
  total_purchases NUMERIC DEFAULT 0,
  output_vat NUMERIC DEFAULT 0, -- ضريبة المخرجات
  input_vat NUMERIC DEFAULT 0, -- ضريبة المدخلات
  net_vat NUMERIC DEFAULT 0, -- صافي الضريبة
  adjustments NUMERIC DEFAULT 0,
  amount_due NUMERIC DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول الإقرارات الضريبية
CREATE TABLE IF NOT EXISTS public.vat_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT NOT NULL UNIQUE,
  tax_period_id UUID NOT NULL REFERENCES public.tax_periods(id),
  filing_date DATE NOT NULL,
  
  -- معلومات المبيعات (المخرجات)
  standard_rated_sales NUMERIC DEFAULT 0, -- مبيعات خاضعة للضريبة بنسبة 15%
  zero_rated_sales NUMERIC DEFAULT 0, -- مبيعات معفاة (صفرية)
  exempt_sales NUMERIC DEFAULT 0, -- مبيعات معفاة
  total_sales NUMERIC DEFAULT 0,
  output_vat NUMERIC DEFAULT 0,
  
  -- معلومات المشتريات (المدخلات)
  standard_rated_purchases NUMERIC DEFAULT 0,
  zero_rated_purchases NUMERIC DEFAULT 0,
  exempt_purchases NUMERIC DEFAULT 0,
  total_purchases NUMERIC DEFAULT 0,
  input_vat NUMERIC DEFAULT 0,
  
  -- الضريبة المستحقة
  net_vat NUMERIC DEFAULT 0,
  corrections NUMERIC DEFAULT 0, -- تصحيحات
  amount_due NUMERIC DEFAULT 0,
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submission_reference TEXT, -- رقم مرجعي من الهيئة
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول الفواتير الإلكترونية (ZATCA E-Invoicing)
CREATE TABLE IF NOT EXISTS public.e_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('sales_invoice', 'sales_return', 'purchase_invoice', 'purchase_return')),
  reference_id UUID NOT NULL, -- معرف الفاتورة الأصلية
  invoice_number TEXT NOT NULL,
  
  -- بيانات الفاتورة الإلكترونية
  uuid TEXT NOT NULL UNIQUE, -- UUID الفاتورة الإلكترونية
  invoice_hash TEXT, -- Hash الفاتورة
  qr_code TEXT, -- QR Code
  xml_content TEXT, -- محتوى XML
  pdf_url TEXT, -- رابط PDF
  
  -- حالة الإرسال لهيئة الزكاة
  zatca_status TEXT NOT NULL DEFAULT 'pending' CHECK (zatca_status IN ('pending', 'submitted', 'approved', 'rejected', 'cancelled')),
  zatca_response JSONB, -- استجابة الهيئة
  zatca_reference TEXT, -- الرقم المرجعي من الهيئة
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  
  -- معلومات إضافية
  previous_invoice_hash TEXT, -- Hash الفاتورة السابقة (للترتيب)
  counter_value INTEGER, -- عداد الفواتير
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول تفاصيل الضرائب على مستوى البنود
CREATE TABLE IF NOT EXISTS public.invoice_tax_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_type TEXT NOT NULL,
  invoice_id UUID NOT NULL,
  item_id UUID,
  tax_category TEXT NOT NULL CHECK (tax_category IN ('standard', 'zero', 'exempt')),
  taxable_amount NUMERIC NOT NULL,
  tax_rate NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Indexes للأداء
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sales_returns_invoice ON public.sales_returns(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_customer ON public.sales_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_date ON public.sales_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_sales_returns_status ON public.sales_returns(status);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier ON public.purchase_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_date ON public.purchase_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_status ON public.purchase_returns(status);

CREATE INDEX IF NOT EXISTS idx_tax_periods_dates ON public.tax_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tax_periods_status ON public.tax_periods(status);

CREATE INDEX IF NOT EXISTS idx_vat_returns_period ON public.vat_returns(tax_period_id);
CREATE INDEX IF NOT EXISTS idx_vat_returns_filing_date ON public.vat_returns(filing_date);

CREATE INDEX IF NOT EXISTS idx_e_invoices_reference ON public.e_invoices(reference_id);
CREATE INDEX IF NOT EXISTS idx_e_invoices_type ON public.e_invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_e_invoices_status ON public.e_invoices(zatca_status);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_tax_details ENABLE ROW LEVEL SECURITY;

-- Sales Returns Policies
CREATE POLICY "Staff can manage sales returns" ON public.sales_returns
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Staff can manage sales return items" ON public.sales_return_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.sales_returns sr 
    WHERE sr.id = sales_return_items.return_id 
    AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  ));

-- Purchase Returns Policies
CREATE POLICY "Staff can manage purchase returns" ON public.purchase_returns
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Staff can manage purchase return items" ON public.purchase_return_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.purchase_returns pr 
    WHERE pr.id = purchase_return_items.return_id 
    AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role])
  ));

-- Tax Compliance Policies
CREATE POLICY "Admin and accountants manage tax periods" ON public.tax_periods
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Admin and accountants manage VAT returns" ON public.vat_returns
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Staff can view e-invoices" ON public.e_invoices
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));

CREATE POLICY "Admin can manage e-invoices" ON public.e_invoices
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view tax details" ON public.invoice_tax_details
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));

-- =====================================================
-- Triggers
-- =====================================================

-- منع تعديل المرتجعات المرحلة
CREATE TRIGGER prevent_posted_sales_returns_modification
  BEFORE UPDATE OR DELETE ON public.sales_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_posted_modification();

CREATE TRIGGER prevent_posted_purchase_returns_modification
  BEFORE UPDATE OR DELETE ON public.purchase_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_posted_modification();

-- تحديث updated_at تلقائياً
CREATE TRIGGER update_sales_returns_updated_at
  BEFORE UPDATE ON public.sales_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_returns_updated_at
  BEFORE UPDATE ON public.purchase_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_periods_updated_at
  BEFORE UPDATE ON public.tax_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vat_returns_updated_at
  BEFORE UPDATE ON public.vat_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();