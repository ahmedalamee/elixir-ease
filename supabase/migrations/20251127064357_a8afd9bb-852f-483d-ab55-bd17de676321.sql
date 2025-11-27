
-- إصلاح RLS policy لجدول customer_payments لتمكين ترحيل المدفوعات

-- 1. حذف السياسة القديمة التي تمنع التحديث
DROP POLICY IF EXISTS "Prevent editing posted payments" ON customer_payments;

-- 2. إنشاء سياسة جديدة للتحديث
-- تسمح بتحديث المدفوعات من 'draft' إلى 'posted' للموظفين المصرحين
CREATE POLICY "Staff can update payments"
ON customer_payments
FOR UPDATE
TO authenticated
USING (
  -- السماح بتحديث السجلات التي حالتها 'draft'
  status = 'draft' AND 
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role])
)
WITH CHECK (
  -- السماح بالتحديث إلى أي حالة للموظفين المصرحين
  -- هذا يسمح بتغيير الحالة من 'draft' إلى 'posted'
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role])
);

-- 3. إضافة سياسة لمنع تعديل المدفوعات المرحلة
-- (فقط الإداري يمكنه تعديل المدفوعات المرحلة)
CREATE POLICY "Only admin can update posted payments"
ON customer_payments
FOR UPDATE
TO authenticated
USING (
  status = 'posted' AND 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- 4. التأكد من أن trigger تحديث رصيد العميل يعمل بشكل صحيح
-- يجب أن يطلق عند تغيير الحالة من غير 'posted' إلى 'posted'
DROP TRIGGER IF EXISTS trigger_update_customer_on_payment_post ON customer_payments;
CREATE TRIGGER trigger_update_customer_on_payment_post
  AFTER UPDATE ON customer_payments
  FOR EACH ROW
  WHEN (NEW.status = 'posted' AND OLD.status <> 'posted')
  EXECUTE FUNCTION update_customer_on_payment_post();
