-- حذف trigger إذا كان موجوداً وإنشاؤه من جديد
DROP TRIGGER IF EXISTS trigger_update_customer_on_payment_post ON customer_payments;

CREATE TRIGGER trigger_update_customer_on_payment_post
  AFTER UPDATE ON customer_payments
  FOR EACH ROW
  WHEN (NEW.status = 'posted' AND OLD.status <> 'posted')
  EXECUTE FUNCTION update_customer_on_payment_post();

-- إنشاء function لترحيل دفعة العميل بشكل كامل
CREATE OR REPLACE FUNCTION post_customer_payment(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_allocation RECORD;
  v_invoice_total NUMERIC;
  v_total_allocated NUMERIC;
BEGIN
  -- التحقق من الصلاحيات
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]) THEN
    RAISE EXCEPTION 'غير مصرح لك بترحيل الدفعات';
  END IF;

  -- جلب بيانات الدفعة
  SELECT * INTO v_payment
  FROM customer_payments
  WHERE id = p_payment_id AND status = 'draft';

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'الدفعة غير موجودة أو مرحلة مسبقاً';
  END IF;

  -- تحديث paid_amount في الفواتير المخصصة
  FOR v_allocation IN 
    SELECT invoice_id, allocated_amount
    FROM customer_payment_allocations
    WHERE payment_id = p_payment_id
  LOOP
    UPDATE sales_invoices
    SET paid_amount = paid_amount + v_allocation.allocated_amount
    WHERE id = v_allocation.invoice_id;

    -- تحديث حالة الدفع للفاتورة
    SELECT total_amount INTO v_invoice_total
    FROM sales_invoices
    WHERE id = v_allocation.invoice_id;

    SELECT COALESCE(SUM(allocated_amount), 0) INTO v_total_allocated
    FROM customer_payment_allocations
    WHERE invoice_id = v_allocation.invoice_id;

    UPDATE sales_invoices
    SET payment_status = CASE
      WHEN v_total_allocated >= v_invoice_total THEN 'paid'
      WHEN v_total_allocated > 0 THEN 'partial'
      ELSE 'unpaid'
    END
    WHERE id = v_allocation.invoice_id;
  END LOOP;

  -- تحديث حالة الدفعة إلى مرحلة (هذا سيطلق trigger تحديث رصيد العميل)
  UPDATE customer_payments
  SET 
    status = 'posted',
    updated_at = NOW()
  WHERE id = p_payment_id;

  -- إرجاع نتيجة النجاح
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'message', 'تم ترحيل الدفعة بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في ترحيل الدفعة: %', SQLERRM;
END;
$$;

-- منح صلاحيات تنفيذ الدالة
GRANT EXECUTE ON FUNCTION post_customer_payment(UUID) TO authenticated;