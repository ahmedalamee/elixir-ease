-- إضافة صناديق نقدية للريال اليمني والريال السعودي

-- جلب حسابات النقدية الموجودة
DO $$
DECLARE
  v_yer_gl_account_id UUID;
  v_sar_gl_account_id UUID;
BEGIN
  -- جلب حساب النقدية بالريال اليمني (إن وجد)
  SELECT id INTO v_yer_gl_account_id FROM gl_accounts 
  WHERE account_code IN ('1110', '1111', '1100') AND account_type = 'asset' LIMIT 1;
  
  -- جلب حساب النقدية بالريال السعودي (إن وجد)
  SELECT id INTO v_sar_gl_account_id FROM gl_accounts 
  WHERE account_code IN ('1112', '1113') AND account_type = 'asset' LIMIT 1;

  -- إنشاء صندوق الريال اليمني
  INSERT INTO cash_boxes (
    box_code, box_name, box_name_en, currency_code, opening_balance, current_balance, 
    is_active, is_main, gl_account_id, notes
  ) VALUES (
    'CB-YER-001', 'صندوق الريال اليمني الرئيسي', 'Main YER Cash Box', 'YER', 
    500000, 500000, true, true, v_yer_gl_account_id, 'الصندوق الرئيسي للريال اليمني'
  ) ON CONFLICT (box_code) DO NOTHING;

  -- إنشاء صندوق الريال السعودي
  INSERT INTO cash_boxes (
    box_code, box_name, box_name_en, currency_code, opening_balance, current_balance, 
    is_active, is_main, gl_account_id, notes
  ) VALUES (
    'CB-SAR-001', 'صندوق الريال السعودي', 'SAR Cash Box', 'SAR', 
    10000, 10000, true, false, v_sar_gl_account_id, 'صندوق الريال السعودي للمعاملات الخارجية'
  ) ON CONFLICT (box_code) DO NOTHING;
END $$;

-- إنشاء جدول سجل المصارفات
CREATE TABLE IF NOT EXISTS cash_box_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_number VARCHAR(50) NOT NULL UNIQUE,
  exchange_date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_cash_box_id UUID NOT NULL REFERENCES cash_boxes(id),
  to_cash_box_id UUID NOT NULL REFERENCES cash_boxes(id),
  from_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
  to_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
  from_amount NUMERIC(18,4) NOT NULL CHECK (from_amount > 0),
  to_amount NUMERIC(18,4) NOT NULL CHECK (to_amount > 0),
  exchange_rate NUMERIC(18,8) NOT NULL CHECK (exchange_rate > 0),
  journal_entry_id UUID REFERENCES gl_journal_entries(id),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  CONSTRAINT different_boxes CHECK (from_cash_box_id <> to_cash_box_id)
);

-- تفعيل RLS
ALTER TABLE cash_box_exchanges ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول
CREATE POLICY "Staff can view exchanges" ON cash_box_exchanges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'pharmacist', 'cashier', 'inventory_manager')
    )
  );

CREATE POLICY "Admin and cashier can insert exchanges" ON cash_box_exchanges
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'cashier')
    )
  );

-- دالة توليد رقم المصارفة
CREATE OR REPLACE FUNCTION generate_exchange_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
  v_number TEXT;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN exchange_number ~ ('^EXC-' || v_year || '-[0-9]+$')
      THEN CAST(SPLIT_PART(exchange_number, '-', 3) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO v_seq
  FROM cash_box_exchanges
  WHERE exchange_number LIKE 'EXC-' || v_year || '-%';
  
  v_number := 'EXC-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
  
  RETURN v_number;
END;
$$;

-- دالة تنفيذ المصارفة مع القيد المحاسبي
CREATE OR REPLACE FUNCTION execute_cash_box_exchange(
  p_from_cash_box_id UUID,
  p_to_cash_box_id UUID,
  p_from_amount NUMERIC,
  p_exchange_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_box RECORD;
  v_to_box RECORD;
  v_exchange_rate NUMERIC;
  v_to_amount NUMERIC;
  v_exchange_id UUID;
  v_exchange_number TEXT;
  v_je_id UUID;
  v_je_number TEXT;
BEGIN
  -- التحقق من الصلاحيات
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'cashier')
  ) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات مسؤول أو أمين صندوق';
  END IF;

  -- جلب بيانات الصندوق المصدر
  SELECT cb.*, c.code as currency, gl.id as gl_id
  INTO v_from_box
  FROM cash_boxes cb
  JOIN currencies c ON c.code = cb.currency_code
  LEFT JOIN gl_accounts gl ON gl.id = cb.gl_account_id
  WHERE cb.id = p_from_cash_box_id AND cb.is_active = true;

  IF v_from_box IS NULL THEN
    RAISE EXCEPTION 'الصندوق المصدر غير موجود أو غير نشط';
  END IF;

  -- جلب بيانات الصندوق الهدف
  SELECT cb.*, c.code as currency, gl.id as gl_id
  INTO v_to_box
  FROM cash_boxes cb
  JOIN currencies c ON c.code = cb.currency_code
  LEFT JOIN gl_accounts gl ON gl.id = cb.gl_account_id
  WHERE cb.id = p_to_cash_box_id AND cb.is_active = true;

  IF v_to_box IS NULL THEN
    RAISE EXCEPTION 'الصندوق الهدف غير موجود أو غير نشط';
  END IF;

  -- التحقق من اختلاف العملات
  IF v_from_box.currency = v_to_box.currency THEN
    RAISE EXCEPTION 'لا يمكن المصارفة بين صندوقين بنفس العملة';
  END IF;

  -- التحقق من كفاية الرصيد
  IF v_from_box.current_balance < p_from_amount THEN
    RAISE EXCEPTION 'الرصيد غير كافٍ في الصندوق المصدر (الرصيد الحالي: %)', v_from_box.current_balance;
  END IF;

  -- جلب سعر الصرف
  v_exchange_rate := get_exchange_rate(v_from_box.currency, v_to_box.currency, p_exchange_date);
  
  IF v_exchange_rate IS NULL OR v_exchange_rate <= 0 THEN
    RAISE EXCEPTION 'سعر الصرف غير متوفر لـ %/% بتاريخ %', v_from_box.currency, v_to_box.currency, p_exchange_date;
  END IF;

  -- حساب المبلغ الهدف
  v_to_amount := p_from_amount * v_exchange_rate;

  -- توليد رقم المصارفة
  v_exchange_number := generate_exchange_number();

  -- توليد رقم القيد
  v_je_number := generate_journal_entry_number();

  -- إنشاء القيد المحاسبي
  INSERT INTO gl_journal_entries (
    entry_no, entry_date, posting_date, description,
    source_module, source_document_id, is_posted, created_by
  ) VALUES (
    v_je_number, p_exchange_date, CURRENT_DATE,
    'مصارفة من ' || v_from_box.box_name || ' إلى ' || v_to_box.box_name || ' - ' || v_exchange_number,
    'cash_exchange', v_exchange_number, true, auth.uid()
  ) RETURNING id INTO v_je_id;

  -- بنود القيد
  -- 1. خصم من الصندوق المصدر (دائن)
  INSERT INTO gl_journal_lines (
    journal_id, line_no, account_id, debit, credit, description,
    currency_code, debit_fc, credit_fc, debit_bc, credit_bc, exchange_rate
  ) VALUES (
    v_je_id, 1, v_from_box.gl_id, 0, 
    CASE WHEN v_from_box.currency = 'YER' THEN p_from_amount ELSE p_from_amount * v_exchange_rate END,
    'مصارفة - ' || v_from_box.box_name,
    v_from_box.currency, 0, p_from_amount, 0,
    CASE WHEN v_from_box.currency = 'YER' THEN p_from_amount ELSE p_from_amount * v_exchange_rate END,
    CASE WHEN v_from_box.currency = 'YER' THEN 1 ELSE v_exchange_rate END
  );

  -- 2. إضافة للصندوق الهدف (مدين)
  INSERT INTO gl_journal_lines (
    journal_id, line_no, account_id, debit, credit, description,
    currency_code, debit_fc, credit_fc, debit_bc, credit_bc, exchange_rate
  ) VALUES (
    v_je_id, 2, v_to_box.gl_id, 
    CASE WHEN v_to_box.currency = 'YER' THEN v_to_amount ELSE v_to_amount / v_exchange_rate END,
    0, 'مصارفة - ' || v_to_box.box_name,
    v_to_box.currency, v_to_amount, 0,
    CASE WHEN v_to_box.currency = 'YER' THEN v_to_amount ELSE v_to_amount / v_exchange_rate END,
    0, CASE WHEN v_to_box.currency = 'YER' THEN 1 ELSE v_exchange_rate END
  );

  -- تحديث أرصدة الصناديق
  UPDATE cash_boxes SET 
    current_balance = current_balance - p_from_amount,
    updated_at = now()
  WHERE id = p_from_cash_box_id;

  UPDATE cash_boxes SET 
    current_balance = current_balance + v_to_amount,
    updated_at = now()
  WHERE id = p_to_cash_box_id;

  -- إنشاء سجل المصارفة
  INSERT INTO cash_box_exchanges (
    exchange_number, exchange_date, from_cash_box_id, to_cash_box_id,
    from_currency, to_currency, from_amount, to_amount, exchange_rate,
    journal_entry_id, notes, status, created_by, posted_at, posted_by
  ) VALUES (
    v_exchange_number, p_exchange_date, p_from_cash_box_id, p_to_cash_box_id,
    v_from_box.currency, v_to_box.currency, p_from_amount, v_to_amount, v_exchange_rate,
    v_je_id, p_notes, 'posted', auth.uid(), now(), auth.uid()
  ) RETURNING id INTO v_exchange_id;

  RETURN jsonb_build_object(
    'success', true,
    'exchange_id', v_exchange_id,
    'exchange_number', v_exchange_number,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'from_amount', p_from_amount,
    'from_currency', v_from_box.currency,
    'to_amount', v_to_amount,
    'to_currency', v_to_box.currency,
    'exchange_rate', v_exchange_rate,
    'message', 'تم تنفيذ المصارفة بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في تنفيذ المصارفة: %', SQLERRM;
END;
$$;