-- إنشاء جدول مراكز التكلفة
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT,
  parent_id UUID REFERENCES public.cost_centers(id),
  manager_id UUID REFERENCES public.employees(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  budget_amount NUMERIC(15,2) DEFAULT 0,
  actual_amount NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء جدول الموازنات التقديرية
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_number TEXT NOT NULL UNIQUE,
  fiscal_year INTEGER NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'closed')),
  total_revenue_budget NUMERIC(15,2) DEFAULT 0,
  total_expense_budget NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء جدول بنود الموازنة
CREATE TABLE IF NOT EXISTS public.budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.gl_accounts(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  budgeted_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(15,2) DEFAULT 0,
  variance NUMERIC(15,2) GENERATED ALWAYS AS (budgeted_amount - actual_amount) STORED,
  variance_percentage NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء جدول الحسابات البنكية
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  iban TEXT,
  swift_code TEXT,
  currency TEXT DEFAULT 'SAR',
  gl_account_id UUID REFERENCES public.gl_accounts(id),
  opening_balance NUMERIC(15,2) DEFAULT 0,
  current_balance NUMERIC(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء جدول تسوية البنوك
CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_number TEXT NOT NULL UNIQUE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
  reconciliation_date DATE NOT NULL,
  statement_balance NUMERIC(15,2) NOT NULL,
  book_balance NUMERIC(15,2) NOT NULL,
  adjusted_balance NUMERIC(15,2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء جدول بنود التسوية البنكية
CREATE TABLE IF NOT EXISTS public.bank_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES public.bank_reconciliations(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_number TEXT,
  debit_amount NUMERIC(15,2) DEFAULT 0,
  credit_amount NUMERIC(15,2) DEFAULT 0,
  is_cleared BOOLEAN DEFAULT false,
  cleared_date DATE,
  item_type TEXT CHECK (item_type IN ('deposit_in_transit', 'outstanding_check', 'bank_charge', 'bank_error', 'book_error')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_cost_centers_code ON public.cost_centers(code);
CREATE INDEX IF NOT EXISTS idx_cost_centers_active ON public.cost_centers(is_active);
CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON public.budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON public.budgets(status);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget_id ON public.budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON public.bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_account ON public.bank_reconciliations(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_date ON public.bank_reconciliations(reconciliation_date);

-- تفعيل RLS
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliation_items ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للمسؤولين والمحاسبين
CREATE POLICY "Admin and accountants manage cost centers" ON public.cost_centers
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Admin and accountants manage budgets" ON public.budgets
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Admin and accountants manage budget lines" ON public.budget_lines
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Admin and accountants manage bank accounts" ON public.bank_accounts
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Admin and accountants manage bank reconciliations" ON public.bank_reconciliations
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Admin and accountants manage reconciliation items" ON public.bank_reconciliation_items
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- دالة لحساب النسب المالية
CREATE OR REPLACE FUNCTION public.calculate_financial_ratios(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_assets NUMERIC := 0;
  v_total_liabilities NUMERIC := 0;
  v_total_equity NUMERIC := 0;
  v_current_assets NUMERIC := 0;
  v_current_liabilities NUMERIC := 0;
  v_inventory NUMERIC := 0;
  v_revenue NUMERIC := 0;
  v_net_profit NUMERIC := 0;
  v_cost_of_goods_sold NUMERIC := 0;
  v_result JSON;
BEGIN
  -- حساب الأصول
  SELECT COALESCE(SUM(
    CASE 
      WHEN ga.account_type IN ('asset', 'current_asset', 'fixed_asset') THEN jel.debit_amount - jel.credit_amount
      ELSE 0
    END
  ), 0) INTO v_total_assets
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.entry_id
  JOIN gl_accounts ga ON ga.id = jel.account_id
  WHERE je.status = 'posted' AND je.entry_date <= p_end_date;

  -- حساب الأصول المتداولة
  SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) INTO v_current_assets
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.entry_id
  JOIN gl_accounts ga ON ga.id = jel.account_id
  WHERE je.status = 'posted' 
    AND je.entry_date <= p_end_date
    AND ga.account_type = 'current_asset';

  -- حساب المخزون
  SELECT COALESCE(SUM(ws.qty_on_hand * COALESCE(p.cost_price, 0)), 0) INTO v_inventory
  FROM warehouse_stock ws
  LEFT JOIN products p ON p.id = ws.item_id;

  -- حساب الخصوم
  SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) INTO v_total_liabilities
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.entry_id
  JOIN gl_accounts ga ON ga.id = jel.account_id
  WHERE je.status = 'posted' 
    AND je.entry_date <= p_end_date
    AND ga.account_type IN ('liability', 'current_liability', 'long_term_liability');

  -- حساب الخصوم المتداولة
  SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) INTO v_current_liabilities
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.entry_id
  JOIN gl_accounts ga ON ga.id = jel.account_id
  WHERE je.status = 'posted' 
    AND je.entry_date <= p_end_date
    AND ga.account_type = 'current_liability';

  -- حساب حقوق الملكية
  SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) INTO v_total_equity
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.entry_id
  JOIN gl_accounts ga ON ga.id = jel.account_id
  WHERE je.status = 'posted' 
    AND je.entry_date <= p_end_date
    AND ga.account_type = 'equity';

  -- حساب الإيرادات
  SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) INTO v_revenue
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.entry_id
  JOIN gl_accounts ga ON ga.id = jel.account_id
  WHERE je.status = 'posted' 
    AND je.entry_date BETWEEN p_start_date AND p_end_date
    AND ga.account_type = 'revenue';

  -- حساب تكلفة البضاعة المباعة
  SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) INTO v_cost_of_goods_sold
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.entry_id
  JOIN gl_accounts ga ON ga.id = jel.account_id
  WHERE je.status = 'posted' 
    AND je.entry_date BETWEEN p_start_date AND p_end_date
    AND ga.account_code LIKE '5%';

  -- حساب صافي الربح
  v_net_profit := v_revenue - v_cost_of_goods_sold;

  -- بناء النتيجة
  v_result := json_build_object(
    'liquidity_ratios', json_build_object(
      'current_ratio', CASE WHEN v_current_liabilities > 0 THEN ROUND((v_current_assets / v_current_liabilities)::numeric, 2) ELSE 0 END,
      'quick_ratio', CASE WHEN v_current_liabilities > 0 THEN ROUND(((v_current_assets - v_inventory) / v_current_liabilities)::numeric, 2) ELSE 0 END,
      'cash_ratio', 0
    ),
    'profitability_ratios', json_build_object(
      'gross_profit_margin', CASE WHEN v_revenue > 0 THEN ROUND(((v_revenue - v_cost_of_goods_sold) / v_revenue * 100)::numeric, 2) ELSE 0 END,
      'net_profit_margin', CASE WHEN v_revenue > 0 THEN ROUND((v_net_profit / v_revenue * 100)::numeric, 2) ELSE 0 END,
      'return_on_assets', CASE WHEN v_total_assets > 0 THEN ROUND((v_net_profit / v_total_assets * 100)::numeric, 2) ELSE 0 END,
      'return_on_equity', CASE WHEN v_total_equity > 0 THEN ROUND((v_net_profit / v_total_equity * 100)::numeric, 2) ELSE 0 END
    ),
    'leverage_ratios', json_build_object(
      'debt_ratio', CASE WHEN v_total_assets > 0 THEN ROUND((v_total_liabilities / v_total_assets * 100)::numeric, 2) ELSE 0 END,
      'debt_to_equity', CASE WHEN v_total_equity > 0 THEN ROUND((v_total_liabilities / v_total_equity)::numeric, 2) ELSE 0 END,
      'equity_ratio', CASE WHEN v_total_assets > 0 THEN ROUND((v_total_equity / v_total_assets * 100)::numeric, 2) ELSE 0 END
    ),
    'raw_data', json_build_object(
      'total_assets', v_total_assets,
      'current_assets', v_current_assets,
      'inventory', v_inventory,
      'total_liabilities', v_total_liabilities,
      'current_liabilities', v_current_liabilities,
      'total_equity', v_total_equity,
      'revenue', v_revenue,
      'cost_of_goods_sold', v_cost_of_goods_sold,
      'net_profit', v_net_profit
    )
  );

  RETURN v_result;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION public.calculate_financial_ratios TO authenticated;