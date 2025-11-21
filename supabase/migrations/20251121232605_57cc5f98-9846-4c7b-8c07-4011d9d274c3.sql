-- إصلاح المشاكل الحرجة (مبسط)

-- 1. منع تعديل المستندات المرحلة
CREATE OR REPLACE FUNCTION public.prevent_posted_modification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.status = 'posted' THEN
    IF NOT (TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND has_role(auth.uid(), 'admin')) THEN
      RAISE EXCEPTION 'لا يمكن تعديل أو حذف المستندات المرحلة. يرجى الاتصال بالمسؤول.';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS protect_sales_invoices ON sales_invoices;
CREATE TRIGGER protect_sales_invoices BEFORE UPDATE OR DELETE ON sales_invoices FOR EACH ROW EXECUTE FUNCTION prevent_posted_modification();

DROP TRIGGER IF EXISTS protect_purchase_invoices ON purchase_invoices;
CREATE TRIGGER protect_purchase_invoices BEFORE UPDATE OR DELETE ON purchase_invoices FOR EACH ROW EXECUTE FUNCTION prevent_posted_modification();

DROP TRIGGER IF EXISTS protect_journal_entries ON journal_entries;
CREATE TRIGGER protect_journal_entries BEFORE UPDATE OR DELETE ON journal_entries FOR EACH ROW EXECUTE FUNCTION prevent_posted_modification();

-- 2. دالة التحقق من حد الائتمان
CREATE OR REPLACE FUNCTION public.check_credit_limit(p_customer_id UUID, p_amount NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
  v_customer RECORD; 
  v_available NUMERIC;
BEGIN
  SELECT id, name, credit_limit, balance INTO v_customer FROM customers WHERE id = p_customer_id;
  
  IF NOT FOUND THEN 
    RETURN jsonb_build_object('allowed', false, 'reason', 'العميل غير موجود'); 
  END IF;
  
  IF v_customer.credit_limit IS NULL OR v_customer.credit_limit = 0 THEN 
    RETURN jsonb_build_object('allowed', true, 'message', 'لا يوجد حد ائتماني محدد'); 
  END IF;
  
  v_available := v_customer.credit_limit - v_customer.balance;
  
  IF (v_customer.balance + p_amount) > v_customer.credit_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 
      'credit_limit', v_customer.credit_limit,
      'current_balance', v_customer.balance,
      'available_credit', v_available,
      'exceeded_by', (v_customer.balance + p_amount - v_customer.credit_limit),
      'message', format('تجاوز حد الائتمان. المتاح: %s ر.س من أصل %s ر.س', 
        ROUND(v_available, 2), ROUND(v_customer.credit_limit, 2))
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true, 
    'credit_limit', v_customer.credit_limit,
    'current_balance', v_customer.balance,
    'available_credit', v_available, 
    'remaining_after_sale', v_available - p_amount,
    'message', format('متاح: %s ر.س، سيتبقى: %s ر.س بعد البيع', 
      ROUND(v_available, 2), ROUND(v_available - p_amount, 2))
  );
END;
$$;

-- 3. قيود على بنود فواتير المبيعات
ALTER TABLE sales_invoice_items DROP CONSTRAINT IF EXISTS chk_qty_positive;
ALTER TABLE sales_invoice_items ADD CONSTRAINT chk_qty_positive CHECK (quantity > 0);

ALTER TABLE sales_invoice_items DROP CONSTRAINT IF EXISTS chk_price_non_negative;
ALTER TABLE sales_invoice_items ADD CONSTRAINT chk_price_non_negative CHECK (unit_price >= 0);

ALTER TABLE sales_invoice_items DROP CONSTRAINT IF EXISTS chk_discount_valid;
ALTER TABLE sales_invoice_items ADD CONSTRAINT chk_discount_valid CHECK (
  discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100)
);

-- 4. قيود على فواتير المبيعات
ALTER TABLE sales_invoices DROP CONSTRAINT IF EXISTS chk_amounts_non_negative;
ALTER TABLE sales_invoices ADD CONSTRAINT chk_amounts_non_negative CHECK (
  subtotal >= 0 AND 
  tax_amount >= 0 AND 
  total_amount >= 0 AND 
  paid_amount >= 0 AND
  discount_amount >= 0
);

-- 5. قيود على فواتير الشراء
ALTER TABLE purchase_invoices DROP CONSTRAINT IF EXISTS chk_amounts_non_negative;
ALTER TABLE purchase_invoices ADD CONSTRAINT chk_amounts_non_negative CHECK (
  subtotal >= 0 AND 
  tax_amount >= 0 AND 
  total_amount >= 0 AND 
  paid_amount >= 0 AND
  discount_amount >= 0
);

-- 6. View مراقبة المستندات المرحلة
CREATE OR REPLACE VIEW public.posted_documents_audit AS
SELECT 
  'sales_invoice' as document_type,
  id,
  invoice_number as document_number,
  invoice_date as document_date,
  total_amount,
  status,
  posted_by,
  posted_at,
  customer_id as party_id,
  NULL::uuid as warehouse_id
FROM sales_invoices
WHERE status = 'posted'
UNION ALL
SELECT 
  'purchase_invoice' as document_type,
  id,
  pi_number as document_number,
  invoice_date as document_date,
  total_amount,
  status,
  posted_by,
  posted_at,
  supplier_id as party_id,
  warehouse_id
FROM purchase_invoices
WHERE status = 'posted'
UNION ALL
SELECT 
  'journal_entry' as document_type,
  id,
  entry_number as document_number,
  entry_date as document_date,
  total_debit as total_amount,
  status,
  posted_by,
  posted_at,
  NULL::uuid as party_id,
  NULL::uuid as warehouse_id
FROM journal_entries
WHERE status = 'posted'
ORDER BY document_date DESC, posted_at DESC;

COMMENT ON FUNCTION prevent_posted_modification IS 'منع تعديل أو حذف المستندات المرحلة (المدراء فقط يمكنهم الإلغاء)';
COMMENT ON FUNCTION check_credit_limit IS 'التحقق من حد الائتمان قبل البيع وإرجاع معلومات تفصيلية';
COMMENT ON VIEW posted_documents_audit IS 'عرض شامل لجميع المستندات المرحلة للمراجعة والتدقيق';