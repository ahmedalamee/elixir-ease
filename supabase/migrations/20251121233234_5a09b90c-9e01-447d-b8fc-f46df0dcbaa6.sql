-- =====================================================
-- دوال معالجة المرتجعات والتقارير الضريبية
-- Returns Processing & Tax Reports Functions
-- =====================================================

-- دالة توليد رقم مرتجع مبيعات
CREATE OR REPLACE FUNCTION public.generate_sales_return_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_next_number INTEGER;
  v_number_length INTEGER;
  v_max_existing_number INTEGER;
  v_result TEXT;
  v_attempt INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  -- الحصول على إعدادات الترقيم
  SELECT prefix, next_number, number_length 
  INTO v_prefix, v_next_number, v_number_length
  FROM document_numbering_rules
  WHERE document_type = 'sales_return' 
    AND is_active = true
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    -- إنشاء قاعدة افتراضية
    INSERT INTO document_numbering_rules (
      document_type, prefix, next_number, number_length, is_active, description
    ) VALUES (
      'sales_return', 'SR-', 1, 6, true, 'أرقام مرتجعات المبيعات'
    )
    RETURNING prefix, next_number, number_length 
    INTO v_prefix, v_next_number, v_number_length;
  END IF;

  -- البحث عن آخر رقم موجود
  SELECT COALESCE(MAX(num), 0) INTO v_max_existing_number
  FROM (
    SELECT 
      CASE 
        WHEN return_number ~ ('^' || v_prefix || '[0-9]+$')
        THEN CAST(SUBSTRING(return_number FROM LENGTH(v_prefix) + 1) AS INTEGER)
        ELSE 0
      END as num
    FROM sales_returns
    WHERE return_number LIKE v_prefix || '%'
  ) valid_numbers;

  IF v_max_existing_number >= v_next_number THEN
    v_next_number := v_max_existing_number + 1;
  END IF;

  -- توليد رقم فريد
  LOOP
    EXIT WHEN v_attempt > 100;
    v_result := v_prefix || LPAD(v_next_number::TEXT, v_number_length, '0');
    SELECT EXISTS (SELECT 1 FROM sales_returns WHERE return_number = v_result) INTO v_exists;
    EXIT WHEN NOT v_exists;
    v_next_number := v_next_number + 1;
    v_attempt := v_attempt + 1;
  END LOOP;

  IF v_attempt > 100 THEN
    RAISE EXCEPTION 'فشل في توليد رقم مرتجع فريد';
  END IF;

  UPDATE document_numbering_rules
  SET next_number = v_next_number + 1, updated_at = NOW()
  WHERE document_type = 'sales_return' AND is_active = true;

  RETURN v_result;
END;
$$;

-- دالة توليد رقم مرتجع مشتريات
CREATE OR REPLACE FUNCTION public.generate_purchase_return_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_next_number INTEGER;
  v_number_length INTEGER;
  v_max_existing_number INTEGER;
  v_result TEXT;
  v_attempt INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  SELECT prefix, next_number, number_length 
  INTO v_prefix, v_next_number, v_number_length
  FROM document_numbering_rules
  WHERE document_type = 'purchase_return' 
    AND is_active = true
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO document_numbering_rules (
      document_type, prefix, next_number, number_length, is_active, description
    ) VALUES (
      'purchase_return', 'PR-', 1, 6, true, 'أرقام مرتجعات المشتريات'
    )
    RETURNING prefix, next_number, number_length 
    INTO v_prefix, v_next_number, v_number_length;
  END IF;

  SELECT COALESCE(MAX(num), 0) INTO v_max_existing_number
  FROM (
    SELECT 
      CASE 
        WHEN return_number ~ ('^' || v_prefix || '[0-9]+$')
        THEN CAST(SUBSTRING(return_number FROM LENGTH(v_prefix) + 1) AS INTEGER)
        ELSE 0
      END as num
    FROM purchase_returns
    WHERE return_number LIKE v_prefix || '%'
  ) valid_numbers;

  IF v_max_existing_number >= v_next_number THEN
    v_next_number := v_max_existing_number + 1;
  END IF;

  LOOP
    EXIT WHEN v_attempt > 100;
    v_result := v_prefix || LPAD(v_next_number::TEXT, v_number_length, '0');
    SELECT EXISTS (SELECT 1 FROM purchase_returns WHERE return_number = v_result) INTO v_exists;
    EXIT WHEN NOT v_exists;
    v_next_number := v_next_number + 1;
    v_attempt := v_attempt + 1;
  END LOOP;

  IF v_attempt > 100 THEN
    RAISE EXCEPTION 'فشل في توليد رقم مرتجع فريد';
  END IF;

  UPDATE document_numbering_rules
  SET next_number = v_next_number + 1, updated_at = NOW()
  WHERE document_type = 'purchase_return' AND is_active = true;

  RETURN v_result;
END;
$$;

-- دالة ترحيل مرتجع مبيعات
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
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات الترحيل';
  END IF;

  -- جلب بيانات المرتجع
  SELECT * INTO v_return
  FROM sales_returns
  WHERE id = p_return_id AND status = 'draft';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المرتجع غير موجود أو تم ترحيله مسبقاً';
  END IF;

  -- إعادة المنتجات للمخزون
  FOR v_item IN 
    SELECT sri.*, p.name as product_name
    FROM sales_return_items sri
    JOIN products p ON p.id = sri.item_id
    WHERE sri.return_id = p_return_id
  LOOP
    -- إضافة الكمية للمخزون
    IF v_item.condition = 'good' THEN
      -- إعادة للمخزون الصالح
      UPDATE warehouse_stock
      SET qty_on_hand = qty_on_hand + v_item.quantity,
          last_updated = NOW()
      WHERE item_id = v_item.item_id 
        AND warehouse_id = v_return.warehouse_id;
    ELSIF v_item.condition = 'damaged' THEN
      -- نقل لمخزون التالف (إذا كان موجوداً)
      UPDATE warehouse_stock
      SET qty_on_hand = qty_on_hand + v_item.quantity,
          last_updated = NOW()
      WHERE item_id = v_item.item_id 
        AND warehouse_id = (SELECT id FROM warehouses WHERE type = 'damaged' LIMIT 1);
    END IF;
    
    -- تسجيل حركة المخزون
    INSERT INTO stock_ledger (
      product_id, warehouse_id, transaction_type, reference_type, reference_id,
      quantity_change, unit_cost, notes
    ) VALUES (
      v_item.item_id, v_return.warehouse_id, 'IN', 'sales_return', p_return_id,
      v_item.quantity, v_item.unit_price,
      'مرتجع مبيعات: ' || v_return.return_number || ' - ' || v_item.condition
    );
  END LOOP;

  -- تحديث رصيد العميل
  UPDATE customers
  SET balance = balance - v_return.refund_amount,
      last_transaction_date = CURRENT_DATE
  WHERE id = v_return.customer_id;

  -- إنشاء قيد محاسبي
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
         LPAD(NEXTVAL('journal_entry_sequence')::TEXT, 6, '0')
  INTO v_je_number;

  INSERT INTO journal_entries (
    entry_number, entry_date, posting_date, reference_type, reference_id,
    description, total_debit, total_credit, status, created_by, posted_by, posted_at
  ) VALUES (
    v_je_number, v_return.return_date, CURRENT_DATE, 'sales_return', p_return_id,
    'قيد مرتجع مبيعات رقم: ' || v_return.return_number,
    v_return.total_amount, v_return.total_amount, 'posted',
    auth.uid(), auth.uid(), NOW()
  ) RETURNING id INTO v_je_id;

  -- سطور القيد: عكس قيد المبيعات
  INSERT INTO journal_entry_lines (entry_id, line_no, account_id, description, debit_amount, credit_amount)
  VALUES 
    (v_je_id, 1, (SELECT id FROM gl_accounts WHERE account_code = '4010' LIMIT 1),
     'مرتجع مبيعات: ' || v_return.return_number, v_return.subtotal, 0),
    (v_je_id, 2, (SELECT id FROM gl_accounts WHERE account_code = '1210' LIMIT 1),
     'مرتجع مبيعات: ' || v_return.return_number, 0, v_return.total_amount);

  IF v_return.tax_amount > 0 THEN
    INSERT INTO journal_entry_lines (entry_id, line_no, account_id, description, debit_amount, credit_amount)
    VALUES (v_je_id, 3, (SELECT id FROM gl_accounts WHERE account_code = '2310' LIMIT 1),
      'ضريبة مرتجع: ' || v_return.return_number, v_return.tax_amount, 0);
  END IF;

  -- ربط القيد بالمرتجع
  INSERT INTO document_gl_entries (
    document_type, document_id, document_number, document_amount, journal_entry_id, status
  ) VALUES (
    'sales_return', p_return_id, v_return.return_number, v_return.total_amount, v_je_id, 'posted'
  );

  -- تحديث حالة المرتجع
  UPDATE sales_returns
  SET status = 'posted', posted_by = auth.uid(), posted_at = NOW()
  WHERE id = p_return_id;

  v_result := jsonb_build_object(
    'success', true,
    'return_id', p_return_id,
    'journal_entry_id', v_je_id,
    'message', 'تم ترحيل المرتجع بنجاح'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- دالة ترحيل مرتجع مشتريات
CREATE OR REPLACE FUNCTION public.post_purchase_return(p_return_id UUID)
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
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات الترحيل';
  END IF;

  SELECT * INTO v_return
  FROM purchase_returns
  WHERE id = p_return_id AND status = 'draft';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المرتجع غير موجود أو تم ترحيله مسبقاً';
  END IF;

  -- خصم المنتجات من المخزون
  FOR v_item IN 
    SELECT pri.*, p.name as product_name
    FROM purchase_return_items pri
    JOIN products p ON p.id = pri.item_id
    WHERE pri.return_id = p_return_id
  LOOP
    UPDATE warehouse_stock
    SET qty_on_hand = qty_on_hand - v_item.quantity,
        last_updated = NOW()
    WHERE item_id = v_item.item_id 
      AND warehouse_id = v_return.warehouse_id;
    
    INSERT INTO stock_ledger (
      product_id, warehouse_id, transaction_type, reference_type, reference_id,
      quantity_change, unit_cost, notes
    ) VALUES (
      v_item.item_id, v_return.warehouse_id, 'OUT', 'purchase_return', p_return_id,
      -v_item.quantity, v_item.unit_cost,
      'مرتجع مشتريات: ' || v_return.return_number
    );
  END LOOP;

  -- تحديث رصيد المورد
  UPDATE suppliers
  SET balance = balance - v_return.refund_amount
  WHERE id = v_return.supplier_id;

  -- قيد محاسبي
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
         LPAD(NEXTVAL('journal_entry_sequence')::TEXT, 6, '0')
  INTO v_je_number;

  INSERT INTO journal_entries (
    entry_number, entry_date, posting_date, reference_type, reference_id,
    description, total_debit, total_credit, status, created_by, posted_by, posted_at
  ) VALUES (
    v_je_number, v_return.return_date, CURRENT_DATE, 'purchase_return', p_return_id,
    'قيد مرتجع مشتريات رقم: ' || v_return.return_number,
    v_return.total_amount, v_return.total_amount, 'posted',
    auth.uid(), auth.uid(), NOW()
  ) RETURNING id INTO v_je_id;

  INSERT INTO journal_entry_lines (entry_id, line_no, account_id, description, debit_amount, credit_amount)
  VALUES 
    (v_je_id, 1, (SELECT id FROM gl_accounts WHERE account_code = '2-1-001' LIMIT 1),
     'مرتجع مشتريات: ' || v_return.return_number, v_return.total_amount, 0),
    (v_je_id, 2, (SELECT id FROM gl_accounts WHERE account_code = '1-1-001' LIMIT 1),
     'مرتجع مشتريات: ' || v_return.return_number, 0, v_return.subtotal);

  INSERT INTO document_gl_entries (
    document_type, document_id, document_number, document_amount, journal_entry_id, status
  ) VALUES (
    'purchase_return', p_return_id, v_return.return_number, v_return.total_amount, v_je_id, 'posted'
  );

  UPDATE purchase_returns
  SET status = 'posted', posted_by = auth.uid(), posted_at = NOW()
  WHERE id = p_return_id;

  v_result := jsonb_build_object(
    'success', true,
    'return_id', p_return_id,
    'journal_entry_id', v_je_id,
    'message', 'تم ترحيل المرتجع بنجاح'
  );

  RETURN v_result;
END;
$$;

-- دالة توليد تقرير VAT
CREATE OR REPLACE FUNCTION public.generate_vat_report(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sales_data RECORD;
  v_purchases_data RECORD;
  v_returns_data RECORD;
  v_result JSONB;
BEGIN
  -- حساب المبيعات
  SELECT 
    COALESCE(SUM(CASE WHEN tax_amount > 0 THEN subtotal ELSE 0 END), 0) as standard_sales,
    COALESCE(SUM(CASE WHEN tax_amount = 0 AND status = 'posted' THEN subtotal ELSE 0 END), 0) as zero_sales,
    COALESCE(SUM(subtotal), 0) as total_sales,
    COALESCE(SUM(tax_amount), 0) as output_vat
  INTO v_sales_data
  FROM sales_invoices
  WHERE invoice_date BETWEEN p_start_date AND p_end_date
    AND status = 'posted';

  -- حساب المشتريات
  SELECT 
    COALESCE(SUM(CASE WHEN tax_amount > 0 THEN subtotal ELSE 0 END), 0) as standard_purchases,
    COALESCE(SUM(CASE WHEN tax_amount = 0 AND status = 'posted' THEN subtotal ELSE 0 END), 0) as zero_purchases,
    COALESCE(SUM(subtotal), 0) as total_purchases,
    COALESCE(SUM(tax_amount), 0) as input_vat
  INTO v_purchases_data
  FROM purchase_invoices
  WHERE invoice_date BETWEEN p_start_date AND p_end_date
    AND status = 'posted';

  -- حساب المرتجعات
  SELECT 
    COALESCE(SUM(CASE WHEN sr.status = 'posted' THEN sr.tax_amount ELSE 0 END), 0) as sales_returns_vat,
    COALESCE(SUM(CASE WHEN pr.status = 'posted' THEN pr.tax_amount ELSE 0 END), 0) as purchase_returns_vat
  INTO v_returns_data
  FROM sales_returns sr
  FULL OUTER JOIN purchase_returns pr ON 1=1
  WHERE (sr.return_date BETWEEN p_start_date AND p_end_date OR sr.return_date IS NULL)
    AND (pr.return_date BETWEEN p_start_date AND p_end_date OR pr.return_date IS NULL);

  -- بناء النتيجة
  v_result := jsonb_build_object(
    'period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'sales', jsonb_build_object(
      'standard_rated', v_sales_data.standard_sales,
      'zero_rated', v_sales_data.zero_sales,
      'total', v_sales_data.total_sales,
      'output_vat', v_sales_data.output_vat - COALESCE(v_returns_data.sales_returns_vat, 0)
    ),
    'purchases', jsonb_build_object(
      'standard_rated', v_purchases_data.standard_purchases,
      'zero_rated', v_purchases_data.zero_purchases,
      'total', v_purchases_data.total_purchases,
      'input_vat', v_purchases_data.input_vat - COALESCE(v_returns_data.purchase_returns_vat, 0)
    ),
    'summary', jsonb_build_object(
      'output_vat', v_sales_data.output_vat - COALESCE(v_returns_data.sales_returns_vat, 0),
      'input_vat', v_purchases_data.input_vat - COALESCE(v_returns_data.purchase_returns_vat, 0),
      'net_vat', (v_sales_data.output_vat - COALESCE(v_returns_data.sales_returns_vat, 0)) - 
                 (v_purchases_data.input_vat - COALESCE(v_returns_data.purchase_returns_vat, 0))
    )
  );

  RETURN v_result;
END;
$$;