-- ===================================
-- المرحلة 1: الأساس المحاسبي والمستندي
-- ===================================

-- 1. شجرة الحسابات العامة (Chart of Accounts)
CREATE TABLE IF NOT EXISTS public.gl_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_name_en TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'cogs')),
  parent_account_id UUID REFERENCES public.gl_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  is_header BOOLEAN DEFAULT false, -- حساب رئيسي (لا يقبل قيود مباشرة)
  currency TEXT DEFAULT 'SAR',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. اليومية العامة (Journal Entries)
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_date DATE,
  reference_type TEXT, -- نوع المستند المرجعي (PO/GRN/PI/SO/SI/Payment/Receipt/Manual)
  reference_id UUID, -- معرّف المستند المرجعي
  description TEXT,
  total_debit NUMERIC DEFAULT 0,
  total_credit NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. خطوط اليومية (Journal Entry Lines)
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  account_id UUID NOT NULL REFERENCES public.gl_accounts(id),
  description TEXT,
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. قواعد الترقيم المركزية (Document Numbering Rules)
CREATE TABLE IF NOT EXISTS public.document_numbering_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL UNIQUE, -- PO/GRN/PI/SO/SI/Payment/Receipt/JE
  prefix TEXT NOT NULL, -- البادئة مثل PO- أو GRN-
  next_number INTEGER DEFAULT 1,
  number_length INTEGER DEFAULT 6, -- عدد الأرقام (مثل 000001)
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. قواعد الترحيل (Posting Rules)
CREATE TABLE IF NOT EXISTS public.posting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  debit_account_id UUID REFERENCES public.gl_accounts(id),
  credit_account_id UUID REFERENCES public.gl_accounts(id),
  account_type TEXT, -- main/tax/discount/inventory/cogs
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(document_type, account_type)
);

-- ===================================
-- RLS Policies
-- ===================================

-- GL Accounts
ALTER TABLE public.gl_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage gl_accounts"
ON public.gl_accounts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read gl_accounts"
ON public.gl_accounts FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]));

-- Journal Entries
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage journal_entries"
ON public.journal_entries FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read journal_entries"
ON public.journal_entries FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Journal Entry Lines
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage journal_entry_lines"
ON public.journal_entry_lines FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read journal_entry_lines"
ON public.journal_entry_lines FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Document Numbering Rules
ALTER TABLE public.document_numbering_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage document_numbering_rules"
ON public.document_numbering_rules FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read document_numbering_rules"
ON public.document_numbering_rules FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role, 'cashier'::app_role]));

-- Posting Rules
ALTER TABLE public.posting_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage posting_rules"
ON public.posting_rules FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read posting_rules"
ON public.posting_rules FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]));

-- ===================================
-- Triggers
-- ===================================

CREATE TRIGGER update_gl_accounts_updated_at
BEFORE UPDATE ON public.gl_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_numbering_rules_updated_at
BEFORE UPDATE ON public.document_numbering_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posting_rules_updated_at
BEFORE UPDATE ON public.posting_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================
-- إضافة إعدادات المخزون إلى system_settings
-- ===================================

-- إدراج طريقة تقييم المخزون الافتراضية
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('inventory_valuation_method', '"FIFO"'::jsonb, 'طريقة تقييم المخزون: FIFO أو Weighted Average'),
  ('inventory_valuation_locked', 'false'::jsonb, 'هل تم قفل طريقة التقييم بعد بدء الحركات')
ON CONFLICT (setting_key) DO NOTHING;

-- ===================================
-- البيانات الأولية - شجرة الحسابات الأساسية
-- ===================================

INSERT INTO public.gl_accounts (account_code, account_name, account_name_en, account_type, is_header) VALUES
-- الأصول
('1000', 'الأصول', 'Assets', 'asset', true),
('1100', 'الأصول المتداولة', 'Current Assets', 'asset', true),
('1110', 'النقدية وما يعادلها', 'Cash and Cash Equivalents', 'asset', false),
('1120', 'حسابات القبض', 'Accounts Receivable', 'asset', false),
('1130', 'المخزون', 'Inventory', 'asset', false),

-- الخصوم
('2000', 'الخصوم', 'Liabilities', 'liability', true),
('2100', 'الخصوم المتداولة', 'Current Liabilities', 'liability', true),
('2110', 'حسابات الدفع', 'Accounts Payable', 'liability', false),
('2120', 'ضريبة القيمة المضافة - المستحقة', 'VAT Payable', 'liability', false),

-- حقوق الملكية
('3000', 'حقوق الملكية', 'Equity', 'equity', true),
('3100', 'رأس المال', 'Capital', 'equity', false),
('3200', 'الأرباح المحتجزة', 'Retained Earnings', 'equity', false),

-- الإيرادات
('4000', 'الإيرادات', 'Revenue', 'revenue', true),
('4100', 'إيرادات المبيعات', 'Sales Revenue', 'revenue', false),

-- المصروفات
('5000', 'المصروفات', 'Expenses', 'expense', true),
('5100', 'تكلفة البضاعة المباعة', 'Cost of Goods Sold', 'cogs', false),
('5200', 'مصروفات تشغيلية', 'Operating Expenses', 'expense', false)
ON CONFLICT (account_code) DO NOTHING;

-- ===================================
-- البيانات الأولية - قواعد الترقيم
-- ===================================

INSERT INTO public.document_numbering_rules (document_type, prefix, next_number, description) VALUES
('PO', 'PO-', 1, 'أوامر الشراء - Purchase Orders'),
('GRN', 'GRN-', 1, 'إشعارات استلام البضائع - Goods Receipt Notes'),
('PI', 'PI-', 1, 'فواتير المشتريات - Purchase Invoices'),
('SO', 'SO-', 1, 'أوامر المبيعات - Sales Orders'),
('SI', 'SI-', 1, 'فواتير المبيعات - Sales Invoices'),
('PMT', 'PMT-', 1, 'المدفوعات - Payments'),
('RCP', 'RCP-', 1, 'المقبوضات - Receipts'),
('JE', 'JE-', 1, 'قيود اليومية - Journal Entries'),
('RET', 'RET-', 1, 'المرتجعات - Returns')
ON CONFLICT (document_type) DO NOTHING;

-- ===================================
-- البيانات الأولية - قواعد الترحيل الأساسية
-- ===================================

-- قواعد ترحيل فواتير المبيعات (SI)
INSERT INTO public.posting_rules (document_type, rule_name, account_type, description) VALUES
('SI', 'حساب القبض الرئيسي', 'main', 'حسابات القبض (مدين)'),
('SI', 'حساب الإيرادات', 'revenue', 'إيرادات المبيعات (دائن)'),
('SI', 'حساب الضريبة', 'tax', 'ضريبة القيمة المضافة المستحقة (دائن)'),
('SI', 'حساب المخزون', 'inventory', 'المخزون (دائن)'),
('SI', 'حساب تكلفة البضاعة', 'cogs', 'تكلفة البضاعة المباعة (مدين)'),

-- قواعد ترحيل فواتير المشتريات (PI)
('PI', 'حساب الدفع الرئيسي', 'main', 'حسابات الدفع (دائن)'),
('PI', 'حساب المخزون', 'inventory', 'المخزون (مدين)'),
('PI', 'حساب الضريبة', 'tax', 'ضريبة القيمة المضافة القابلة للاسترداد (مدين)')
ON CONFLICT (document_type, account_type) DO NOTHING;