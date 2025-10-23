-- ===============================================
-- مراجعة سياسات RLS للأدوار
-- ===============================================

-- ملاحظة: معظم السياسات موجودة بالفعل، هذا تأكيد وتوضيح للصلاحيات

-- صلاحيات الأدوار:
-- ====================
-- admin: كل الصلاحيات (قراءة، كتابة، تعديل، حذف، ترحيل)
-- pharmacist: إدارة المبيعات والعملاء، عرض المخزون والتقارير
-- cashier: نقاط البيع فقط، قراءة المنتجات والأسعار
-- inventory_manager: إدارة المخزون والمشتريات، لا يصل للمحاسبة

-- التحقق من السياسات الحالية على الجداول الحساسة
-- ======================================================

-- 1. المحاسبة (gl_accounts, journal_entries)
-- المدراء فقط يمكنهم الوصول للمحاسبة
-- الصيادلة يمكنهم القراءة فقط

-- التأكد من أن inventory_manager لا يصل للمحاسبة
-- تم بالفعل في السياسات الموجودة

-- 2. فواتير الشراء (purchase_invoices, purchase_orders)
-- فقط admin و inventory_manager
-- pharmacist لا يمكنه ترحيل فواتير الشراء

-- 3. المبيعات (sales, sale_items)
-- admin, pharmacist, cashier يمكنهم الإنشاء
-- فقط admin يمكنه الحذف والتعديل
-- pharmacist يمكنه عرض كل المبيعات
-- cashier يمكنه فقط إنشاء المبيعات

-- 4. الإعدادات (system_settings, posting_rules, document_numbering_rules)
-- فقط admin يمكنه التعديل
-- الباقي قراءة فقط

-- تأكيد السياسات على جدول الجرد (goods_receipts)
-- ====================================================

-- التأكد من أن فقط inventory_manager و admin يمكنهم إنشاء وترحيل GRN
-- تم بالفعل في السياسات الموجودة

-- إضافة سياسة للتأكد من أن المستخدمين لا يمكنهم تعديل المستندات المرحّلة
-- =============================================================================

-- دالة للتحقق من حالة المستند
CREATE OR REPLACE FUNCTION public.is_document_posted(doc_status text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT doc_status = 'posted';
$$;

-- سياسة منع تعديل المستندات المرحّلة على أوامر الشراء
DROP POLICY IF EXISTS "Prevent editing posted POs" ON public.purchase_orders;
CREATE POLICY "Prevent editing posted POs"
ON public.purchase_orders
FOR UPDATE
USING (status != 'posted');

-- سياسة منع تعديل فواتير الشراء المرحّلة
DROP POLICY IF EXISTS "Prevent editing posted PIs" ON public.purchase_invoices;
CREATE POLICY "Prevent editing posted PIs"
ON public.purchase_invoices
FOR UPDATE
USING (status != 'posted');

-- سياسة منع تعديل GRN المرحّلة
DROP POLICY IF EXISTS "Prevent editing posted GRN" ON public.goods_receipts;
CREATE POLICY "Prevent editing posted GRN"
ON public.goods_receipts
FOR UPDATE
USING (status != 'posted');

-- سياسة منع تعديل القيود اليومية المرحّلة
DROP POLICY IF EXISTS "Prevent editing posted journal entries" ON public.journal_entries;
CREATE POLICY "Prevent editing posted journal entries"
ON public.journal_entries
FOR UPDATE
USING (status != 'posted');

-- سياسة تسمح للمدير فقط بحذف المستندات غير المرحّلة
-- =========================================================

DROP POLICY IF EXISTS "Admin can delete draft POs only" ON public.purchase_orders;
CREATE POLICY "Admin can delete draft POs only"
ON public.purchase_orders
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND status = 'draft');

DROP POLICY IF EXISTS "Admin can delete draft PIs only" ON public.purchase_invoices;
CREATE POLICY "Admin can delete draft PIs only"
ON public.purchase_invoices
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND status = 'draft');

DROP POLICY IF EXISTS "Admin can delete draft GRN only" ON public.goods_receipts;
CREATE POLICY "Admin can delete draft GRN only"
ON public.goods_receipts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND status = 'draft');

-- إضافة تعليقات توضيحية
-- ======================
COMMENT ON POLICY "Admin manage gl_accounts" ON public.gl_accounts IS 'المدراء فقط يمكنهم إدارة دليل الحسابات';
COMMENT ON POLICY "Admin manage journal_entries" ON public.journal_entries IS 'المدراء فقط يمكنهم إدارة القيود اليومية';
COMMENT ON POLICY "Admin manage posting_rules" ON public.posting_rules IS 'المدراء فقط يمكنهم إدارة قواعد الترحيل';
COMMENT ON POLICY "Admin manage document_numbering_rules" ON public.document_numbering_rules IS 'المدراء فقط يمكنهم إدارة قواعد الترقيم';

-- ملخص الصلاحيات
-- ================
-- 
-- | الدور              | المبيعات | الشراء | المخزون | المحاسبة | الإعدادات |
-- |-------------------|---------|--------|---------|---------|----------|
-- | admin             | ✓✓✓     | ✓✓✓    | ✓✓✓     | ✓✓✓     | ✓✓✓      |
-- | pharmacist        | ✓✓      | قراءة   | قراءة    | قراءة    | قراءة     |
-- | cashier           | ✓       | -      | قراءة    | -       | -        |
-- | inventory_manager | -       | ✓✓     | ✓✓✓     | -       | -        |
-- 
-- ✓✓✓ = كل الصلاحيات (إنشاء، تعديل، حذف، ترحيل)
-- ✓✓  = إنشاء وتعديل
-- ✓   = إنشاء فقط
-- قراءة = عرض فقط
-- -   = لا صلاحية