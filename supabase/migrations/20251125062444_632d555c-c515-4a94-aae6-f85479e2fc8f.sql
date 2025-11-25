-- ====================================
-- نظام الصناديق والسندات
-- ====================================

-- 1. جدول الصناديق النقدية
CREATE TABLE IF NOT EXISTS cash_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_code VARCHAR(50) UNIQUE NOT NULL,
  box_name VARCHAR(200) NOT NULL,
  box_name_en VARCHAR(200),
  box_type VARCHAR(50) DEFAULT 'cash' CHECK (box_type IN ('cash', 'bank', 'electronic')),
  currency_code VARCHAR(3) DEFAULT 'YER',
  opening_balance NUMERIC(15,2) DEFAULT 0,
  current_balance NUMERIC(15,2) DEFAULT 0,
  daily_limit NUMERIC(15,2),
  responsible_user_id UUID,
  gl_account_id UUID REFERENCES gl_accounts(id),
  is_active BOOLEAN DEFAULT true,
  is_main BOOLEAN DEFAULT false,
  location VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 2. جدول حركات الصناديق
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number VARCHAR(50) UNIQUE NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cash_box_id UUID NOT NULL REFERENCES cash_boxes(id),
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('receipt', 'payment', 'transfer_in', 'transfer_out', 'opening', 'closing')),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency_code VARCHAR(3) DEFAULT 'YER',
  reference_type VARCHAR(50),
  reference_id UUID,
  reference_number VARCHAR(100),
  description TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'posted', 'cancelled')),
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 3. جدول سندات القبض
CREATE TABLE IF NOT EXISTS cash_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cash_box_id UUID NOT NULL REFERENCES cash_boxes(id),
  received_from VARCHAR(200) NOT NULL,
  customer_id UUID REFERENCES customers(id),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency_code VARCHAR(3) DEFAULT 'YER',
  payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'card')),
  check_number VARCHAR(100),
  check_date DATE,
  bank_name VARCHAR(200),
  description TEXT NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 4. جدول سندات الصرف
CREATE TABLE IF NOT EXISTS cash_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number VARCHAR(50) UNIQUE NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cash_box_id UUID NOT NULL REFERENCES cash_boxes(id),
  paid_to VARCHAR(200) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency_code VARCHAR(3) DEFAULT 'YER',
  payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'card')),
  check_number VARCHAR(100),
  check_date DATE,
  bank_name VARCHAR(200),
  description TEXT NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 5. جدول التحويلات بين الصناديق
CREATE TABLE IF NOT EXISTS cash_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number VARCHAR(50) UNIQUE NOT NULL,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_cash_box_id UUID NOT NULL REFERENCES cash_boxes(id),
  to_cash_box_id UUID NOT NULL REFERENCES cash_boxes(id),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency_code VARCHAR(3) DEFAULT 'YER',
  description TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  CHECK (from_cash_box_id != to_cash_box_id)
);

-- ====================================
-- الفهارس
-- ====================================

CREATE INDEX IF NOT EXISTS idx_cash_boxes_active ON cash_boxes(is_active);
CREATE INDEX IF NOT EXISTS idx_cash_boxes_type ON cash_boxes(box_type);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_box ON cash_transactions(cash_box_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_status ON cash_transactions(status);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_box ON cash_receipts(cash_box_id);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_date ON cash_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_customer ON cash_receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_cash_payments_box ON cash_payments(cash_box_id);
CREATE INDEX IF NOT EXISTS idx_cash_payments_date ON cash_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_cash_payments_supplier ON cash_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_from ON cash_transfers(from_cash_box_id);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_to ON cash_transfers(to_cash_box_id);

-- ====================================
-- RLS Policies
-- ====================================

ALTER TABLE cash_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and cashier read cash_boxes" ON cash_boxes;
CREATE POLICY "Admin and cashier read cash_boxes"
  ON cash_boxes FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role, 'pharmacist'::app_role]));

DROP POLICY IF EXISTS "Admin manage cash_boxes" ON cash_boxes;
CREATE POLICY "Admin manage cash_boxes"
  ON cash_boxes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin and cashier read cash_transactions" ON cash_transactions;
CREATE POLICY "Admin and cashier read cash_transactions"
  ON cash_transactions FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role, 'pharmacist'::app_role]));

DROP POLICY IF EXISTS "Admin and cashier create cash_transactions" ON cash_transactions;
CREATE POLICY "Admin and cashier create cash_transactions"
  ON cash_transactions FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role]));

DROP POLICY IF EXISTS "Admin update cash_transactions" ON cash_transactions;
CREATE POLICY "Admin update cash_transactions"
  ON cash_transactions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin and cashier read cash_receipts" ON cash_receipts;
CREATE POLICY "Admin and cashier read cash_receipts"
  ON cash_receipts FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role, 'pharmacist'::app_role]));

DROP POLICY IF EXISTS "Admin and cashier create cash_receipts" ON cash_receipts;
CREATE POLICY "Admin and cashier create cash_receipts"
  ON cash_receipts FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role]));

DROP POLICY IF EXISTS "Admin update cash_receipts" ON cash_receipts;
CREATE POLICY "Admin update cash_receipts"
  ON cash_receipts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin and cashier read cash_payments" ON cash_payments;
CREATE POLICY "Admin and cashier read cash_payments"
  ON cash_payments FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role, 'pharmacist'::app_role]));

DROP POLICY IF EXISTS "Admin and cashier create cash_payments" ON cash_payments;
CREATE POLICY "Admin and cashier create cash_payments"
  ON cash_payments FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role]));

DROP POLICY IF EXISTS "Admin update cash_payments" ON cash_payments;
CREATE POLICY "Admin update cash_payments"
  ON cash_payments FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin and cashier read cash_transfers" ON cash_transfers;
CREATE POLICY "Admin and cashier read cash_transfers"
  ON cash_transfers FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role]));

DROP POLICY IF EXISTS "Admin and cashier create cash_transfers" ON cash_transfers;
CREATE POLICY "Admin and cashier create cash_transfers"
  ON cash_transfers FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role]));

DROP POLICY IF EXISTS "Admin update cash_transfers" ON cash_transfers;
CREATE POLICY "Admin update cash_transfers"
  ON cash_transfers FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ====================================
-- دوال توليد الأرقام
-- ====================================

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number TEXT;
BEGIN
  SELECT 'RCP-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 5) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  INTO v_number
  FROM cash_receipts
  WHERE receipt_number LIKE 'RCP-%';
  
  RETURN v_number;
END;
$$;

CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number TEXT;
BEGIN
  SELECT 'PAY-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 5) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  INTO v_number
  FROM cash_payments
  WHERE payment_number LIKE 'PAY-%';
  
  RETURN v_number;
END;
$$;

CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number TEXT;
BEGIN
  SELECT 'TRF-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(transfer_number FROM 5) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  INTO v_number
  FROM cash_transfers
  WHERE transfer_number LIKE 'TRF-%';
  
  RETURN v_number;
END;
$$;

-- ====================================
-- دوال ترحيل السندات
-- ====================================

CREATE OR REPLACE FUNCTION post_cash_receipt(p_receipt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt RECORD;
  v_je_id UUID;
  v_je_number TEXT;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role]) THEN
    RAISE EXCEPTION 'غير مصرح لك بترحيل سندات القبض';
  END IF;

  SELECT * INTO v_receipt
  FROM cash_receipts
  WHERE id = p_receipt_id AND status = 'draft';

  IF v_receipt.id IS NULL THEN
    RAISE EXCEPTION 'السند غير موجود أو مرحل مسبقاً';
  END IF;

  UPDATE cash_boxes
  SET current_balance = current_balance + v_receipt.amount,
      updated_at = NOW()
  WHERE id = v_receipt.cash_box_id;

  SELECT 'JE-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  INTO v_je_number
  FROM journal_entries;

  INSERT INTO journal_entries (
    entry_number, entry_date, reference_type, reference_id,
    description, status, created_by, total_debit, total_credit
  ) VALUES (
    v_je_number, v_receipt.receipt_date, 'cash_receipt', p_receipt_id,
    'سند قبض رقم: ' || v_receipt.receipt_number, 'posted',
    auth.uid(), v_receipt.amount, v_receipt.amount
  ) RETURNING id INTO v_je_id;

  INSERT INTO journal_entry_lines (entry_id, line_no, account_id, debit_amount, credit_amount, description)
  SELECT v_je_id, 1,
    (SELECT gl_account_id FROM cash_boxes WHERE id = v_receipt.cash_box_id LIMIT 1),
    v_receipt.amount, 0, 'سند قبض من: ' || v_receipt.received_from;

  IF v_receipt.customer_id IS NOT NULL THEN
    INSERT INTO journal_entry_lines (entry_id, line_no, account_id, debit_amount, credit_amount, description)
    SELECT v_je_id, 2,
      (SELECT id FROM gl_accounts WHERE account_code = '1210' LIMIT 1),
      0, v_receipt.amount, 'سند قبض من: ' || v_receipt.received_from;
  END IF;

  UPDATE cash_receipts
  SET status = 'posted', posted_at = NOW(), posted_by = auth.uid()
  WHERE id = p_receipt_id;

  RETURN jsonb_build_object(
    'success', true,
    'receipt_id', p_receipt_id,
    'journal_entry_id', v_je_id,
    'message', 'تم ترحيل سند القبض بنجاح'
  );
END;
$$;

CREATE OR REPLACE FUNCTION post_cash_payment(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_je_id UUID;
  v_je_number TEXT;
BEGIN
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'cashier'::app_role]) THEN
    RAISE EXCEPTION 'غير مصرح لك بترحيل سندات الصرف';
  END IF;

  SELECT * INTO v_payment
  FROM cash_payments
  WHERE id = p_payment_id AND status = 'draft';

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'السند غير موجود أو مرحل مسبقاً';
  END IF;

  IF (SELECT current_balance FROM cash_boxes WHERE id = v_payment.cash_box_id) < v_payment.amount THEN
    RAISE EXCEPTION 'رصيد الصندوق غير كافٍ';
  END IF;

  UPDATE cash_boxes
  SET current_balance = current_balance - v_payment.amount,
      updated_at = NOW()
  WHERE id = v_payment.cash_box_id;

  SELECT 'JE-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  INTO v_je_number
  FROM journal_entries;

  INSERT INTO journal_entries (
    entry_number, entry_date, reference_type, reference_id,
    description, status, created_by, total_debit, total_credit
  ) VALUES (
    v_je_number, v_payment.payment_date, 'cash_payment', p_payment_id,
    'سند صرف رقم: ' || v_payment.payment_number, 'posted',
    auth.uid(), v_payment.amount, v_payment.amount
  ) RETURNING id INTO v_je_id;

  UPDATE cash_payments
  SET status = 'posted', posted_at = NOW(), posted_by = auth.uid()
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'journal_entry_id', v_je_id,
    'message', 'تم ترحيل سند الصرف بنجاح'
  );
END;
$$;

INSERT INTO currencies (code, name, name_en, symbol, precision, is_active) VALUES
('YER', 'ريال يمني', 'Yemeni Rial', 'ر.ي', 2, true)
ON CONFLICT (code) DO NOTHING;