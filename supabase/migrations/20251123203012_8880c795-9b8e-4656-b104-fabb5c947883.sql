-- تصحيح دالة ترحيل مرتجعات المبيعات لحل مشاكل التكامل مع المخزون وحساب العميل

DROP FUNCTION IF EXISTS post_sales_return(UUID);

CREATE OR REPLACE FUNCTION public.post_sales_return(p_return_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_return RECORD;
  v_item RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_result JSONB;
BEGIN
  -- التحقق من الصلاحيات
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]) THEN
    RAISE EXCEPTION 'غير مصرح لك بترحيل المرتجعات';
  END IF;

  -- جلب بيانات المرتجع
  SELECT * INTO v_return
  FROM sales_returns
  WHERE id = p_return_id AND status = 'draft';

  IF v_return.id IS NULL THEN
    RAISE EXCEPTION 'المرتجع غير موجود أو مرحل مسبقاً';
  END IF;

  -- تحديث المخزون - إعادة المنتجات للمخزون
  FOR v_item IN 
    SELECT sri.*, p.name as product_name
    FROM sales_return_items sri
    INNER JOIN products p ON p.id = sri.item_id
    WHERE sri.return_id = p_return_id
  LOOP
    -- تحديث المخزون في المستودع (استخدام item_id و qty_on_hand)
    INSERT INTO warehouse_stock (warehouse_id, item_id, qty_on_hand, qty_reserved, qty_inbound, qty_outbound, last_updated)
    VALUES (v_return.warehouse_id, v_item.item_id, v_item.quantity, 0, 0, 0, NOW())
    ON CONFLICT (warehouse_id, item_id) 
    DO UPDATE SET 
      qty_on_hand = warehouse_stock.qty_on_hand + v_item.quantity,
      last_updated = NOW();

    -- تسجيل حركة المخزون (استخدام item_id و product_id و qty_in)
    INSERT INTO stock_ledger (
      item_id,
      product_id,
      warehouse_id,
      transaction_type,
      reference_type,
      reference_id,
      qty_in,
      qty_out,
      quantity_change,
      unit_cost,
      note,
      notes,
      created_by,
      created_at,
      timestamp
    ) VALUES (
      v_item.item_id,
      v_item.item_id, -- product_id = item_id
      v_return.warehouse_id,
      'in',
      'sales_return',
      p_return_id,
      v_item.quantity,
      0,
      v_item.quantity,
      v_item.unit_price,
      'إرجاع من مرتجع رقم: ' || v_return.return_number,
      'إرجاع من مرتجع رقم: ' || v_return.return_number,
      auth.uid(),
      NOW(),
      NOW()
    );
  END LOOP;

  -- تحديث رصيد العميل (تقليل الرصيد المستحق)
  UPDATE customers
  SET balance = balance - v_return.refund_amount,
      updated_at = NOW()
  WHERE id = v_return.customer_id;

  -- إنشاء قيد محاسبي
  SELECT 'JE-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
  INTO v_je_number
  FROM journal_entries;

  INSERT INTO journal_entries (
    entry_number,
    entry_date,
    reference_type,
    reference_id,
    description,
    status,
    created_by,
    total_debit,
    total_credit
  ) VALUES (
    v_je_number,
    CURRENT_DATE,
    'sales_return',
    p_return_id,
    'قيد مرتجع مبيعات رقم: ' || v_return.return_number,
    'posted',
    auth.uid(),
    v_return.total_amount,
    v_return.total_amount
  ) RETURNING id INTO v_je_id;

  -- بنود القيد المحاسبي
  -- مدين: مرتجعات المبيعات (تقليل الإيرادات) - حساب 4010
  INSERT INTO journal_entry_lines (
    entry_id, 
    line_no, 
    account_id, 
    debit_amount, 
    credit_amount, 
    description
  ) SELECT 
    v_je_id, 
    1, 
    id, 
    v_return.subtotal, 
    0, 
    'مرتجعات مبيعات'
  FROM gl_accounts 
  WHERE account_code = '4010' 
  LIMIT 1;

  -- مدين: ضريبة مرتجعة - حساب 2310
  IF v_return.tax_amount > 0 THEN
    INSERT INTO journal_entry_lines (
      entry_id, 
      line_no, 
      account_id, 
      debit_amount, 
      credit_amount, 
      description
    ) SELECT 
      v_je_id, 
      2, 
      id, 
      v_return.tax_amount, 
      0, 
      'ضريبة مرتجعة'
    FROM gl_accounts 
    WHERE account_code = '2310' 
    LIMIT 1;
  END IF;

  -- دائن: العملاء (تقليل المدينة) - حساب 1210
  INSERT INTO journal_entry_lines (
    entry_id, 
    line_no, 
    account_id, 
    debit_amount, 
    credit_amount, 
    description
  ) SELECT 
    v_je_id, 
    3, 
    id, 
    0, 
    v_return.total_amount, 
    'حساب العميل'
  FROM gl_accounts 
  WHERE account_code = '1210' 
  LIMIT 1;

  -- تحديث حالة المرتجع
  UPDATE sales_returns
  SET 
    status = 'posted',
    posted_by = auth.uid(),
    posted_at = NOW()
  WHERE id = p_return_id;

  -- إنشاء النتيجة
  v_result := jsonb_build_object(
    'success', true,
    'return_id', p_return_id,
    'return_number', v_return.return_number,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'refund_amount', v_return.refund_amount,
    'message', 'تم ترحيل المرتجع وتحديث المخزون وحساب العميل بنجاح'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- تسجيل الخطأ
    RAISE EXCEPTION 'خطأ في ترحيل المرتجع: %', SQLERRM;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION post_sales_return(UUID) TO authenticated;

COMMENT ON FUNCTION post_sales_return(UUID) IS 'ترحيل مرتجع مبيعات مع تحديث المخزون وحساب العميل والقيود المحاسبية';