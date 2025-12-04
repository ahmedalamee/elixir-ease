
-- حذف الدوال القديمة التي تُرجع json لإعادة إنشائها بـ jsonb
DROP FUNCTION IF EXISTS public.post_purchase_invoice(uuid);

-- ============================================================================
-- تحديث دالة ترحيل فواتير المشتريات
-- ============================================================================
CREATE OR REPLACE FUNCTION public.post_purchase_invoice(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_result JSONB;
  v_operation TEXT;
  v_mapping_purchase RECORD;
  v_mapping_tax RECORD;
  v_line_no INTEGER := 0;
BEGIN
  -- التحقق من صلاحيات المستخدم
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'inventory_manager']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات الترحيل';
  END IF;

  -- جلب بيانات الفاتورة
  SELECT * INTO v_invoice FROM purchase_invoices WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الفاتورة غير موجودة';
  END IF;
  
  IF v_invoice.status = 'posted' THEN
    RAISE EXCEPTION 'الفاتورة مرحّلة مسبقاً';
  END IF;

  -- التحقق من عدم وجود قيد مسبق
  IF EXISTS (SELECT 1 FROM gl_journal_entries WHERE source_document_id = p_invoice_id::text AND source_module = 'purchases') THEN
    RAISE EXCEPTION 'تم إنشاء قيد محاسبي لهذه الفاتورة مسبقاً';
  END IF;

  -- تحديد نوع العملية (نقدي أو آجل)
  IF COALESCE(v_invoice.paid_amount, 0) >= v_invoice.total_amount THEN
    v_operation := 'cash_purchase';
  ELSE
    v_operation := 'credit_purchase';
  END IF;

  -- جلب ربط حساب المشتريات
  SELECT * INTO v_mapping_purchase
  FROM erp_account_mappings
  WHERE module = 'purchases' AND operation = v_operation AND is_active = true
  LIMIT 1;

  IF v_mapping_purchase.debit_account_id IS NULL OR v_mapping_purchase.credit_account_id IS NULL THEN
    RAISE EXCEPTION 'ربط الحسابات غير مكوّن للعملية: %. يرجى تكوينه في إعدادات ربط الحسابات.', v_operation;
  END IF;

  -- جلب ربط حساب الضريبة
  SELECT * INTO v_mapping_tax
  FROM erp_account_mappings
  WHERE module = 'purchases' AND operation = 'purchase_tax' AND is_active = true
  LIMIT 1;

  -- توليد رقم القيد
  v_je_number := (SELECT generate_journal_entry_number());

  -- إنشاء رأس القيد
  INSERT INTO gl_journal_entries (
    entry_no,
    entry_date,
    posting_date,
    description,
    source_module,
    source_document_id,
    is_posted,
    is_reversed,
    created_by
  ) VALUES (
    v_je_number,
    COALESCE(v_invoice.invoice_date, CURRENT_DATE),
    CURRENT_DATE,
    'فاتورة مشتريات رقم: ' || v_invoice.pi_number,
    'purchases',
    p_invoice_id::text,
    true,
    false,
    auth.uid()
  ) RETURNING id INTO v_je_id;

  -- بنود القيد المحاسبي
  v_line_no := 0;

  -- 1. المدين: المخزون أو مصروفات المشتريات
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
  VALUES (v_je_id, v_line_no, v_mapping_purchase.debit_account_id, 
    v_invoice.total_amount - COALESCE(v_invoice.tax_amount, 0), 0, 'مشتريات');

  -- 2. المدين: ضريبة المشتريات (المدخلات) إن وجدت
  IF COALESCE(v_invoice.tax_amount, 0) > 0 AND v_mapping_tax.debit_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
    VALUES (v_je_id, v_line_no, v_mapping_tax.debit_account_id, v_invoice.tax_amount, 0, 'ضريبة القيمة المضافة - مشتريات');
  END IF;

  -- 3. الدائن: النقدية أو الذمم الدائنة
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (journal_id, line_no, account_id, debit, credit, description)
  VALUES (v_je_id, v_line_no, v_mapping_purchase.credit_account_id, 0, v_invoice.total_amount, 
    CASE WHEN v_operation = 'cash_purchase' THEN 'دفع نقدي' ELSE 'ذمم دائنة' END);

  -- تحديث حالة الفاتورة
  UPDATE purchase_invoices 
  SET status = 'posted',
      posted_at = NOW(),
      posted_by = auth.uid()
  WHERE id = p_invoice_id;

  -- تحديث رصيد المورد
  IF v_invoice.supplier_id IS NOT NULL THEN
    UPDATE suppliers
    SET balance = balance + v_invoice.total_amount
    WHERE id = v_invoice.supplier_id;
  END IF;

  -- ربط المستند بالقيد
  INSERT INTO document_gl_entries (
    document_type,
    document_id,
    document_number,
    document_amount,
    journal_entry_id,
    status
  ) VALUES (
    'purchase_invoice',
    p_invoice_id,
    v_invoice.pi_number,
    v_invoice.total_amount,
    v_je_id,
    'posted'
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
$function$;

COMMENT ON FUNCTION post_purchase_invoice(uuid) IS 'ترحيل فاتورة مشتريات مع إنشاء قيد GL تلقائي';
