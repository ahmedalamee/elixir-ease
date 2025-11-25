-- إضافة قواعد الترحيل الافتراضية في posting_rules

-- قواعد فواتير المبيعات
INSERT INTO public.posting_rules (rule_name, document_type, account_type, description, is_active)
VALUES 
  ('Sales Invoice - Receivables', 'sales_invoice', 'receivables', 'حساب المدينون (العملاء) عند إنشاء فاتورة مبيعات', true),
  ('Sales Invoice - Revenue', 'sales_invoice', 'revenue', 'حساب المبيعات (الإيرادات) عند إنشاء فاتورة مبيعات', true),
  ('Sales Invoice - VAT', 'sales_invoice', 'vat_output', 'حساب ضريبة القيمة المضافة - المخرجات', true);

-- قواعد فواتير المشتريات
INSERT INTO public.posting_rules (rule_name, document_type, account_type, description, is_active)
VALUES 
  ('Purchase Invoice - Payables', 'purchase_invoice', 'payables', 'حساب الدائنون (الموردين) عند إنشاء فاتورة مشتريات', true),
  ('Purchase Invoice - Inventory', 'purchase_invoice', 'inventory', 'حساب المخزون عند إنشاء فاتورة مشتريات', true),
  ('Purchase Invoice - VAT', 'purchase_invoice', 'vat_input', 'حساب ضريبة القيمة المضافة - المدخلات', true);

-- قواعد السداد للعملاء
INSERT INTO public.posting_rules (rule_name, document_type, account_type, description, is_active)
VALUES 
  ('Customer Payment - Cash', 'customer_payment', 'cash', 'حساب الصندوق عند استلام دفعة من عميل', true),
  ('Customer Payment - Bank', 'customer_payment', 'bank', 'حساب البنك عند استلام دفعة من عميل', true),
  ('Customer Payment - Receivables', 'customer_payment', 'receivables', 'حساب المدينون عند استلام دفعة من عميل', true);

-- قواعد السداد للموردين
INSERT INTO public.posting_rules (rule_name, document_type, account_type, description, is_active)
VALUES 
  ('Supplier Payment - Cash', 'supplier_payment', 'cash', 'حساب الصندوق عند دفع للمورد', true),
  ('Supplier Payment - Bank', 'supplier_payment', 'bank', 'حساب البنك عند دفع للمورد', true),
  ('Supplier Payment - Payables', 'supplier_payment', 'payables', 'حساب الدائنون عند دفع للمورد', true);

-- قواعد المرتجعات
INSERT INTO public.posting_rules (rule_name, document_type, account_type, description, is_active)
VALUES 
  ('Sales Return - Receivables', 'sales_return', 'receivables', 'حساب المدينون عند مرتجع مبيعات', true),
  ('Sales Return - Revenue', 'sales_return', 'sales_returns', 'حساب مرتجعات المبيعات', true),
  ('Purchase Return - Payables', 'purchase_return', 'payables', 'حساب الدائنون عند مرتجع مشتريات', true),
  ('Purchase Return - Inventory', 'purchase_return', 'inventory', 'حساب المخزون عند مرتجع مشتريات', true);

-- جدول لربط المستندات بالقيود المحاسبية
CREATE TABLE IF NOT EXISTS public.document_gl_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- المستند
  document_type text NOT NULL CHECK (document_type IN (
    'sales_invoice', 'purchase_invoice', 'customer_payment', 
    'supplier_payment', 'sales_return', 'purchase_return',
    'stock_adjustment', 'warehouse_transfer'
  )),
  document_id uuid NOT NULL,
  document_number text NOT NULL,
  
  -- القيد المحاسبي
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  
  -- الحالة
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed', 'reversed')),
  error_message text,
  
  -- المبلغ
  document_amount numeric NOT NULL,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  UNIQUE (document_type, document_id)
);

-- RLS لجدول document_gl_entries
ALTER TABLE public.document_gl_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage document GL entries"
ON public.document_gl_entries FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read document GL entries"
ON public.document_gl_entries FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Index للأداء
CREATE INDEX idx_document_gl_entries_document ON public.document_gl_entries(document_type, document_id);
CREATE INDEX idx_document_gl_entries_journal ON public.document_gl_entries(journal_entry_id);
CREATE INDEX idx_document_gl_entries_status ON public.document_gl_entries(status);

-- Trigger للـ updated_at
CREATE TRIGGER update_document_gl_entries_updated_at
BEFORE UPDATE ON public.document_gl_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();