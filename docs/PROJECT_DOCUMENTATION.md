# 📋 التوثيق التقني الشامل - نظام إدارة الصيدلية (Pharmacy ERP)

**تاريخ التحديث:** 2025-12-06  
**الإصدار:** 1.0  
**اللغة الأساسية:** العربية (RTL)

---

## 📑 فهرس المحتويات

1. [وصف عام للمشروع](#1-وصف-عام-للمشروع)
2. [هيكلية المشروع العامة](#2-هيكلية-المشروع-العامة)
3. [الواجهة الأمامية (Frontend)](#3-الواجهة-الأمامية-frontend)
4. [الخادم وقاعدة البيانات (Backend & Database)](#4-الخادم-وقاعدة-البيانات-backend--database)
5. [نظام تعدد العملات](#5-نظام-تعدد-العملات)
6. [تشغيل المشروع محلياً](#6-تشغيل-المشروع-محلياً)
7. [النشر والإنتاج](#7-النشر-والإنتاج)

---

## 1. وصف عام للمشروع

### 1.1 ما هو المشروع؟

نظام **Pharmacy ERP** هو نظام متكامل لإدارة موارد الصيدلية، مبني بتقنيات حديثة ويهدف إلى:

- **إدارة المبيعات**: فواتير البيع، المرتجعات، مدفوعات العملاء
- **نقطة البيع (POS)**: واجهة سريعة للبيع المباشر
- **إدارة المشتريات**: أوامر الشراء، فواتير الموردين، استلام البضائع
- **إدارة المخزون**: الجرد، تتبع الدفعات، تحويلات المستودعات
- **المحاسبة العامة (GL)**: شجرة الحسابات، القيود اليومية، التقارير المالية
- **تعدد العملات**: دعم كامل للريال اليمني (YER) كعملة أساسية والريال السعودي (SAR) وغيرها

### 1.2 المشكلة التي يحلها

| المشكلة | الحل |
|---------|------|
| إدارة المخزون يدوياً | جرد آلي مع تتبع FIFO للتكلفة |
| حسابات منفصلة | تكامل كامل بين المبيعات والمخزون والمحاسبة |
| عملات متعددة | تحويل تلقائي وقيود مزدوجة العملة |
| صعوبة التقارير | تقارير مالية فورية (ميزان مراجعة، ميزانية، قائمة دخل) |
| إدارة الصيدلية | وصفات طبية، تفاعلات دوائية، سجلات صحية |

### 1.3 كيف يُستخدم في صيدلية حقيقية؟

1. **بدء اليوم**: فتح جلسة POS
2. **البيع**: إصدار فواتير مبيعات سريعة أو تفصيلية
3. **الجرد**: جرد دوري مع مسح الباركود
4. **المشتريات**: أوامر شراء → استلام بضاعة → فواتير شراء
5. **المحاسبة**: ترحيل آلي للقيود اليومية
6. **التقارير**: تقارير مالية ومخزنية يومية/شهرية/سنوية

---

## 2. هيكلية المشروع العامة

### 2.1 بنية المجلدات

```
pharmacy-erp/
├── src/
│   ├── components/           # المكونات القابلة لإعادة الاستخدام
│   │   ├── ui/              # مكونات Shadcn UI (~50 مكون)
│   │   ├── currency/        # مكونات العملات (6 مكونات)
│   │   ├── customers/       # مكونات العملاء (4 مكونات)
│   │   ├── employees/       # مكونات الموظفين (2 مكونات)
│   │   ├── accounting/      # مكونات المحاسبة (6 مكونات)
│   │   └── pos/             # مكونات نقطة البيع (2 مكونات)
│   │
│   ├── pages/               # صفحات التطبيق (~100 صفحة)
│   │   ├── ProductSettings/ # إعدادات المنتجات
│   │   └── ...
│   │
│   ├── lib/                 # دوال المساعدة
│   │   ├── accounting.ts    # دوال المحاسبة (~3000 سطر)
│   │   ├── currency.ts      # دوال العملات (~334 سطر)
│   │   ├── inventory.ts     # دوال المخزون وFIFO (~450 سطر)
│   │   ├── pos.ts           # دوال نقطة البيع (~138 سطر)
│   │   ├── validation.ts    # دوال التحقق
│   │   └── utils.ts         # دوال مساعدة عامة
│   │
│   ├── hooks/               # React Hooks مخصصة
│   │   ├── use-toast.ts     # إشعارات Toast
│   │   ├── useDebounce.ts   # تأخير البحث
│   │   ├── useUserRole.ts   # التحقق من الصلاحيات
│   │   └── useCompanyBranding.ts
│   │
│   ├── types/               # تعريفات TypeScript
│   │   ├── accounting.ts    # أنواع المحاسبة
│   │   └── tree-menu.ts     # أنواع القائمة الشجرية
│   │
│   ├── data/                # بيانات ثابتة
│   │   ├── menu-tree.ts     # قائمة التنقل الشجرية
│   │   └── chart-of-accounts.ts
│   │
│   └── integrations/        # تكامل Supabase
│       └── supabase/
│           ├── client.ts    # عميل Supabase (لا تعدّل)
│           └── types.ts     # الأنواع المولّدة (لا تعدّل)
│
├── supabase/
│   ├── config.toml          # إعدادات Supabase (لا تعدّل)
│   ├── functions/           # Edge Functions
│   │   ├── manage-employee/
│   │   └── generate-journal-entry/
│   └── migrations/          # ~115 ملف migration
│
├── docs/                    # التوثيق
│   └── PROJECT_DOCUMENTATION.md
│
└── public/                  # الملفات العامة
```

### 2.2 الوحدات الرئيسية (Modules)

#### 📊 المبيعات (Sales)
| الصفحة | المسار | الوظيفة |
|--------|--------|---------|
| `SalesInvoices.tsx` | `/sales/invoices` | قائمة فواتير البيع |
| `NewSalesInvoice.tsx` | `/sales/invoice/new` | إنشاء فاتورة جديدة |
| `SalesInvoiceView.tsx` | `/sales/invoice/:id` | عرض فاتورة |
| `SalesReturns.tsx` | `/sales/returns` | مرتجعات المبيعات |
| `CustomerPayments.tsx` | `/sales/payments` | مدفوعات العملاء |

#### 🛒 نقطة البيع (POS)
| الصفحة | المسار | الوظيفة |
|--------|--------|---------|
| `POS.tsx` | `/pos` | واجهة البيع السريع |
| `POSNewSession.tsx` | `/pos/new-session` | فتح جلسة جديدة |
| `POSReports.tsx` | `/pos/reports` | تقارير الجلسات |

#### 📦 المخزون (Inventory)
| الصفحة | المسار | الوظيفة |
|--------|--------|---------|
| `Inventory.tsx` | `/inventory` | قائمة المنتجات |
| `StockCount.tsx` | `/inventory/stock-count` | جرد المخزون (3 خطوات) |
| `StockAdjustments.tsx` | `/inventory/adjustments` | تسويات المخزون |
| `BatchTracking.tsx` | `/inventory/batches` | تتبع الدفعات |
| `WarehouseTransfers.tsx` | `/inventory/transfers` | تحويلات المستودعات |

#### 🧾 المشتريات (Purchases)
| الصفحة | المسار | الوظيفة |
|--------|--------|---------|
| `PurchaseOrders.tsx` | `/purchases/orders` | أوامر الشراء |
| `PurchaseInvoices.tsx` | `/purchases/invoices` | فواتير الشراء |
| `GoodsReceipts.tsx` | `/purchases/receipts` | استلام البضائع |
| `PurchaseReturns.tsx` | `/purchases/returns` | مرتجعات المشتريات |

#### 📚 المحاسبة (GL)
| الصفحة | المسار | الوظيفة |
|--------|--------|---------|
| `ChartOfAccountsPage.tsx` | `/accounting/chart-of-accounts` | شجرة الحسابات |
| `ManualJournalEntry.tsx` | `/accounting/journal/new` | قيد يومية يدوي |
| `JournalEntriesList.tsx` | `/accounting/journal-entries` | قائمة القيود |
| `TrialBalance.tsx` | `/accounting/trial-balance` | ميزان المراجعة |
| `BalanceSheet.tsx` | `/accounting/balance-sheet` | الميزانية العمومية |
| `IncomeStatement.tsx` | `/accounting/income-statement` | قائمة الدخل |
| `AccountingPeriods.tsx` | `/accounting/periods` | الفترات المحاسبية |

#### 💱 تعدد العملات (Multi-Currency)
| الصفحة | المسار | الوظيفة |
|--------|--------|---------|
| `Currencies.tsx` | `/settings/currencies` | إدارة العملات |
| `ExchangeRates.tsx` | `/settings/exchange-rates` | أسعار الصرف |
| `CashBoxExchange.tsx` | `/treasury/exchange` | المصارفة بين الصناديق |

---

## 3. الواجهة الأمامية (Frontend)

### 3.1 التقنيات المستخدمة

| التقنية | الإصدار | الوظيفة |
|---------|---------|---------|
| **React** | 18.3.1 | إطار العمل الأساسي |
| **TypeScript** | 5.8.3 | الكتابة الآمنة |
| **Vite** | 5.4.19 | أداة البناء والتطوير |
| **Tailwind CSS** | 3.4.17 | تنسيق CSS |
| **Shadcn/UI** | Based on Radix | مكونات واجهة المستخدم |
| **@tanstack/react-query** | 5.83.0 | إدارة حالة البيانات والتخزين المؤقت |
| **react-router-dom** | 6.30.1 | التنقل بين الصفحات |
| **react-hook-form** | 7.61.1 | إدارة النماذج |
| **zod** | 3.25.76 | التحقق من البيانات |
| **recharts** | 2.15.4 | الرسوم البيانية |
| **lucide-react** | 0.462.0 | الأيقونات |
| **date-fns** | 3.6.0 | معالجة التواريخ |
| **sonner** | 1.7.4 | إشعارات Toast |

### 3.2 المكونات المهمة

#### 3.2.1 مكونات الفواتير

| المكون | الملف | الوظيفة |
|--------|-------|---------|
| `NewSalesInvoice` | `src/pages/NewSalesInvoice.tsx` | صفحة إنشاء فاتورة مبيعات كاملة |
| `SalesInvoiceView` | `src/pages/SalesInvoiceView.tsx` | عرض وترحيل الفاتورة |
| `InvoiceTotalsSummary` | `src/components/currency/DualAmountDisplay.tsx` | ملخص إجماليات الفاتورة |

#### 3.2.2 مكونات نقطة البيع (POS)

| المكون | الملف | الوظيفة |
|--------|-------|---------|
| `POSReceipt` | `src/components/pos/POSReceipt.tsx` | إيصال الطباعة |
| `POSSessionDialog` | `src/components/pos/POSSessionDialog.tsx` | نافذة إدارة الجلسة |

#### 3.2.3 مكونات المخزون والجرد

| المكون | الملف | الوظيفة |
|--------|-------|---------|
| `StockCount` | `src/pages/StockCount.tsx` | جرد المخزون (3 خطوات) |
| `StockAdjustments` | `src/pages/StockAdjustments.tsx` | تسويات المخزون |

#### 3.2.4 مكونات تعدد العملات

| المكون | الملف | الوظيفة |
|--------|-------|---------|
| `InvoiceCurrencyPanel` | `src/components/currency/InvoiceCurrencyPanel.tsx` | لوحة اختيار العملة في الفاتورة |
| `ExchangeRateDisplay` | `src/components/currency/ExchangeRateDisplay.tsx` | عرض سعر الصرف مع زر التحديث |
| `DualAmountDisplay` | `src/components/currency/DualAmountDisplay.tsx` | عرض المبلغ بعملتين |
| `InvoiceTotalsSummary` | `src/components/currency/DualAmountDisplay.tsx` | ملخص الإجماليات |
| `CustomerBalanceCard` | `src/components/currency/CustomerBalanceCard.tsx` | بطاقة رصيد العميل |
| `CashBoxCurrencyInfo` | `src/components/currency/CashBoxCurrencyInfo.tsx` | معلومات صندوق النقد |
| `CashBoxSelectorWithCurrency` | `src/components/currency/CashBoxCurrencyInfo.tsx` | اختيار الصندوق حسب العملة |

### 3.3 تدفق البيانات

```
Page (صفحة)
    ↓ useQuery() / useMutation()
Components (مكونات)
    ↓ props
Sub-components (مكونات فرعية)
    ↓ supabase.from() / supabase.rpc()
Supabase (قاعدة البيانات)
```

### 3.4 تدفق إنشاء فاتورة مبيعات

#### الخطوة 1: فتح الصفحة
```typescript
// src/pages/NewSalesInvoice.tsx - Lines 1-100
// تحميل البيانات الأولية
const { data: warehouses } = useQuery({ queryKey: ["warehouses"], ... });
const { data: products } = useQuery({ queryKey: ["products"], ... });
const { data: taxes } = useQuery({ queryKey: ["taxes"], ... });
const { data: paymentMethods } = useQuery({ queryKey: ["payment-methods"], ... });
```

#### الخطوة 2: اختيار العميل والمستودع والعملة
```typescript
// Lines 420-466
<CustomerCombobox value={customerId} onValueChange={setCustomerId} />
<Select value={warehouseId} onValueChange={setWarehouseId}>...</Select>
<InvoiceCurrencyPanel
  currencyCode={currencyCode}
  onCurrencyChange={handleCurrencyChange}
  invoiceDate={invoiceDate}
  customerCurrency={selectedCustomer?.currency_code}
/>
```

#### الخطوة 3: إضافة المنتجات
```typescript
// Lines 185-229 - handleAddItem
const newItem: InvoiceItem = {
  item_id: product.id,
  qty: selectedQty,
  unit_price: unitPrice,
  discount_percentage: discountPercentage,
  discount_amount: discountAmount,
  tax_percentage: taxRate,
  tax_amount: taxAmount,
  line_total: lineTotal,
};
setItems([...items, newItem]);
```

#### الخطوة 4: حساب الإجماليات
```typescript
// Lines 169-172
const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
const totalDiscount = items.reduce((sum, item) => sum + item.discount_amount, 0);
const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
const totalAmount = subtotal - totalDiscount + totalTax;
```

#### الخطوة 5: التعامل مع العملة وسعر الصرف
```typescript
// Lines 314-329
const effectiveRate = currencyCode === "YER" ? 1 : exchangeRate;

// حساب المبالغ بالعملة الأجنبية (FC) والأساسية (BC)
const subtotalFC = subtotalNet;
const subtotalBC = currencyCode === "YER" ? subtotalNet : subtotalNet * effectiveRate;
const totalFC = totalAmount;
const totalBC = currencyCode === "YER" ? totalAmount : totalAmount * effectiveRate;
```

#### الخطوة 6: حفظ الفاتورة
```typescript
// Lines 297-407 - saveMutation
// 1. توليد رقم الفاتورة
const { data: invoiceNumber } = await supabase.rpc("generate_si_number");

// 2. إنشاء كائن الفاتورة
const invoiceData = {
  invoice_number: invoiceNumber,
  customer_id: customerId,
  currency_code: currencyCode,
  exchange_rate: effectiveRate,
  subtotal_fc: subtotalFC,
  subtotal_bc: subtotalBC,
  total_amount_fc: totalFC,
  total_amount_bc: totalBC,
  // ...
};

// 3. إدخال الفاتورة
const { data: invoice } = await supabase.from("sales_invoices").insert(invoiceData).select().single();

// 4. إدخال بنود الفاتورة
await supabase.from("sales_invoice_items").insert(itemsToInsert);

// 5. التوجيه لصفحة العرض
navigate(`/sales/invoice/${invoice.id}`);
```

---

## 4. الخادم وقاعدة البيانات (Backend & Database)

### 4.1 نوع الـ Backend

- **Supabase** (PostgreSQL) عبر **Lovable Cloud**
- **Row Level Security (RLS)** مفعّل على جميع الجداول (~132 جدول)
- **Edge Functions** للعمليات المعقدة

### 4.2 Edge Functions

| الدالة | الملف | الوظيفة |
|--------|-------|---------|
| `manage-employee` | `supabase/functions/manage-employee/index.ts` | إدارة الموظفين بصلاحيات إدارية |
| `generate-journal-entry` | `supabase/functions/generate-journal-entry/index.ts` | إنشاء قيود محاسبية من المستندات |

### 4.3 أهم الجداول

#### 4.3.1 جداول المبيعات

##### `sales_invoices` - فواتير البيع
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID | المعرف الفريد |
| `invoice_number` | TEXT | رقم الفاتورة (فريد) |
| `customer_id` | UUID | معرف العميل |
| `warehouse_id` | UUID | معرف المستودع |
| `invoice_date` | DATE | تاريخ الفاتورة |
| `currency_code` | VARCHAR(3) | كود العملة (YER, SAR) |
| `exchange_rate` | NUMERIC | سعر الصرف وقت الفاتورة |
| `subtotal_fc` | NUMERIC | المجموع الفرعي بالعملة الأجنبية |
| `subtotal_bc` | NUMERIC | المجموع الفرعي بالريال اليمني |
| `discount_amount_fc` | NUMERIC | الخصم بالعملة الأجنبية |
| `discount_amount_bc` | NUMERIC | الخصم بالريال اليمني |
| `tax_amount_fc` | NUMERIC | الضريبة بالعملة الأجنبية |
| `tax_amount_bc` | NUMERIC | الضريبة بالريال اليمني |
| `total_amount_fc` | NUMERIC | الإجمالي بالعملة الأجنبية |
| `total_amount_bc` | NUMERIC | الإجمالي بالريال اليمني |
| `paid_amount_fc` | NUMERIC | المدفوع بالعملة الأجنبية |
| `paid_amount_bc` | NUMERIC | المدفوع بالريال اليمني |
| `status` | TEXT | الحالة (draft, posted, cancelled) |
| `payment_status` | TEXT | حالة الدفع (unpaid, partial, paid) |

##### `sales_invoice_items` - بنود الفاتورة
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID | المعرف الفريد |
| `invoice_id` | UUID | معرف الفاتورة |
| `item_id` | UUID | معرف المنتج |
| `line_no` | INTEGER | رقم السطر |
| `quantity` | NUMERIC | الكمية |
| `unit_price` | NUMERIC | سعر الوحدة |
| `discount_percentage` | NUMERIC | نسبة الخصم |
| `discount_amount` | NUMERIC | مبلغ الخصم |
| `tax_percentage` | NUMERIC | نسبة الضريبة |
| `tax_amount` | NUMERIC | مبلغ الضريبة |
| `line_total` | NUMERIC | إجمالي السطر |

#### 4.3.2 جداول العملاء والموردين

##### `customers` - العملاء
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID | المعرف الفريد |
| `name` | TEXT | اسم العميل |
| `phone` | TEXT | رقم الهاتف |
| `email` | TEXT | البريد الإلكتروني |
| `balance` | NUMERIC | الرصيد الحالي (بالريال اليمني) |
| `credit_limit` | NUMERIC | حد الائتمان |
| `currency_code` | VARCHAR(3) | العملة الافتراضية |
| `loyalty_points` | INTEGER | نقاط الولاء |

##### `suppliers` - الموردين
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID | المعرف الفريد |
| `name` | TEXT | اسم المورد |
| `balance` | NUMERIC | الرصيد الحالي |
| `credit_limit` | NUMERIC | حد الائتمان |
| `payment_terms` | TEXT | شروط الدفع |

#### 4.3.3 جداول المخزون

##### `products` - المنتجات
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID | المعرف الفريد |
| `name` | TEXT | اسم المنتج |
| `sku` | TEXT | رمز المنتج |
| `barcode` | TEXT | الباركود |
| `price` | NUMERIC | سعر البيع |
| `cost` | NUMERIC | التكلفة |
| `base_uom_id` | UUID | وحدة القياس الأساسية |

##### `warehouse_stock` - مخزون المستودعات
| العمود | النوع | الوصف |
|--------|-------|-------|
| `warehouse_id` | UUID | معرف المستودع |
| `item_id` | UUID | معرف المنتج |
| `qty_on_hand` | NUMERIC | الكمية المتاحة |
| `reorder_point` | NUMERIC | نقطة إعادة الطلب |

##### `inventory_cost_layers` - طبقات تكلفة FIFO
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID | المعرف الفريد |
| `item_id` | UUID | معرف المنتج |
| `warehouse_id` | UUID | معرف المستودع |
| `quantity` | NUMERIC | الكمية المتبقية |
| `unit_cost` | NUMERIC | تكلفة الوحدة |
| `received_date` | DATE | تاريخ الاستلام |

#### 4.3.4 جداول الصناديق والعملات

##### `cash_boxes` - صناديق النقد
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID | المعرف الفريد |
| `box_code` | VARCHAR | رمز الصندوق |
| `box_name` | VARCHAR | اسم الصندوق |
| `currency_code` | VARCHAR(3) | عملة الصندوق |
| `current_balance` | NUMERIC | الرصيد الحالي |
| `gl_account_id` | UUID | حساب الأستاذ المرتبط |

##### `cash_transactions` - حركات الصندوق
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID | المعرف الفريد |
| `cash_box_id` | UUID | معرف الصندوق |
| `transaction_type` | VARCHAR | نوع الحركة |
| `amount` | NUMERIC | المبلغ (قديم) |
| `amount_fc` | NUMERIC | المبلغ بالعملة الأجنبية |
| `amount_bc` | NUMERIC | المبلغ بالريال اليمني |
| `exchange_rate` | NUMERIC | سعر الصرف |
| `currency_code` | VARCHAR(3) | كود العملة |

##### `currencies` - العملات
| العمود | النوع | الوصف |
|--------|-------|-------|
| `code` | VARCHAR(3) | كود العملة (PK) |
| `name` | TEXT | اسم العملة (عربي) |
| `name_en` | TEXT | اسم العملة (إنجليزي) |
| `symbol` | TEXT | رمز العملة |
| `precision` | INTEGER | عدد الخانات العشرية |
| `is_base` | BOOLEAN | هل هي العملة الأساسية |
| `is_active` | BOOLEAN | هل نشطة |

##### `exchange_rates` - أسعار الصرف
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID | المعرف الفريد |
| `from_currency` | VARCHAR(3) | من عملة |
| `to_currency` | VARCHAR(3) | إلى عملة |
| `rate` | NUMERIC | سعر الصرف |
| `effective_date` | DATE | تاريخ السريان |

#### 4.3.5 جداول المحاسبة (GL)

##### `gl_accounts` - شجرة الحسابات
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID | المعرف الفريد |
| `account_code` | TEXT | رمز الحساب |
| `account_name` | TEXT | اسم الحساب |
| `account_type` | TEXT | نوع الحساب (assets, liabilities, equity, revenue, expense) |
| `parent_id` | UUID | الحساب الأب |
| `is_active` | BOOLEAN | هل نشط |

##### `gl_journal_entries` - قيود اليومية
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID | المعرف الفريد |
| `entry_no` | TEXT | رقم القيد |
| `entry_date` | DATE | تاريخ القيد |
| `posting_date` | DATE | تاريخ الترحيل |
| `description` | TEXT | الوصف |
| `source_module` | TEXT | المصدر (sales, purchases, inventory) |
| `source_document_id` | TEXT | معرف المستند المصدر |
| `is_posted` | BOOLEAN | هل مرحّل |
| `accounting_period_id` | UUID | معرف الفترة المحاسبية |

##### `gl_journal_lines` - بنود القيود
| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID | المعرف الفريد |
| `journal_entry_id` | UUID | معرف القيد |
| `account_id` | UUID | معرف الحساب |
| `description` | TEXT | الوصف |
| `debit` | NUMERIC | المدين (قديم) |
| `credit` | NUMERIC | الدائن (قديم) |
| `debit_fc` | NUMERIC | المدين بالعملة الأجنبية |
| `credit_fc` | NUMERIC | الدائن بالعملة الأجنبية |
| `debit_bc` | NUMERIC | المدين بالريال اليمني |
| `credit_bc` | NUMERIC | الدائن بالريال اليمني |
| `currency_code` | VARCHAR(3) | كود العملة |
| `exchange_rate` | NUMERIC | سعر الصرف |

### 4.4 دوال قاعدة البيانات (RPC Functions)

#### 4.4.1 دوال الترحيل

| الدالة | الوظيفة |
|--------|---------|
| `post_sales_invoice(p_invoice_id)` | ترحيل فاتورة بيع: تحديث المخزون + إنشاء قيد GL + تحديث رصيد العميل |
| `post_purchase_invoice(p_invoice_id)` | ترحيل فاتورة شراء: إضافة للمخزون + إنشاء قيد GL + تحديث رصيد المورد |
| `post_sales_return(p_return_id)` | ترحيل مرتجع بيع: استعادة المخزون + عكس القيد + رد رصيد العميل |
| `post_purchase_return(p_return_id)` | ترحيل مرتجع شراء |
| `post_inventory_adjustment(p_adjustment_id)` | ترحيل تسوية مخزون: FIFO + قيد GL |
| `post_pos_session(p_session_id, p_closing_cash)` | ترحيل جلسة POS: تجميع المبيعات + قيد GL |
| `post_customer_payment(p_payment_id)` | ترحيل سداد عميل |
| `post_goods_receipt(p_grn_id)` | ترحيل استلام بضاعة |

#### 4.4.2 دوال العملات

| الدالة | الوظيفة |
|--------|---------|
| `get_exchange_rate(from, to, date)` | جلب سعر الصرف لتاريخ معين |
| `execute_cash_box_exchange(...)` | تنفيذ مصارفة بين صناديق بعملات مختلفة |
| `generate_exchange_number()` | توليد رقم عملية المصارفة |

#### 4.4.3 دوال FIFO والتكلفة

| الدالة | الوظيفة |
|--------|---------|
| `allocate_fifo_cost(...)` | تخصيص تكلفة FIFO لبنود المبيعات |
| `consume_fifo_layers(...)` | استهلاك طبقات التكلفة عند البيع |

#### 4.4.4 دوال توليد الأرقام

| الدالة | الوظيفة |
|--------|---------|
| `generate_si_number()` | توليد رقم فاتورة مبيعات |
| `generate_pi_number()` | توليد رقم فاتورة مشتريات |
| `generate_journal_entry_number()` | توليد رقم قيد يومية |
| `generate_sales_return_number()` | توليد رقم مرتجع مبيعات |

---

## 5. نظام تعدد العملات

### 5.1 العملة الأساسية

- **الريال اليمني (YER)** هو العملة الأساسية للنظام
- جميع التقارير المالية والأرصدة المجمعة تكون بالريال اليمني
- جميع قيود GL تُخزن بقيمتين: FC (Foreign Currency) و BC (Base Currency = YER)

### 5.2 تخزين بيانات العملة في الفواتير

```sql
-- جدول sales_invoices
currency_code       VARCHAR(3)  -- 'YER' أو 'SAR'
exchange_rate       NUMERIC     -- 1 للـ YER، أو سعر الصرف للعملات الأخرى

-- المبالغ بالعملة الأجنبية (FC)
subtotal_fc         NUMERIC
discount_amount_fc  NUMERIC
tax_amount_fc       NUMERIC
total_amount_fc     NUMERIC
paid_amount_fc      NUMERIC

-- المبالغ بالريال اليمني (BC)
subtotal_bc         NUMERIC
discount_amount_bc  NUMERIC
tax_amount_bc       NUMERIC
total_amount_bc     NUMERIC
paid_amount_bc      NUMERIC
```

### 5.3 الربط بين العناصر

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ sales_invoices  │────▶│    customers    │────▶│   currencies    │
│ currency_code   │     │ currency_code   │     │      code       │
│ exchange_rate   │     │    balance      │     │    is_base      │
│ total_amount_fc │     │ (always in YER) │     │                 │
│ total_amount_bc │     └─────────────────┘     └─────────────────┘
└─────────────────┘
        │
        │ عند الترحيل
        ▼
┌─────────────────┐     ┌─────────────────┐
│ gl_journal_lines│────▶│   cash_boxes    │
│ debit_fc        │     │ currency_code   │
│ credit_fc       │     │ current_balance │
│ debit_bc        │     │                 │
│ credit_bc       │     └─────────────────┘
│ currency_code   │
│ exchange_rate   │
└─────────────────┘
```

### 5.4 فاتورة بالريال اليمني (YER)

عندما تكون العملة YER:

```typescript
// في NewSalesInvoice.tsx - Lines 316-327
const effectiveRate = currencyCode === "YER" ? 1 : exchangeRate;

// جميع القيم متساوية (FC = BC)
const subtotalFC = subtotalNet;
const subtotalBC = subtotalNet;  // نفس القيمة لأن YER هي الأساسية
const totalFC = totalAmount;
const totalBC = totalAmount;     // نفس القيمة
```

**النتيجة:**
- `exchange_rate = 1`
- `total_amount_fc = total_amount_bc = 10000`
- يُختار صندوق بعملة YER تلقائياً
- رصيد العميل يُحدّث بالريال اليمني

### 5.5 فاتورة بالريال السعودي (SAR)

عندما تكون العملة SAR:

```typescript
// افتراض: 1 SAR = 60 YER
const exchangeRate = 60;
const totalAmount = 1000; // SAR

const totalFC = 1000;                    // SAR
const totalBC = 1000 * 60 = 60000;       // YER
```

**النتيجة:**
- `exchange_rate = 60`
- `total_amount_fc = 1000` (SAR)
- `total_amount_bc = 60000` (YER)
- يُختار صندوق بعملة SAR
- رصيد العميل يُحدّث بـ 60,000 ريال يمني (دائماً YER)

### 5.6 قيود GL مزدوجة العملة

```sql
-- قيد بيع بالريال السعودي
INSERT INTO gl_journal_lines (
    account_id,           -- حساب العملاء
    debit_fc, credit_fc,  -- 1000, 0 (SAR)
    debit_bc, credit_bc,  -- 60000, 0 (YER)
    currency_code,        -- 'SAR'
    exchange_rate         -- 60
);
```

### 5.7 اختيار الصندوق النقدي

```typescript
// في CashBoxCurrencyInfo.tsx - Lines 72-78
// فلترة الصناديق حسب عملة المعاملة
const compatibleCashBoxes = cashBoxes.filter(
  (cb) => cb.currency_code === transactionCurrency
);

// إذا لم يوجد صندوق متوافق، يظهر تنبيه
if (compatibleCashBoxes.length === 0) {
  // "لا يوجد صندوق نقدي بعملة {transactionCurrency}"
}
```

### 5.8 تحديث رصيد العميل

```sql
-- في دالة post_sales_invoice
-- الرصيد يُحدّث دائماً بالريال اليمني
UPDATE customers
SET balance = balance + p_total_amount_bc  -- دائماً BC (YER)
WHERE id = p_customer_id;
```

---

## 6. تشغيل المشروع محلياً

### 6.1 المتطلبات (Prerequisites)

| المتطلب | الإصدار | ملاحظات |
|---------|---------|---------|
| **Node.js** | v18+ (يُفضل v20+) | [nodejs.org](https://nodejs.org) |
| **npm / pnpm / bun** | الأحدث | مدير الحزم |
| **Git** | الأحدث | للاستنساخ |
| **حساب Lovable / Supabase** | - | للـ Backend |

### 6.2 خطوات تشغيل الواجهة الأمامية

```bash
# 1. استنساخ المشروع
git clone <repository-url>
cd pharmacy-erp

# 2. تثبيت الحزم
npm install
# أو
pnpm install
# أو
bun install

# 3. إنشاء ملف البيئة
cp .env.example .env.local
# أو إنشاء .env يدوياً

# 4. تشغيل التطوير
npm run dev
```

### 6.3 ملف البيئة (.env)

```env
# معلومات Supabase (من Lovable Cloud أو مشروع Supabase)
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

**للحصول على هذه القيم:**
1. من **Lovable Cloud**: Backend → Settings
2. من **Supabase Dashboard**: Settings → API

### 6.4 إعداد قاعدة البيانات

#### الخيار 1: Lovable Cloud (الأسهل)

```bash
# التطبيق يتم تلقائياً عند النشر
# الـ migrations تُطبق آلياً
```

#### الخيار 2: Supabase خارجي

```bash
# 1. تثبيت Supabase CLI
npm install -g supabase

# 2. تسجيل الدخول
supabase login

# 3. ربط المشروع
supabase link --project-ref your-project-ref

# 4. تطبيق الـ migrations
supabase db push

# 5. (اختياري) إعادة توليد الأنواع
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### 6.5 تشغيل Edge Functions محلياً

```bash
# تشغيل Edge Functions محلياً
supabase functions serve

# أو تشغيل دالة محددة
supabase functions serve manage-employee
```

### 6.6 أوامر البناء والتطوير

```bash
# تشغيل التطوير
npm run dev

# بناء للإنتاج
npm run build

# معاينة البناء
npm run preview

# فحص الكود
npm run lint
```

---

## 7. النشر والإنتاج

### 7.1 طريقة النشر

| الجزء | المنصة |
|-------|--------|
| Frontend | Lovable (تلقائي) / Vercel / Netlify |
| Backend | Lovable Cloud / Supabase |
| Edge Functions | تُنشر تلقائياً مع المشروع |

### 7.2 متغيرات البيئة للإنتاج

```env
# استخدم مفاتيح الإنتاج (ليس التطوير)
VITE_SUPABASE_URL="https://prod-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-prod-anon-key"
```

### 7.3 تنبيهات أمنية مهمة

| ⚠️ تنبيه | التفاصيل |
|----------|----------|
| **Service Role Key** | لا تكشفه أبداً في الـ Frontend |
| **RLS** | تأكد من تفعيله على جميع الجداول |
| **Edge Functions** | تستخدم Service Role داخلياً فقط |
| **Leaked Password Protection** | فعّلها من لوحة التحكم |
| **Auto-confirm Email** | للتطوير فقط، عطّلها في الإنتاج |

### 7.4 نقل المشروع لجهاز/خادم آخر

1. **استنسخ الكود**: `git clone`
2. **ثبّت الحزم**: `npm install`
3. **أنشئ ملف .env** بالقيم الصحيحة
4. **اربط بـ Supabase** إذا لزم الأمر
5. **شغّل**: `npm run dev` أو `npm run build`

---

## 📚 ملحقات

### A. قائمة الصفحات الكاملة

<details>
<summary>اضغط للعرض (~100 صفحة)</summary>

```
src/pages/
├── AccountLedger.tsx
├── AccountMappingsConfig.tsx
├── AccountSettings.tsx
├── AccountingIntegration.tsx
├── AccountingPeriods.tsx
├── ActivityLog.tsx
├── ArApGlReconciliation.tsx
├── Attendance.tsx
├── AuditLog.tsx
├── Auth.tsx
├── BalanceSheet.tsx
├── BankReconciliation.tsx
├── BatchTracking.tsx
├── CRMDashboard.tsx
├── CRMReports.tsx
├── CashBoxExchange.tsx
├── CashFlowStatement.tsx
├── Categories.tsx
├── ChartOfAccountsPage.tsx
├── CompanyBranding.tsx
├── CompanyProfile.tsx
├── ComplaintsReports.tsx
├── CostCenters.tsx
├── Currencies.tsx
├── CustomerAgingReport.tsx
├── CustomerAuth.tsx
├── CustomerComplaints.tsx
├── CustomerPayments.tsx
├── CustomerPortal.tsx
├── CustomerProfile.tsx
├── CustomerStatement.tsx
├── Customers.tsx
├── Dashboard.tsx
├── Doctors.tsx
├── DrugInteractions.tsx
├── EInvoicing.tsx
├── EmployeeReports.tsx
├── Employees.tsx
├── ExchangeRates.tsx
├── ExecutiveDashboard.tsx
├── Expenses.tsx
├── FinancialRatios.tsx
├── GoodsReceipts.tsx
├── HealthRecords.tsx
├── IncomeStatement.tsx
├── Index.tsx
├── InsuranceCompanies.tsx
├── Inventory.tsx
├── InventoryDashboard.tsx
├── InventoryReports.tsx
├── InventorySettings.tsx
├── InventoryTurnover.tsx
├── JournalEntriesList.tsx
├── JournalEntryDetail.tsx
├── Leaves.tsx
├── ManualJournalEntry.tsx
├── MarketingCampaigns.tsx
├── NotFound.tsx
├── OpeningBalances.tsx
├── OperationalPerformance.tsx
├── POS.tsx
├── POSNewSession.tsx
├── POSProfitReports.tsx
├── POSReports.tsx
├── POSSalesReports.tsx
├── POSSettings.tsx
├── PaymentMethods.tsx
├── Performance.tsx
├── PharmacyReports.tsx
├── Prescriptions.tsx
├── PriceLists.tsx
├── ProductProfitability.tsx
├── ProductSettings.tsx
├── Products.tsx
├── ProductsAdvanced.tsx
├── PurchaseInvoices.tsx
├── PurchaseOrders.tsx
├── PurchaseReturns.tsx
├── Reports.tsx
├── ReportsDashboard.tsx
├── RevenueByCategory.tsx
├── RolesManagement.tsx
├── RolesPermissions.tsx
├── SalesInvoiceView.tsx
├── SalesInvoices.tsx
├── SalesReports.tsx
├── SalesReturns.tsx
├── Settings.tsx
├── StockAdjustments.tsx
├── StockAlerts.tsx
├── StockCount.tsx
├── StockMovements.tsx
├── SupplierAgingReport.tsx
├── SupplierReports.tsx
├── SupplierStatement.tsx
├── Suppliers.tsx
├── Tasks.tsx
├── TaxCompliance.tsx
├── TaxReports.tsx
├── Taxes.tsx
├── TrialBalance.tsx
├── UnitOfMeasures.tsx
├── UserManagement.tsx
├── VATReturns.tsx
├── WarehouseStock.tsx
├── WarehouseTransfers.tsx
└── Warehouses.tsx
```

</details>

### B. مراجع مفيدة

- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Shadcn/UI Components](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**📝 ملاحظة:** هذا التوثيق يعكس حالة المشروع في تاريخ 2025-12-06. يُرجى تحديثه عند إجراء تغييرات جوهرية.
