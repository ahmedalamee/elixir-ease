# Free Purchase Items (Bonus Quantity) - دعم الكميات المجانية من الموردين

## 📌 تاريخ التنفيذ: 2026-02-08

---

## 1️⃣ الهدف

دعم الكميات المجانية (Bonus/Free Qty) التي يقدمها الموردين كجزء من صفقات الشراء، مع الحفاظ على:
- **الفصل المحاسبي**: الكميات المجانية لا تُحتسب في تكلفة الشراء
- **التتبع الصارم**: لا يمكن تعديل المخزون المجاني يدوياً
- **القابلية للتدقيق**: سجل كامل لجميع التغييرات على المخزون المجاني

---

## 2️⃣ التغييرات في قاعدة البيانات

### جدول `pi_items` (بنود فاتورة الشراء)
```sql
free_qty NUMERIC NOT NULL DEFAULT 0 CHECK (free_qty >= 0)
```

### جدول `warehouse_stock` (مخزون المستودعات)
```sql
free_quantity NUMERIC NOT NULL DEFAULT 0
```

### جدول التدقيق `free_stock_audit_log`
```sql
CREATE TABLE public.free_stock_audit_log (
  id UUID PRIMARY KEY,
  warehouse_id UUID NOT NULL,
  item_id UUID NOT NULL,
  operation TEXT NOT NULL, -- 'add', 'adjust', 'convert'
  quantity_change NUMERIC NOT NULL,
  quantity_before NUMERIC NOT NULL,
  quantity_after NUMERIC NOT NULL,
  source_document_type TEXT,
  source_document_id UUID,
  source_document_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
```

---

## 3️⃣ قواعد الحماية (Database Triggers)

### `trg_protect_free_quantity`
يمنع التعديل اليدوي على `free_quantity` ويسجل أي محاولة مخالفة في `erp_violation_log`.

**السماح فقط للدوال المعتمدة:**
- `post_purchase_invoice`
- `post_purchase_return`
- `convert_free_stock`
- `post_stock_adjustment`

---

## 4️⃣ منطق الترحيل

عند ترحيل فاتورة شراء (`post_purchase_invoice`):

```
للمنتج X:
  - qty (الكمية المشتراة) = 100
  - free_qty (الكمية المجانية) = 20

النتيجة:
  - qty_on_hand += 100 (المخزون العادي)
  - free_quantity += 20 (المخزون المجاني)
  - FIFO Layer: تُنشأ لـ 100 وحدة فقط (لا تشمل الكمية المجانية)
```

---

## 5️⃣ Views المحدّثة

### `v_stock_levels`
```sql
- total_quantity: الكمية الإجمالية (qty_on_hand)
- free_quantity: الكمية المجانية
- total_stock_with_free: المجموع الكلي (qty_on_hand + free_quantity)
- available_quantity: الكمية المتاحة للبيع
```

### `v_comprehensive_stock_status`
```sql
- free_quantity: الكمية المجانية
- total_stock_with_free: المجموع الكلي
```

### `v_product_stock_summary`
```sql
- free_stock: إجمالي المخزون المجاني عبر جميع المستودعات
- total_stock_with_free: المجموع الكلي
```

---

## 6️⃣ قيود البيع (CRITICAL)

**الكمية المجانية لا تُستهلك تلقائياً في فواتير البيع.**

- فواتير البيع تستهلك فقط من `qty_on_hand`
- `free_quantity` للتتبع والتدقيق فقط
- لتحويل الكمية المجانية للمخزون العادي: استخدم تسوية مخزنية معتمدة

---

## 7️⃣ تغييرات الواجهة (UI)

### صفحة فواتير الشراء (`/purchase-invoices`)
- عمود جديد: **"كمية مجانية"** في جدول البنود
- حقل إدخال للكمية المجانية لكل بند

### صفحة المخزون (`/warehouse-stock`)
- عمود جديد: **"مجاني"** في جدول المخزون

### مكون `LineItemsTable`
- دعم حقل `free_qty` في واجهة `LineItem`
- عمود إدخال للكمية المجانية

---

## 8️⃣ سجل التدقيق

يتم تسجيل جميع التغييرات على المخزون المجاني في:
1. `free_stock_audit_log` - سجل مخصص للكميات المجانية
2. `stock_ledger` - مع نوع الحركة `free_purchase`

---

## 9️⃣ أمثلة استخدام

### إنشاء فاتورة شراء مع كمية مجانية
1. إنشاء فاتورة شراء من GRN أو PO
2. إدخال الكمية المجانية لكل بند
3. حفظ الفاتورة
4. ترحيل الفاتورة → تُضاف الكميات المجانية تلقائياً

### عرض المخزون المجاني
```sql
SELECT * FROM v_stock_levels WHERE free_quantity > 0;
```

---

## 🔒 الامتثال لقواعد ERP

- ✅ لا يمكن تعديل `free_quantity` يدوياً
- ✅ التغييرات عبر المستندات الرسمية فقط
- ✅ سجل تدقيق كامل
- ✅ الفصل بين المخزون العادي والمجاني
- ✅ حماية على مستوى قاعدة البيانات (Triggers)
