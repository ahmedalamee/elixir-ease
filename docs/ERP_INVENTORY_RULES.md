# قواعد نظام ERP للمخزون الصارم

## 📌 تاريخ التحديث: 2026-01-31

---

## 1️⃣ مبدأ التحكم بالمخزون (القاعدة الذهبية)

### ❌ ممنوع:
- إدخال أو تعديل كمية المخزون عند إنشاء المنتج
- التعديل المباشر على `qty_on_hand` في جدول `warehouse_stock`

### ✅ مسموح فقط عبر:
- ✅ فواتير الشراء (`post_purchase_invoice`)
- ✅ مرتجعات الشراء (`post_purchase_return`)
- ✅ فواتير البيع (`post_sales_invoice`)
- ✅ مرتجعات البيع (`post_sales_return`)
- ✅ التسويات المخزنية المعتمدة (`post_stock_adjustment`)
- ✅ استلام البضاعة (`post_goods_receipt`)
- ✅ التحويلات بين المخازن (`post_warehouse_transfer`)

### التطبيق التقني:
```sql
-- Trigger يمنع التعديل المباشر
CREATE TRIGGER trg_strict_stock_protection
BEFORE INSERT OR UPDATE ON public.warehouse_stock
FOR EACH ROW EXECUTE FUNCTION public.trg_strict_stock_protection();
```

---

## 2️⃣ قفل المخزون (Inventory Locking)

### عند إنشاء مستند مؤثر على المخزون:
1. يتم **حجز الكمية فوراً** (Reserved Quantity)
2. **لا يجوز**:
   - بيع كمية محجوزة
   - تعديلها يدوياً
   - حذف المستند دون فك الحجز تلقائياً

### مستويات المخزون المعروضة:
| المستوى | الوصف |
|---------|-------|
| **الكمية الكلية** | إجمالي المخزون الفعلي |
| **الكمية المحجوزة** | كميات مربوطة بفواتير بيع قيد المعالجة |
| **الكمية المتاحة** | الكمية القابلة للبيع = الكلية - المحجوزة |
| **الكمية في الطريق** | كميات قادمة من أوامر شراء معتمدة |

### دالة حساب الكمية المتاحة:
```sql
SELECT public.get_available_stock(product_id, warehouse_id);
```

---

## 3️⃣ دورة المشتريات الإلزامية

```
طلب شراء (PR) 
    ⬇
طلب تسعير (RFQ)
    ⬇
عرض سعر (Quotation)
    ⬇
أمر شراء (PO)
    ⬇
استلام بضاعة (GRN)
    ⬇
فاتورة شراء (PI)
```

### 🔒 القواعد:
- ❌ **لا يمكن تخطي أي مرحلة**
- ✅ كل مستند يرث المنتجات والكميات من المستند السابق
- ❌ لا يمكن تعديل الكميات في المراحل المتقدمة إلا ضمن الحدود المسموحة
- ✅ **الكمية تُضاف للمخزون فقط عند ترحيل فاتورة الشراء**

---

## 4️⃣ فاتورة الشراء (نقطة التحكم الحرجة)

### القيود:
- ❌ **لا تسمح بإضافة منتجات يدويًا**
- ✅ تختار فقط من:
  - أمر شراء (PO) معتمد
  - استلام بضاعة (GRN) مرحّل

### عند الترحيل:
1. تُضاف الكمية للمخزون
2. يُفك الحجز
3. تُسجل طبقة تكلفة (FIFO)
4. تُنشأ قيود محاسبية تلقائية

### التطبيق التقني:
```sql
-- Trigger يمنع فاتورة شراء مباشرة
CREATE TRIGGER trg_validate_purchase_invoice_source
BEFORE INSERT ON public.purchase_invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_purchase_invoice_source();
```

---

## 5️⃣ البيع وقفل الكمية

### عند إنشاء فاتورة بيع:
1. التحقق من الكمية **المتاحة فقط** (ليس الكلية)
2. حجز الكمية فوراً في `stock_reservations`

### عند الترحيل:
1. تُخصم من المخزون
2. تُحدّث تكلفة البيع (COGS)
3. يُفك الحجز

### عند الإلغاء:
- يتم فك الحجز تلقائياً

### التطبيق التقني:
```sql
-- Trigger للتحقق من التوفر
CREATE TRIGGER trg_check_sales_availability
BEFORE INSERT OR UPDATE ON public.sales_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.trg_check_sales_availability();

-- Trigger لحجز الكمية
CREATE TRIGGER trg_reserve_sales_stock
AFTER INSERT ON public.sales_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.trg_reserve_sales_stock();
```

---

## 6️⃣ منع تعديل/حذف المستندات المرحّلة

### القاعدة:
- ❌ **لا يمكن تعديل مستند مرحّل**
- ❌ **لا يمكن حذف مستند مرحّل**
- ✅ يمكن فقط إنشاء **مستند عكسي** (Reversal)

### الجداول المحمية:
- `purchase_invoices`
- `sales_invoices`
- `goods_receipts`
- `stock_adjustments`

---

## 7️⃣ قواعد صارمة غير قابلة للتفاوض

| القاعدة | التطبيق |
|---------|---------|
| ❌ لا تعديل مباشر على `qty_on_hand` | Trigger `trg_strict_stock_protection` |
| ❌ لا حذف مستند مرحّل | Trigger `trg_prevent_posted_modification` |
| ❌ لا بيع بدون توفر | Trigger `trg_check_sales_availability` |
| ❌ لا شراء بدون أمر شراء | Trigger `trg_validate_purchase_invoice_source` |
| ❌ لا فاتورة شراء بدون PO أو GRN | Trigger `trg_validate_purchase_invoice_source` |

---

## 8️⃣ الواجهات المحدّثة

### صفحة المنتجات (`/products`):
- عرض 4 مستويات للمخزون (إجمالي، متاح، محجوز، في الطريق)
- فلتر حسب حالة المخزون

### صفحة فواتير الشراء (`/purchase-invoices`):
- إزالة خيار "مباشرة"
- إجبار الاختيار من GRN أو PO فقط

### صفحة فواتير البيع (`/sales-invoice`):
- التحقق من الكمية المتاحة قبل الإضافة
- رسالة خطأ واضحة عند نقص المخزون

---

## 📊 View شامل لحالة المخزون

```sql
SELECT * FROM public.v_comprehensive_stock_status
WHERE warehouse_id = 'xxx' AND product_id = 'yyy';
```

**الأعمدة:**
- `product_id`, `product_name`, `barcode`
- `warehouse_id`, `warehouse_name`
- `total_quantity` - الكمية الكلية
- `reserved_quantity` - الكمية المحجوزة
- `inbound_quantity` - الكمية في الطريق
- `available_quantity` - الكمية المتاحة
- `stock_status` - حالة المخزون (in_stock, low_stock, out_of_stock)
