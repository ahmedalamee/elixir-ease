
-- =============================================
-- Phase 2.1: Complete Auto Posting Functions + Helper View
-- Phase 3: Accounting Periods & Year-End Closing
-- =============================================

-- 1. Create helper view for document GL links (Phase 2.1)
CREATE OR REPLACE VIEW vw_document_gl_links AS
SELECT 
  dge.id,
  dge.document_type,
  dge.document_id,
  dge.document_number,
  dge.document_amount,
  dge.status as link_status,
  dge.error_message,
  dge.created_at as linked_at,
  je.id as journal_entry_id,
  je.entry_no as journal_entry_number,
  je.entry_date,
  je.posting_date,
  je.description as journal_description,
  je.is_posted,
  je.is_reversed,
  je.source_module,
  COALESCE(
    (SELECT SUM(debit) FROM gl_journal_lines WHERE journal_id = je.id), 0
  ) as total_debit,
  COALESCE(
    (SELECT SUM(credit) FROM gl_journal_lines WHERE journal_id = je.id), 0
  ) as total_credit
FROM document_gl_entries dge
LEFT JOIN gl_journal_entries je ON je.id = dge.journal_entry_id
ORDER BY dge.created_at DESC;

-- 2. Create accounting_periods table (Phase 3)
CREATE TABLE IF NOT EXISTS accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name TEXT NOT NULL,
  fiscal_year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT unique_period_dates UNIQUE (fiscal_year, start_date, end_date)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_accounting_periods_fiscal_year ON accounting_periods(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_dates ON accounting_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_closed ON accounting_periods(is_closed);

-- Enable RLS
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounting_periods
CREATE POLICY "Staff can view accounting periods"
ON accounting_periods FOR SELECT
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'inventory_manager']::app_role[])
);

CREATE POLICY "Admin can manage accounting periods"
ON accounting_periods FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Helper function to get open accounting period for a date
CREATE OR REPLACE FUNCTION get_open_accounting_period(p_date DATE)
RETURNS accounting_periods
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM accounting_periods
  WHERE start_date <= p_date
    AND end_date >= p_date
    AND is_closed = false
  LIMIT 1;
$$;

-- 4. Function to validate posting date is in open period
CREATE OR REPLACE FUNCTION validate_posting_period(p_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period accounting_periods;
  v_any_periods_exist BOOLEAN;
BEGIN
  -- Check if any periods are defined
  SELECT EXISTS(SELECT 1 FROM accounting_periods) INTO v_any_periods_exist;
  
  -- If no periods defined, allow posting (initial setup phase)
  IF NOT v_any_periods_exist THEN
    RETURN TRUE;
  END IF;
  
  -- Check for open period containing this date
  SELECT * INTO v_period FROM get_open_accounting_period(p_date);
  
  IF v_period.id IS NULL THEN
    RAISE EXCEPTION 'لا يمكن الترحيل: التاريخ % لا يقع ضمن فترة محاسبية مفتوحة', p_date;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 5. Create close_pos_session_with_gl function
CREATE OR REPLACE FUNCTION close_pos_session_with_gl(p_session_id UUID, p_closing_cash NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_result JSONB;
  v_total_cash NUMERIC := 0;
  v_total_card NUMERIC := 0;
  v_total_tax NUMERIC := 0;
  v_total_cogs NUMERIC := 0;
  v_mapping_cash RECORD;
  v_mapping_card RECORD;
  v_mapping_tax RECORD;
  v_mapping_cogs RECORD;
  v_line_no INTEGER := 0;
BEGIN
  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات إغلاق الجلسة';
  END IF;

  -- Get session details
  SELECT * INTO v_session FROM pos_sessions WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الجلسة غير موجودة';
  END IF;
  
  IF v_session.status = 'closed' THEN
    RAISE EXCEPTION 'الجلسة مغلقة مسبقاً';
  END IF;

  -- Validate posting period
  PERFORM validate_posting_period(v_session.opened_at::DATE);

  -- Calculate totals from POS transactions
  SELECT 
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method IN ('card', 'visa', 'mastercard') THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(tax_amount), 0)
  INTO v_total_cash, v_total_card, v_total_tax
  FROM pos_transactions 
  WHERE session_id = p_session_id AND status = 'completed';

  -- Skip GL if no transactions
  IF v_total_cash + v_total_card = 0 THEN
    UPDATE pos_sessions 
    SET status = 'closed',
        closed_at = NOW(),
        closing_cash = p_closing_cash
    WHERE id = p_session_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'session_id', p_session_id,
      'message', 'تم إغلاق الجلسة بدون حركات'
    );
  END IF;

  -- Get account mappings
  SELECT * INTO v_mapping_cash FROM erp_account_mappings 
  WHERE module = 'pos' AND operation = 'cash_sale' AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_card FROM erp_account_mappings 
  WHERE module = 'pos' AND operation = 'card_sale' AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_tax FROM erp_account_mappings 
  WHERE module = 'pos' AND operation = 'sales_tax' AND is_active = true LIMIT 1;

  -- Generate journal entry number
  v_je_number := (SELECT generate_journal_entry_number());

  -- Create journal entry header
  INSERT INTO gl_journal_entries (
    entry_no, entry_date, posting_date, description,
    source_module, source_document_id, is_posted, is_reversed, created_by
  ) VALUES (
    v_je_number,
    v_session.opened_at::DATE,
    CURRENT_DATE,
    'إغلاق جلسة POS رقم: ' || v_session.session_number,
    'pos',
    p_session_id::TEXT,
    true, false, auth.uid()
  ) RETURNING id INTO v_je_id;

  -- Journal lines
  -- Cash sales (if any)
  IF v_total_cash > 0 AND v_mapping_cash.debit_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_mapping_cash.debit_account_id, v_total_cash, 0, 'مبيعات نقدية POS');
    
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_mapping_cash.credit_account_id, 0, v_total_cash - v_total_tax, 'إيرادات مبيعات POS');
  END IF;

  -- Card sales (if any)
  IF v_total_card > 0 AND v_mapping_card.debit_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_mapping_card.debit_account_id, v_total_card, 0, 'مبيعات بطاقة POS');
    
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_mapping_card.credit_account_id, 0, v_total_card, 'إيرادات مبيعات بطاقة');
  END IF;

  -- Sales tax (if any)
  IF v_total_tax > 0 AND v_mapping_tax.credit_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_mapping_tax.credit_account_id, 0, v_total_tax, 'ضريبة مخرجات POS');
  END IF;

  -- Update session status
  UPDATE pos_sessions 
  SET status = 'closed',
      closed_at = NOW(),
      closing_cash = p_closing_cash
  WHERE id = p_session_id;

  -- Link document to GL
  INSERT INTO document_gl_entries (
    document_type, document_id, document_number, document_amount, journal_entry_id, status
  ) VALUES (
    'pos_session', p_session_id, v_session.session_number, 
    v_total_cash + v_total_card, v_je_id, 'posted'
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'total_cash', v_total_cash,
    'total_card', v_total_card,
    'total_tax', v_total_tax,
    'message', 'تم إغلاق الجلسة وإنشاء القيد المحاسبي بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في إغلاق جلسة POS: %', SQLERRM;
END;
$$;

-- 6. Create post_stock_adjustment function
CREATE OR REPLACE FUNCTION post_stock_adjustment(p_adjustment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adjustment RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_result JSONB;
  v_mapping RECORD;
  v_operation TEXT;
BEGIN
  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'inventory_manager']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات إدارة المخزون';
  END IF;

  -- Get adjustment details
  SELECT * INTO v_adjustment FROM stock_adjustments WHERE id = p_adjustment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'تسوية المخزون غير موجودة';
  END IF;
  
  IF v_adjustment.status = 'posted' THEN
    RAISE EXCEPTION 'التسوية مرحّلة مسبقاً';
  END IF;

  -- Validate posting period
  PERFORM validate_posting_period(v_adjustment.adjustment_date);

  -- Check for existing GL entry
  IF EXISTS (SELECT 1 FROM gl_journal_entries WHERE source_document_id = p_adjustment_id::text AND source_module = 'inventory') THEN
    RAISE EXCEPTION 'تم إنشاء قيد محاسبي لهذه التسوية مسبقاً';
  END IF;

  -- Determine operation based on adjustment type
  IF v_adjustment.adjustment_type = 'in' OR v_adjustment.quantity > 0 THEN
    v_operation := 'stock_adjustment_in';
  ELSE
    v_operation := 'stock_adjustment_out';
  END IF;

  -- Get account mapping
  SELECT * INTO v_mapping FROM erp_account_mappings 
  WHERE module = 'inventory' AND operation = v_operation AND is_active = true LIMIT 1;

  IF v_mapping.debit_account_id IS NULL OR v_mapping.credit_account_id IS NULL THEN
    RAISE EXCEPTION 'ربط الحسابات غير مكوّن للعملية: %', v_operation;
  END IF;

  -- Generate journal entry number
  v_je_number := (SELECT generate_journal_entry_number());

  -- Create journal entry
  INSERT INTO gl_journal_entries (
    entry_no, entry_date, posting_date, description,
    source_module, source_document_id, is_posted, is_reversed, created_by
  ) VALUES (
    v_je_number,
    v_adjustment.adjustment_date,
    CURRENT_DATE,
    'تسوية مخزون رقم: ' || COALESCE(v_adjustment.adjustment_number, p_adjustment_id::text),
    'inventory',
    p_adjustment_id::TEXT,
    true, false, auth.uid()
  ) RETURNING id INTO v_je_id;

  -- Journal lines
  INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
  VALUES 
    (v_je_id, 1, v_mapping.debit_account_id, ABS(v_adjustment.total_value), 0, 'تسوية مخزون - مدين'),
    (v_je_id, 2, v_mapping.credit_account_id, 0, ABS(v_adjustment.total_value), 'تسوية مخزون - دائن');

  -- Update adjustment status
  UPDATE stock_adjustments 
  SET status = 'posted', posted_at = NOW(), posted_by = auth.uid()
  WHERE id = p_adjustment_id;

  -- Link document to GL
  INSERT INTO document_gl_entries (
    document_type, document_id, document_number, document_amount, journal_entry_id, status
  ) VALUES (
    'stock_adjustment', p_adjustment_id, 
    COALESCE(v_adjustment.adjustment_number, p_adjustment_id::text),
    ABS(v_adjustment.total_value), v_je_id, 'posted'
  );

  RETURN jsonb_build_object(
    'success', true,
    'adjustment_id', p_adjustment_id,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'message', 'تم ترحيل تسوية المخزون بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في ترحيل تسوية المخزون: %', SQLERRM;
END;
$$;

-- 7. Create post_customer_receipt function
CREATE OR REPLACE FUNCTION post_customer_receipt(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_mapping RECORD;
BEGIN
  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات التحصيل';
  END IF;

  -- Get payment details
  SELECT cp.*, c.name as customer_name 
  INTO v_payment 
  FROM customer_payments cp
  LEFT JOIN customers c ON c.id = cp.customer_id
  WHERE cp.id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'سند القبض غير موجود';
  END IF;
  
  IF v_payment.status = 'posted' THEN
    RAISE EXCEPTION 'سند القبض مرحّل مسبقاً';
  END IF;

  -- Validate posting period
  PERFORM validate_posting_period(v_payment.payment_date);

  -- Check for existing GL entry
  IF EXISTS (SELECT 1 FROM gl_journal_entries WHERE source_document_id = p_payment_id::text AND source_module = 'payments') THEN
    RAISE EXCEPTION 'تم إنشاء قيد محاسبي لهذا السند مسبقاً';
  END IF;

  -- Get account mapping
  SELECT * INTO v_mapping FROM erp_account_mappings 
  WHERE module = 'payments' AND operation = 'customer_receipt' AND is_active = true LIMIT 1;

  IF v_mapping.debit_account_id IS NULL OR v_mapping.credit_account_id IS NULL THEN
    RAISE EXCEPTION 'ربط الحسابات غير مكوّن لسندات القبض';
  END IF;

  -- Generate journal entry number
  v_je_number := (SELECT generate_journal_entry_number());

  -- Create journal entry
  INSERT INTO gl_journal_entries (
    entry_no, entry_date, posting_date, description,
    source_module, source_document_id, is_posted, is_reversed, created_by
  ) VALUES (
    v_je_number,
    v_payment.payment_date,
    CURRENT_DATE,
    'سند قبض رقم: ' || v_payment.payment_number || ' - ' || COALESCE(v_payment.customer_name, ''),
    'payments',
    p_payment_id::TEXT,
    true, false, auth.uid()
  ) RETURNING id INTO v_je_id;

  -- Journal lines: Debit Cash/Bank, Credit Accounts Receivable
  INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
  VALUES 
    (v_je_id, 1, v_mapping.debit_account_id, v_payment.amount, 0, 'تحصيل من عميل'),
    (v_je_id, 2, v_mapping.credit_account_id, 0, v_payment.amount, 'تخفيض ذمم مدينة');

  -- Update payment status
  UPDATE customer_payments 
  SET status = 'posted'
  WHERE id = p_payment_id;

  -- Link document to GL
  INSERT INTO document_gl_entries (
    document_type, document_id, document_number, document_amount, journal_entry_id, status
  ) VALUES (
    'customer_receipt', p_payment_id, v_payment.payment_number, v_payment.amount, v_je_id, 'posted'
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'amount', v_payment.amount,
    'message', 'تم ترحيل سند القبض بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في ترحيل سند القبض: %', SQLERRM;
END;
$$;

-- 8. Create post_supplier_payment function
CREATE OR REPLACE FUNCTION post_supplier_payment(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_mapping RECORD;
BEGIN
  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'inventory_manager']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات الدفع للموردين';
  END IF;

  -- Get payment details (assuming supplier_payments or cash_payments table)
  SELECT cp.*, s.name as supplier_name 
  INTO v_payment 
  FROM cash_payments cp
  LEFT JOIN suppliers s ON s.id = cp.supplier_id
  WHERE cp.id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'سند الصرف غير موجود';
  END IF;
  
  IF v_payment.status = 'posted' THEN
    RAISE EXCEPTION 'سند الصرف مرحّل مسبقاً';
  END IF;

  -- Validate posting period
  PERFORM validate_posting_period(v_payment.payment_date);

  -- Check for existing GL entry
  IF EXISTS (SELECT 1 FROM gl_journal_entries WHERE source_document_id = p_payment_id::text AND source_module = 'payments') THEN
    RAISE EXCEPTION 'تم إنشاء قيد محاسبي لهذا السند مسبقاً';
  END IF;

  -- Get account mapping
  SELECT * INTO v_mapping FROM erp_account_mappings 
  WHERE module = 'payments' AND operation = 'supplier_payment' AND is_active = true LIMIT 1;

  IF v_mapping.debit_account_id IS NULL OR v_mapping.credit_account_id IS NULL THEN
    RAISE EXCEPTION 'ربط الحسابات غير مكوّن لسندات الصرف';
  END IF;

  -- Generate journal entry number
  v_je_number := (SELECT generate_journal_entry_number());

  -- Create journal entry
  INSERT INTO gl_journal_entries (
    entry_no, entry_date, posting_date, description,
    source_module, source_document_id, is_posted, is_reversed, created_by
  ) VALUES (
    v_je_number,
    v_payment.payment_date,
    CURRENT_DATE,
    'سند صرف رقم: ' || v_payment.payment_number || ' - ' || COALESCE(v_payment.supplier_name, v_payment.paid_to),
    'payments',
    p_payment_id::TEXT,
    true, false, auth.uid()
  ) RETURNING id INTO v_je_id;

  -- Journal lines: Debit Accounts Payable, Credit Cash/Bank
  INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
  VALUES 
    (v_je_id, 1, v_mapping.debit_account_id, v_payment.amount, 0, 'تخفيض ذمم دائنة'),
    (v_je_id, 2, v_mapping.credit_account_id, 0, v_payment.amount, 'صرف نقدي لمورد');

  -- Update payment status
  UPDATE cash_payments 
  SET status = 'posted', posted_at = NOW(), posted_by = auth.uid()
  WHERE id = p_payment_id;

  -- Link document to GL
  INSERT INTO document_gl_entries (
    document_type, document_id, document_number, document_amount, journal_entry_id, status
  ) VALUES (
    'supplier_payment', p_payment_id, v_payment.payment_number, v_payment.amount, v_je_id, 'posted'
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'amount', v_payment.amount,
    'message', 'تم ترحيل سند الصرف بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في ترحيل سند الصرف: %', SQLERRM;
END;
$$;

-- 9. Create post_purchase_return function
CREATE OR REPLACE FUNCTION post_purchase_return(p_return_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_return RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_mapping_return RECORD;
  v_mapping_tax RECORD;
  v_line_no INTEGER := 0;
BEGIN
  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'inventory_manager']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات إدارة المشتريات';
  END IF;

  -- Get return details
  SELECT pr.*, s.name as supplier_name 
  INTO v_return 
  FROM purchase_returns pr
  LEFT JOIN suppliers s ON s.id = pr.supplier_id
  WHERE pr.id = p_return_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'مرتجع المشتريات غير موجود';
  END IF;
  
  IF v_return.status = 'posted' THEN
    RAISE EXCEPTION 'المرتجع مرحّل مسبقاً';
  END IF;

  -- Validate posting period
  PERFORM validate_posting_period(v_return.return_date);

  -- Check for existing GL entry
  IF EXISTS (SELECT 1 FROM gl_journal_entries WHERE source_document_id = p_return_id::text AND source_module = 'purchase_returns') THEN
    RAISE EXCEPTION 'تم إنشاء قيد محاسبي لهذا المرتجع مسبقاً';
  END IF;

  -- Get account mappings
  SELECT * INTO v_mapping_return FROM erp_account_mappings 
  WHERE module = 'purchase_returns' AND operation = 'purchase_return' AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_tax FROM erp_account_mappings 
  WHERE module = 'purchase_returns' AND operation = 'return_tax' AND is_active = true LIMIT 1;

  IF v_mapping_return.debit_account_id IS NULL OR v_mapping_return.credit_account_id IS NULL THEN
    RAISE EXCEPTION 'ربط الحسابات غير مكوّن لمرتجعات المشتريات';
  END IF;

  -- Generate journal entry number
  v_je_number := (SELECT generate_journal_entry_number());

  -- Create journal entry
  INSERT INTO gl_journal_entries (
    entry_no, entry_date, posting_date, description,
    source_module, source_document_id, is_posted, is_reversed, created_by
  ) VALUES (
    v_je_number,
    v_return.return_date,
    CURRENT_DATE,
    'مرتجع مشتريات رقم: ' || v_return.return_number || ' - ' || COALESCE(v_return.supplier_name, ''),
    'purchase_returns',
    p_return_id::TEXT,
    true, false, auth.uid()
  ) RETURNING id INTO v_je_id;

  -- Journal lines
  -- Debit: Accounts Payable (reduce supplier balance)
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
  VALUES (v_je_id, v_line_no, v_mapping_return.debit_account_id, v_return.total_amount, 0, 'تخفيض ذمم دائنة');

  -- Credit: Inventory/Purchases (reduce inventory value)
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
  VALUES (v_je_id, v_line_no, v_mapping_return.credit_account_id, 0, 
    v_return.total_amount - COALESCE(v_return.tax_amount, 0), 'مرتجع مشتريات');

  -- Credit: VAT Input (reverse input tax if any)
  IF COALESCE(v_return.tax_amount, 0) > 0 AND v_mapping_tax.credit_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_mapping_tax.credit_account_id, 0, v_return.tax_amount, 'عكس ضريبة مدخلات');
  END IF;

  -- Update return status
  UPDATE purchase_returns 
  SET status = 'posted', posted_at = NOW(), posted_by = auth.uid()
  WHERE id = p_return_id;

  -- Update supplier balance
  IF v_return.supplier_id IS NOT NULL THEN
    UPDATE suppliers
    SET balance = balance - v_return.total_amount
    WHERE id = v_return.supplier_id;
  END IF;

  -- Link document to GL
  INSERT INTO document_gl_entries (
    document_type, document_id, document_number, document_amount, journal_entry_id, status
  ) VALUES (
    'purchase_return', p_return_id, v_return.return_number, v_return.total_amount, v_je_id, 'posted'
  );

  RETURN jsonb_build_object(
    'success', true,
    'return_id', p_return_id,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'total_amount', v_return.total_amount,
    'message', 'تم ترحيل مرتجع المشتريات بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في ترحيل مرتجع المشتريات: %', SQLERRM;
END;
$$;

-- 10. Update existing posting functions to validate period
-- Update post_sales_invoice
CREATE OR REPLACE FUNCTION post_sales_invoice(p_invoice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_result JSONB;
  v_operation TEXT;
  v_mapping_sale RECORD;
  v_mapping_tax RECORD;
  v_mapping_cogs RECORD;
  v_mapping_discount RECORD;
  v_line_no INTEGER := 0;
  v_net_amount NUMERIC;
  v_cogs_amount NUMERIC := 0;
BEGIN
  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'pharmacist']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات الترحيل';
  END IF;

  -- Get invoice details
  SELECT si.*, c.name as customer_name 
  INTO v_invoice 
  FROM sales_invoices si
  LEFT JOIN customers c ON c.id = si.customer_id
  WHERE si.id = p_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الفاتورة غير موجودة';
  END IF;
  
  IF v_invoice.status = 'posted' THEN
    RAISE EXCEPTION 'الفاتورة مرحّلة مسبقاً';
  END IF;

  -- Validate posting period
  PERFORM validate_posting_period(v_invoice.invoice_date);

  -- Check for existing GL entry
  IF EXISTS (SELECT 1 FROM gl_journal_entries WHERE source_document_id = p_invoice_id::text AND source_module = 'sales') THEN
    RAISE EXCEPTION 'تم إنشاء قيد محاسبي لهذه الفاتورة مسبقاً';
  END IF;

  -- Determine operation type
  IF COALESCE(v_invoice.paid_amount, 0) >= v_invoice.total_amount THEN
    v_operation := 'cash_sale';
  ELSE
    v_operation := 'credit_sale';
  END IF;

  -- Get account mappings
  SELECT * INTO v_mapping_sale FROM erp_account_mappings 
  WHERE module = 'sales' AND operation = v_operation AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_tax FROM erp_account_mappings 
  WHERE module = 'sales' AND operation = 'sales_tax' AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_cogs FROM erp_account_mappings 
  WHERE module = 'sales' AND operation = 'cost_of_goods_sold' AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_discount FROM erp_account_mappings 
  WHERE module = 'sales' AND operation = 'sales_discount' AND is_active = true LIMIT 1;

  IF v_mapping_sale.debit_account_id IS NULL OR v_mapping_sale.credit_account_id IS NULL THEN
    RAISE EXCEPTION 'ربط الحسابات غير مكوّن للعملية: %', v_operation;
  END IF;

  -- Calculate net amount (without tax)
  v_net_amount := v_invoice.total_amount - COALESCE(v_invoice.tax_amount, 0);

  -- Generate journal entry number
  v_je_number := (SELECT generate_journal_entry_number());

  -- Create journal entry header
  INSERT INTO gl_journal_entries (
    entry_no, entry_date, posting_date, description,
    source_module, source_document_id, is_posted, is_reversed, created_by
  ) VALUES (
    v_je_number,
    v_invoice.invoice_date,
    CURRENT_DATE,
    'فاتورة مبيعات رقم: ' || v_invoice.invoice_number || ' - ' || COALESCE(v_invoice.customer_name, 'عميل نقدي'),
    'sales',
    p_invoice_id::TEXT,
    true, false, auth.uid()
  ) RETURNING id INTO v_je_id;

  -- Journal lines
  -- 1. Debit: Cash/Receivables
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
  VALUES (v_je_id, v_line_no, v_mapping_sale.debit_account_id, v_invoice.total_amount, 0, 
    CASE WHEN v_operation = 'cash_sale' THEN 'تحصيل نقدي' ELSE 'ذمم مدينة' END);

  -- 2. Credit: Sales Revenue (net without tax)
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
  VALUES (v_je_id, v_line_no, v_mapping_sale.credit_account_id, 0, v_net_amount, 'إيرادات مبيعات');

  -- 3. Credit: VAT Payable (if any)
  IF COALESCE(v_invoice.tax_amount, 0) > 0 AND v_mapping_tax.credit_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_mapping_tax.credit_account_id, 0, v_invoice.tax_amount, 'ضريبة مخرجات');
  END IF;

  -- 4. Discount (if any)
  IF COALESCE(v_invoice.discount_amount, 0) > 0 AND v_mapping_discount.debit_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_mapping_discount.debit_account_id, v_invoice.discount_amount, 0, 'خصم مبيعات');
  END IF;

  -- Update invoice status
  UPDATE sales_invoices 
  SET status = 'posted', posted_at = NOW(), posted_by = auth.uid()
  WHERE id = p_invoice_id;

  -- Update customer balance (for credit sales)
  IF v_invoice.customer_id IS NOT NULL AND v_operation = 'credit_sale' THEN
    UPDATE customers
    SET balance = balance + v_invoice.total_amount,
        last_transaction_date = v_invoice.invoice_date
    WHERE id = v_invoice.customer_id;
  END IF;

  -- Link document to GL
  INSERT INTO document_gl_entries (
    document_type, document_id, document_number, document_amount, journal_entry_id, status
  ) VALUES (
    'sales_invoice', p_invoice_id, v_invoice.invoice_number, v_invoice.total_amount, v_je_id, 'posted'
  );

  v_result := jsonb_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'message', 'تم ترحيل الفاتورة بنجاح'
  );
  
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في ترحيل الفاتورة: %', SQLERRM;
END;
$$;
