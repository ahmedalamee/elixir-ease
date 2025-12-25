
-- إصلاح مشاكل الأمان: تقييد الوصول للبيانات الحساسة

-- 1. حذف السياسات الزائدة للعملاء (تنظيف التكرار)
DROP POLICY IF EXISTS "Customers can read own record" ON customers;
DROP POLICY IF EXISTS "Customers can view own data" ON customers;
DROP POLICY IF EXISTS "Customers can update own record" ON customers;
DROP POLICY IF EXISTS "Customers can update own info" ON customers;
DROP POLICY IF EXISTS "customers_self_read" ON customers;
DROP POLICY IF EXISTS "customers_admin_pharmacist_read" ON customers;
DROP POLICY IF EXISTS "customers_admin_pharmacist_insert" ON customers;
DROP POLICY IF EXISTS "customers_admin_pharmacist_update" ON customers;
DROP POLICY IF EXISTS "customers_pharmacist_add" ON customers;
DROP POLICY IF EXISTS "customers_pharmacist_pending_rx" ON customers;
DROP POLICY IF EXISTS "customers_pharmacist_update_pending" ON customers;

-- 2. إنشاء سياسات محدودة للعملاء
-- Admin: وصول كامل (موجود بالفعل)
-- Pharmacist: قراءة فقط للعملاء الذين لديهم وصفات معلقة
-- Cashier: لا وصول (سيستخدم view آمن)
-- العميل: يقرأ ويعدل بياناته فقط

CREATE POLICY "customers_self_access"
ON customers FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "customers_self_update"
ON customers FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Pharmacist: قراءة محدودة فقط للعملاء مع وصفات معلقة
CREATE POLICY "customers_pharmacist_limited_read"
ON customers FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) 
  AND EXISTS (
    SELECT 1 FROM prescriptions p 
    WHERE p.customer_id = customers.id 
    AND p.status = 'pending' 
    AND p.dispensed_at IS NULL
  )
);

-- Pharmacist: إضافة عملاء جدد
CREATE POLICY "customers_pharmacist_insert"
ON customers FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- 3. إنشاء view آمن للكاشير (معلومات محدودة فقط)
CREATE OR REPLACE VIEW customers_cashier_view 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  loyalty_points,
  credit_limit,
  balance
FROM customers
WHERE has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]);

-- 4. تقييد وصول الموردين
-- حذف سياسة inventory_manager الكاملة
DROP POLICY IF EXISTS "Inventory manager full access to suppliers" ON suppliers;

-- إنشاء سياسة محدودة لـ inventory_manager (قراءة فقط للمعلومات الأساسية)
CREATE POLICY "suppliers_inventory_manager_limited"
ON suppliers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'inventory_manager'::app_role));

-- inventory_manager لا يستطيع التعديل أو الحذف - فقط Admin

-- 5. إنشاء view آمن للموردين (بدون معلومات الاتصال الحساسة)
CREATE OR REPLACE VIEW suppliers_safe_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  currency_code,
  payment_terms,
  is_active
FROM suppliers
WHERE has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role, 'pharmacist'::app_role]);

-- 6. إلغاء الصلاحيات العامة
REVOKE ALL ON customers_cashier_view FROM anon, public;
REVOKE ALL ON suppliers_safe_view FROM anon, public;
GRANT SELECT ON customers_cashier_view TO authenticated;
GRANT SELECT ON suppliers_safe_view TO authenticated;
