# Security Hardening Guide | دليل تقوية الأمان

## نظرة عامة

هذا المستند يوثق التحسينات الأمنية المطبقة على نظام ERP الصيدلي والخطوات اليدوية المطلوبة لإكمال التقوية الأمنية.

---

## ✅ التحسينات المطبقة

### 1. تحويل العروض (Views) إلى SECURITY INVOKER وتقييد الوصول

جميع العروض التالية تم تحويلها لتستخدم `SECURITY INVOKER` وتحتوي على فلترة مبنية على الأدوار مما يعني:
- **لا يمكن للمستخدم المجهول (anon) الوصول لأي عرض**
- **يجب المصادقة والحصول على دور مناسب للوصول للبيانات**

| العرض | الوصول المسموح | التحقق من الدور |
|-------|---------------|-----------------|
| `safe_employee_details` | admin, pharmacist, inventory_manager, cashier | ✅ الراتب للمدير فقط |
| `safe_employees_summary` | admin, pharmacist, inventory_manager, cashier | ✅ |
| `safe_customers_summary` | admin, pharmacist, cashier | ✅ |
| `safe_suppliers_summary` | admin, pharmacist, inventory_manager | ✅ |
| `sales_by_currency` | admin, pharmacist | ✅ |
| `sales_summary_view` | admin, pharmacist | ✅ |
| `inventory_summary_view` | admin, pharmacist, inventory_manager | ✅ |
| `stock_alerts` | admin, pharmacist, inventory_manager | ✅ |
| `returns_statistics` | admin فقط | ✅ |
| `returns_inventory_impact` | admin, inventory_manager | ✅ |
| `posted_documents_audit` | admin فقط | ✅ |
| `returns_processing_monitor` | admin فقط | ✅ |
| `vw_latest_exchange_rates` | المستخدمين المصادق عليهم | ✅ |
| `vw_current_exchange_rates` | المستخدمين المصادق عليهم | ✅ |
| `vw_document_gl_links` | admin, pharmacist | ✅ |
| `public_company_info` | المستخدمين المصادق عليهم | ✅ |

### 2. إلغاء صلاحيات الوصول المجهول

تم تنفيذ الأوامر التالية لمنع الوصول المجهول:

```sql
REVOKE ALL ON <view_name> FROM anon, public;
GRANT SELECT ON <view_name> TO authenticated;
```

### 3. فرض RLS على الجداول الأساسية

تم تفعيل FORCE ROW LEVEL SECURITY على جميع الجداول الحساسة:

- `employees`, `customers`, `suppliers`
- `products`, `warehouse_stock`, `inventory_cost_layers`
- `sales_invoices`, `purchase_invoices`
- `sales_returns`, `purchase_returns`
- `stock_ledger`, `exchange_rates`, `company_branding`

### 2. نظام سجل التدقيق (Audit Logging)

تم إنشاء جدول `security_audit_log` لتتبع جميع التغييرات على الجداول الحساسة:

**الجداول المراقبة:**
- `suppliers` - الموردين
- `employees` - الموظفين
- `customers` - العملاء
- `purchase_invoices` - فواتير الشراء
- `purchase_orders` - أوامر الشراء
- `goods_receipts` - استلام البضائع
- `sales_invoices` - فواتير المبيعات
- `inventory_cost_layers` - طبقات تكلفة المخزون
- `cash_boxes` - الصناديق النقدية
- `gl_accounts` - الحسابات المحاسبية

**البيانات المسجلة:**
- `table_name` - اسم الجدول
- `record_id` - معرف السجل
- `action` - نوع العملية (INSERT, UPDATE, DELETE)
- `old_data` - البيانات القديمة (JSONB)
- `new_data` - البيانات الجديدة (JSONB)
- `changed_by` - المستخدم المنفذ
- `changed_at` - وقت التغيير

### 3. إصلاح قيد المفتاح الأجنبي

تم إزالة قيد `stock_ledger_batch_id_fkey` الذي كان يسبب أخطاء في ترحيل استلام البضائع.

---

## ⚠️ الخطوات اليدوية المطلوبة

### 1. تفعيل حماية كلمات المرور المسربة (Leaked Password Protection)

**المشكلة:**
ميزة حماية كلمات المرور المسربة معطلة حالياً. هذا يسمح للمستخدمين باستخدام كلمات مرور معروفة مسربة في قواعد بيانات الاختراق.

**الحل:**
هذا الإعداد **لا يمكن تغييره عبر الكود** ويتطلب إجراء يدوي:

1. انتقل إلى لوحة تحكم Lovable Cloud
2. اذهب إلى قسم **Users** → **Auth Settings**
3. ابحث عن خيار **"Leaked Password Protection"**
4. فعّل هذا الخيار

**الفائدة:**
عند التفعيل، النظام سيمنع المستخدمين من استخدام كلمات مرور موجودة في قواعد البيانات المسربة المعروفة (مثل Have I Been Pwned).

**التوصية:**
⚠️ **يوصى بشدة بتفعيل هذا الإعداد في بيئة الإنتاج.**

---

## 📊 ملخص قبل/بعد

| الجانب | قبل | بعد |
|--------|-----|-----|
| العروض المكشوفة | 14 عرضاً متاحاً للعموم | جميع العروض محمية بـ SECURITY INVOKER |
| سجل التدقيق | غير موجود | 10 جداول مراقبة |
| قيد batch_id | يسبب أخطاء | تم إزالته |
| حماية كلمات المرور | معطلة | تتطلب تفعيل يدوي |

---

## 🔒 أفضل الممارسات الإضافية

1. **مراجعة دورية للصلاحيات:**
   - راجع سياسات RLS شهرياً
   - تأكد من أن المستخدمين لديهم الحد الأدنى من الصلاحيات المطلوبة

2. **مراقبة سجل التدقيق:**
   - راجع سجل التدقيق أسبوعياً
   - ابحث عن أي نشاط مشبوه

3. **تحديث كلمات المرور:**
   - فرض تغيير كلمات المرور كل 90 يوماً
   - استخدم متطلبات قوة كلمة مرور صارمة

4. **النسخ الاحتياطي:**
   - تأكد من وجود نسخ احتياطية يومية
   - اختبر استعادة البيانات بشكل دوري

---

## 📞 الدعم

في حال وجود أي مشاكل أمنية، يرجى التواصل مع فريق تطوير النظام فوراً.

---

*آخر تحديث: ديسمبر 2024*
