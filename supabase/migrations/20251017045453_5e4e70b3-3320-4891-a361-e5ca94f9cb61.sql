-- ==========================================
-- نظام ERP للصيدليات - البنية الكاملة
-- ==========================================

-- 1) وحدات القياس (UOM) - موسعة
ALTER TABLE public.uoms ADD COLUMN IF NOT EXISTS uom_type uom_type NOT NULL DEFAULT 'quantity';

-- 2) العملات
CREATE TABLE IF NOT EXISTS public.currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  symbol TEXT,
  precision INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) الضرائب
CREATE TABLE IF NOT EXISTS public.taxes (
  tax_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  rate DECIMAL(5,2) NOT NULL,
  is_inclusive BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4) قوائم الأسعار - تحديث
ALTER TABLE public.price_lists ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';

-- 5) المخازن والفروع
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  type TEXT CHECK (type IN ('main', 'branch', 'return', 'quarantine', 'damaged')),
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6) المواقع داخل المخزن (Bins)
CREATE TABLE IF NOT EXISTS public.warehouse_bins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(warehouse_id, code)
);

-- 7) المخزون حسب المخزن
CREATE TABLE IF NOT EXISTS public.warehouse_stock (
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  uom_id UUID REFERENCES public.uoms(id),
  qty_on_hand DECIMAL(15,4) DEFAULT 0,
  qty_reserved DECIMAL(15,4) DEFAULT 0,
  qty_inbound DECIMAL(15,4) DEFAULT 0,
  qty_outbound DECIMAL(15,4) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (warehouse_id, item_id)
);

-- 8) الدُفعات حسب المخزن (FEFO)
CREATE TABLE IF NOT EXISTS public.warehouse_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  lot_no TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  qty_on_hand DECIMAL(15,4) DEFAULT 0,
  qty_reserved DECIMAL(15,4) DEFAULT 0,
  unit_cost DECIMAL(15,4),
  status TEXT CHECK (status IN ('available', 'quarantine', 'expired', 'recalled')) DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(warehouse_id, item_id, lot_no)
);

-- 9) سجل حركات المخزون (Stock Ledger)
CREATE TABLE IF NOT EXISTS public.stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  warehouse_id UUID REFERENCES public.warehouses(id),
  item_id UUID REFERENCES public.products(id),
  batch_id UUID REFERENCES public.warehouse_batches(id),
  ref_type TEXT CHECK (ref_type IN ('po', 'grn', 'pi', 'so', 'si', 'return', 'adjustment', 'count', 'transfer')),
  ref_id UUID,
  qty_in DECIMAL(15,4) DEFAULT 0,
  qty_out DECIMAL(15,4) DEFAULT 0,
  unit_cost DECIMAL(15,4),
  currency TEXT DEFAULT 'SAR',
  cogs_amount DECIMAL(15,4),
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10) قواعد إعادة الطلب
CREATE TABLE IF NOT EXISTS public.reorder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
  min_qty DECIMAL(15,4) NOT NULL,
  reorder_point DECIMAL(15,4) NOT NULL,
  reorder_qty DECIMAL(15,4) NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, warehouse_id)
);

-- 11) أمر الشراء (Purchase Order)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  currency TEXT DEFAULT 'SAR',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  expected_date DATE,
  status TEXT CHECK (status IN ('draft', 'submitted', 'approved', 'partial', 'completed', 'cancelled')) DEFAULT 'draft',
  payment_terms TEXT,
  notes TEXT,
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12) بنود أمر الشراء
CREATE TABLE IF NOT EXISTS public.po_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  item_id UUID REFERENCES public.products(id),
  uom_id UUID REFERENCES public.uoms(id),
  qty_ordered DECIMAL(15,4) NOT NULL,
  qty_received DECIMAL(15,4) DEFAULT 0,
  price DECIMAL(15,4) NOT NULL,
  discount DECIMAL(15,2) DEFAULT 0,
  tax_code TEXT REFERENCES public.taxes(tax_code),
  net_amount DECIMAL(15,2),
  expected_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(po_id, line_no)
);

-- 13) استلام البضاعة (GRN)
CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number TEXT UNIQUE NOT NULL,
  po_id UUID REFERENCES public.purchase_orders(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  received_at TIMESTAMPTZ DEFAULT now(),
  status TEXT CHECK (status IN ('draft', 'posted', 'cancelled')) DEFAULT 'draft',
  documents JSONB,
  notes TEXT,
  created_by UUID,
  posted_by UUID,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14) بنود استلام البضاعة
CREATE TABLE IF NOT EXISTS public.grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  po_item_id UUID REFERENCES public.po_items(id),
  item_id UUID REFERENCES public.products(id),
  uom_id UUID REFERENCES public.uoms(id),
  qty_received DECIMAL(15,4) NOT NULL,
  lot_no TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  unit_cost DECIMAL(15,4),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15) فاتورة الشراء
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_number TEXT UNIQUE NOT NULL,
  supplier_invoice_no TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  currency TEXT DEFAULT 'SAR',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  invoice_date DATE NOT NULL,
  due_date DATE,
  status TEXT CHECK (status IN ('draft', 'posted', 'paid', 'partial', 'cancelled')) DEFAULT 'draft',
  payment_status TEXT CHECK (payment_status IN ('unpaid', 'partial', 'paid')) DEFAULT 'unpaid',
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  attachments JSONB,
  created_by UUID,
  posted_by UUID,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(supplier_id, supplier_invoice_no)
);

-- 16) بنود فاتورة الشراء
CREATE TABLE IF NOT EXISTS public.pi_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id UUID REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  grn_item_id UUID REFERENCES public.grn_items(id),
  item_id UUID REFERENCES public.products(id),
  uom_id UUID REFERENCES public.uoms(id),
  qty DECIMAL(15,4) NOT NULL,
  price DECIMAL(15,4) NOT NULL,
  discount DECIMAL(15,2) DEFAULT 0,
  tax_code TEXT REFERENCES public.taxes(tax_code),
  line_total DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17) أمر البيع (Sales Order)
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  currency TEXT DEFAULT 'SAR',
  order_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT CHECK (status IN ('draft', 'confirmed', 'partial', 'completed', 'cancelled')) DEFAULT 'draft',
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 18) بنود أمر البيع
CREATE TABLE IF NOT EXISTS public.so_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  item_id UUID REFERENCES public.products(id),
  uom_id UUID REFERENCES public.uoms(id),
  qty_ordered DECIMAL(15,4) NOT NULL,
  qty_delivered DECIMAL(15,4) DEFAULT 0,
  price DECIMAL(15,4) NOT NULL,
  discount DECIMAL(15,2) DEFAULT 0,
  tax_code TEXT REFERENCES public.taxes(tax_code),
  line_total DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(so_id, line_no)
);

-- 19) جلسات نقطة البيع
CREATE TABLE IF NOT EXISTS public.pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_number TEXT UNIQUE NOT NULL,
  cashier_id UUID,
  terminal_id TEXT,
  warehouse_id UUID REFERENCES public.warehouses(id),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_cash DECIMAL(15,2) DEFAULT 0,
  closing_cash DECIMAL(15,2),
  expected_cash DECIMAL(15,2),
  difference DECIMAL(15,2),
  status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  totals JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 20) تحديث جدول المبيعات
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS pos_session_id UUID REFERENCES public.pos_sessions(id);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0;

-- 21) الدفعات
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('supplier', 'customer')) NOT NULL,
  entity_id UUID NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank', 'card', 'transfer', 'cheque', 'wallet')) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  amount DECIMAL(15,2) NOT NULL,
  reference TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  posted_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('draft', 'posted', 'cancelled')) DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 22) ربط الدفعات بالفواتير
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  invoice_type TEXT CHECK (invoice_type IN ('purchase', 'sales')) NOT NULL,
  invoice_id UUID NOT NULL,
  allocated_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 23) المرتجعات
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT UNIQUE NOT NULL,
  return_type TEXT CHECK (return_type IN ('purchase', 'sales')) NOT NULL,
  ref_invoice_id UUID NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id),
  return_date DATE DEFAULT CURRENT_DATE,
  reason TEXT,
  status TEXT CHECK (status IN ('draft', 'posted', 'cancelled')) DEFAULT 'draft',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_by UUID,
  posted_by UUID,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 24) بنود المرتجعات
CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.products(id),
  batch_id UUID REFERENCES public.warehouse_batches(id),
  uom_id UUID REFERENCES public.uoms(id),
  qty DECIMAL(15,4) NOT NULL,
  price DECIMAL(15,4),
  reason TEXT,
  disposition TEXT CHECK (disposition IN ('restock', 'quarantine', 'damaged', 'return_to_supplier')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 25) العروض والترويجات
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  scope TEXT CHECK (scope IN ('item', 'category', 'basket')) NOT NULL,
  rule JSONB NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'bogo')) NOT NULL,
  discount_value DECIMAL(15,2),
  active_from TIMESTAMPTZ,
  active_to TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 26) حسابات الولاء
CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) UNIQUE,
  points_balance INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  tier TEXT,
  rules JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 27) حركات الولاء
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.loyalty_accounts(id),
  transaction_type TEXT CHECK (transaction_type IN ('earn', 'redeem', 'expire', 'adjust')) NOT NULL,
  points INTEGER NOT NULL,
  ref_type TEXT,
  ref_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 28) تحديث جداول العملاء
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS price_list_id UUID REFERENCES public.price_lists(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS segment TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_number TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- 29) إدخال بيانات أساسية
INSERT INTO public.currencies (code, name, name_en, symbol, precision) VALUES
  ('SAR', 'ريال سعودي', 'Saudi Riyal', 'ر.س', 2),
  ('USD', 'دولار أمريكي', 'US Dollar', '$', 2),
  ('EUR', 'يورو', 'Euro', '€', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.taxes (tax_code, name, name_en, rate, is_inclusive) VALUES
  ('VAT15', 'ضريبة القيمة المضافة', 'VAT', 15.00, false),
  ('ZERO', 'معفى', 'Zero Rated', 0.00, false)
ON CONFLICT (tax_code) DO NOTHING;

-- 30) إنشاء الفهارس للأداء
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON public.stock_ledger(item_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_warehouse ON public.stock_ledger(warehouse_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_batches_expiry ON public.warehouse_batches(expiry_date) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_warehouse_batches_item ON public.warehouse_batches(item_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_po_items_item ON public.po_items(item_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_entity ON public.payments(entity_type, entity_id);

-- 31) تحديثات على جدول المنتجات
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reorder_level DECIMAL(15,4);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reorder_qty DECIMAL(15,4);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS preferred_supplier_id UUID REFERENCES public.suppliers(id);

-- 32) RLS Policies للجداول الجديدة

-- Warehouses
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All staff read warehouses" ON public.warehouses FOR SELECT 
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role]));
CREATE POLICY "Admin manage warehouses" ON public.warehouses FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Purchase Orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Purchasers and admin read POs" ON public.purchase_orders FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));
CREATE POLICY "Inventory manager create POs" ON public.purchase_orders FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));
CREATE POLICY "Admin approve POs" ON public.purchase_orders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- GRN
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inventory staff read GRN" ON public.goods_receipts FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));
CREATE POLICY "Inventory manager manage GRN" ON public.goods_receipts FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));

-- Stock Ledger (read-only for most, system writes)
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All staff read stock ledger" ON public.stock_ledger FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]));

-- POS Sessions
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cashier manage own sessions" ON public.pos_sessions FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));

-- Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance staff manage payments" ON public.payments FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Returns
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All staff read returns" ON public.returns FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));
CREATE POLICY "Staff manage returns" ON public.returns FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Warehouse Stock
ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All staff read warehouse stock" ON public.warehouse_stock FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role]));

-- Warehouse Batches
ALTER TABLE public.warehouse_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All staff read batches" ON public.warehouse_batches FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role]));

-- Promotions
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All staff read promotions" ON public.promotions FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));
CREATE POLICY "Admin manage promotions" ON public.promotions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Loyalty
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read loyalty" ON public.loyalty_accounts FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));
CREATE POLICY "Staff manage loyalty" ON public.loyalty_accounts FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));