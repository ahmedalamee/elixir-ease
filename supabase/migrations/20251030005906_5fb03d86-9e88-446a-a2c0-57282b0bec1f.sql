
-- إصلاح سياسات RLS للموردين والمستودعات والموظفين
-- المشكلة: سياسات متضاربة ومعقدة

-- =====================================
-- 1. إصلاح سياسات الموردين (Suppliers)
-- =====================================

-- حذف السياسات القديمة المتضاربة
DROP POLICY IF EXISTS "Admin and inventory manager full access to suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admin and pharmacist manage suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admin and pharmacist update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Pharmacist read suppliers" ON suppliers;
DROP POLICY IF EXISTS "Only admin can delete suppliers" ON suppliers;

-- إنشاء سياسات واضحة وبسيطة
CREATE POLICY "Admin full access to suppliers" 
ON suppliers FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Pharmacist and inventory manager manage suppliers" 
ON suppliers FOR ALL 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['pharmacist'::app_role, 'inventory_manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['pharmacist'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Cashier read suppliers" 
ON suppliers FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'cashier'::app_role));

-- =====================================
-- 2. إصلاح سياسات المستودعات (Warehouses)
-- =====================================

-- حذف السياسات القديمة المتضاربة
DROP POLICY IF EXISTS "Admin manage warehouses" ON warehouses;
DROP POLICY IF EXISTS "Admin and inventory manager insert/update warehouses" ON warehouses;
DROP POLICY IF EXISTS "All staff read warehouses" ON warehouses;
DROP POLICY IF EXISTS "Only admin can delete warehouses" ON warehouses;

-- إنشاء سياسات واضحة
CREATE POLICY "Admin full access to warehouses" 
ON warehouses FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Inventory manager manage warehouses" 
ON warehouses FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'inventory_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'inventory_manager'::app_role));

CREATE POLICY "Staff read warehouses" 
ON warehouses FOR SELECT 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['pharmacist'::app_role, 'cashier'::app_role]));

-- =====================================
-- 3. تحسين سياسات الموظفين (Employees)
-- =====================================
-- السياسات الحالية جيدة، لكن نتأكد من وضوحها

-- لا حاجة للتغيير، السياسات واضحة بالفعل:
-- - Admin can insert employees
-- - Admin can update employees
-- - Admin can delete employees
-- - Admin can select all employees
-- - Employees can view their own record
-- - Staff can view employees
