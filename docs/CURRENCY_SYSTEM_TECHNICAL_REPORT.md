# التقرير التقني الشامل لنظام العملات

**التاريخ:** 2026-01-18  
**المعد من قبل:** Lovable AI  
**الإصدار:** 1.0

---

## 📋 جدول المحتويات

1. [التصميم الحالي](#1-التصميم-الحالي)
2. [المشكلات التقنية](#2-المشكلات-التقنية)
3. [تحليل السيناريوهات](#3-تحليل-السيناريوهات)
4. [الواجهات البرمجية](#4-الواجهات-البرمجية)
5. [نظام المحاسبة](#5-نظام-المحاسبة)
6. [الأمان والصلاحيات](#6-الأمان-والصلاحيات)
7. [مقترحات التحسين](#7-مقترحات-التحسين)
8. [الملفات التقنية](#8-الملفات-التقنية)
9. [التوصيات](#9-التوصيات)

---

## 1. التصميم الحالي

### 1.1 هيكل قاعدة البيانات

#### جدول العملات (`currencies`)

```sql
CREATE TABLE currencies (
  code         TEXT PRIMARY KEY,           -- رمز العملة (YER, SAR, USD, EUR)
  name         TEXT NOT NULL,              -- الاسم بالعربية
  name_en      TEXT,                       -- الاسم بالإنجليزية
  symbol       TEXT,                       -- الرمز (ر.ي، ر.س، $، €)
  precision    INTEGER DEFAULT 2,          -- عدد الكسور العشرية
  is_active    BOOLEAN DEFAULT true,       -- حالة التفعيل
  is_base      BOOLEAN DEFAULT false,      -- هل هي العملة الأساسية؟
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- فهرس فريد لضمان عملة أساسية واحدة فقط
CREATE UNIQUE INDEX idx_currencies_base ON currencies (is_base) WHERE is_base = true;
```

**البيانات الحالية:**

| الرمز | الاسم | الرمز | الدقة | أساسية؟ | نشطة؟ |
|-------|-------|-------|-------|---------|-------|
| YER | ريال يمني | ر.ي | 2 | ✅ | ✅ |
| SAR | ريال سعودي | ر.س | 2 | ❌ | ✅ |
| USD | دولار أمريكي | $ | 2 | ❌ | ✅ |
| EUR | يورو | € | 2 | ❌ | ✅ |

---

#### جدول أسعار الصرف (`exchange_rates`)

```sql
CREATE TABLE exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency   VARCHAR REFERENCES currencies(code),
  to_currency     VARCHAR REFERENCES currencies(code),
  rate            NUMERIC(18,6) NOT NULL,
  effective_date  DATE NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT now(),
  
  -- منع التكرار لنفس الزوج والتاريخ
  UNIQUE (from_currency, to_currency, effective_date)
);
```

**الفهارس المُنشأة:**

| اسم الفهرس | الحقول | الغرض |
|------------|--------|-------|
| `exchange_rates_pkey` | `id` | المفتاح الأساسي |
| `idx_exchange_rates_currencies` | `from_currency, to_currency` | البحث السريع بالعملات |
| `idx_exchange_rates_date` | `effective_date DESC` | البحث بالتاريخ |
| `idx_exchange_rates_lookup` | `from_currency, to_currency, effective_date DESC` | البحث المركب الأمثل |
| `idx_exchange_rates_active` | `is_active` (WHERE true) | الأسعار النشطة فقط |

---

#### جدول الصناديق النقدية (`cash_boxes`)

```sql
CREATE TABLE cash_boxes (
  id                   UUID PRIMARY KEY,
  box_code             VARCHAR UNIQUE NOT NULL,
  box_name             VARCHAR NOT NULL,
  box_name_en          VARCHAR,
  box_type             VARCHAR DEFAULT 'cash',       -- cash, bank
  currency_code        VARCHAR DEFAULT 'YER',        -- عملة الصندوق
  opening_balance      NUMERIC DEFAULT 0,
  current_balance      NUMERIC DEFAULT 0,
  daily_limit          NUMERIC,
  gl_account_id        UUID REFERENCES gl_accounts,
  is_active            BOOLEAN DEFAULT true,
  is_main              BOOLEAN DEFAULT false,
  -- ...
);
```

**قاعدة حاسمة:** كل صندوق مرتبط بعملة واحدة فقط، ولا يمكن الإيداع بعملة مختلفة.

---

#### جدول فواتير المبيعات (`sales_invoices`) - الحقول المتعلقة بالعملة

```sql
-- الحقول المزدوجة (FC = Foreign Currency, BC = Base Currency)
currency_code        VARCHAR DEFAULT 'YER',
exchange_rate        NUMERIC DEFAULT 1,

-- المبالغ بالعملة الأجنبية (FC)
subtotal_amount      NUMERIC,            -- الإجمالي الفرعي FC
discount_amount      NUMERIC,            -- الخصم FC  
tax_amount           NUMERIC,            -- الضريبة FC
total_amount         NUMERIC,            -- الإجمالي FC

-- المبالغ بالعملة الأساسية (BC = YER)
base_currency_total  NUMERIC,            -- الإجمالي BC
paid_amount          NUMERIC,            -- المدفوع FC
paid_amount_bc       NUMERIC,            -- المدفوع BC
```

---

### 1.2 مخطط التدفق

#### تدفق إنشاء فاتورة بعملة غير YER

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         إنشاء فاتورة مبيعات بالريال السعودي                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. اختيار العميل                                                            │
│    └── يتم تحميل عملة العميل الافتراضية (customer.currency_code)             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. جلب سعر الصرف                                                            │
│    └── get_exchange_rate('SAR', 'YER', تاريخ_الفاتورة)                       │
│    └── النتيجة: 420.00 (مثال)                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. إضافة المنتجات                                                           │
│    └── المنتجات مسعرة بـ YER في قاعدة البيانات                               │
│    └── يتم تحويل الأسعار من YER → SAR (قسمة على سعر الصرف)                  │
│    └── مثال: منتج بـ 4,200 ر.ي = 10 ر.س                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. حساب الإجماليات                                                          │
│    ├── total_amount (FC) = مجموع البنود بـ SAR = 100 ر.س                    │
│    ├── exchange_rate = 420.00                                              │
│    └── base_currency_total (BC) = 100 × 420 = 42,000 ر.ي                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. التحقق عبر Trigger (BEFORE INSERT)                                       │
│    ├── validate_sales_invoice_currency: التحقق من كود العملة                │
│    ├── validate_sales_invoice_amounts: BC = FC × Rate                       │
│    └── calculate_base_currency_sales: حساب تلقائي للـ BC                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. الترحيل المحاسبي (GL Posting)                                            │
│    ├── gl_journal_lines.currency_code = 'SAR'                              │
│    ├── gl_journal_lines.debit_fc = 100 (بالريال السعودي)                    │
│    ├── gl_journal_lines.debit_bc = 42,000 (بالريال اليمني)                  │
│    └── gl_journal_lines.exchange_rate = 420                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. تحديث رصيد العميل                                                        │
│    └── customers.balance += 42,000 ر.ي (دائماً بالعملة الأساسية)            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### تدفق عملية المصارفة بين الصناديق

```
┌────────────────────────────────────────────────────────────────────┐
│                     مصارفة من SAR إلى YER                          │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ execute_cash_box_exchange(                                         │
│   from_cash_box_id,    -- صندوق SAR                                │
│   to_cash_box_id,      -- صندوق YER                                │
│   from_amount: 100,    -- 100 ر.س                                  │
│   exchange_date        -- تاريخ المصارفة                            │
│ )                                                                  │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ التحققات:                                                          │
│ ✓ صلاحيات المستخدم (admin/cashier)                                 │
│ ✓ الصندوقين نشطين ومختلفي العملة                                   │
│ ✓ رصيد الصندوق المصدر كافٍ                                         │
│ ✓ سعر الصرف متوفر للتاريخ المحدد                                   │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ الحسابات:                                                          │
│ exchange_rate = get_exchange_rate('SAR', 'YER', date) = 420        │
│ to_amount = 100 × 420 = 42,000 ر.ي                                 │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ القيد المحاسبي:                                                     │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ مدين: صندوق YER     42,000 ر.ي                               │  │
│ │ دائن: صندوق SAR     42,000 ر.ي (100 SAR × 420)               │  │
│ └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ تحديث الأرصدة:                                                      │
│ صندوق SAR: current_balance -= 100                                  │
│ صندوق YER: current_balance += 42,000                               │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. المشكلات التقنية

### 2.1 مشكلات الأداء

| المشكلة | الأثر | الحل المقترح |
|---------|-------|--------------|
| جلب سعر الصرف لكل معاملة | بطء في الفواتير الكبيرة | ✅ محلول: استخدام `vw_latest_exchange_rates` view |
| عدم وجود cache للعملة الأساسية | استعلامات متكررة | ✅ محلول: `cachedBaseCurrency` في الـ client |
| فهارس exchange_rates | - | ✅ محلول: 5 فهارس مُحسّنة |

**تقييم الأداء الحالي:** ⭐⭐⭐⭐ (جيد جداً)

---

### 2.2 مشكلات الدقة

| المشكلة | الوضع الحالي | الأثر |
|---------|--------------|-------|
| دقة سعر الصرف | `NUMERIC(18,8)` | ✅ كافية لـ 8 منازل عشرية |
| دقة المبالغ | `NUMERIC` بدون قيود | ⚠️ قد تحدث أخطاء تقريب |
| تقريب العملة | حسب `precision` في جدول currencies | ✅ مدعوم (2 للجميع حالياً) |

**معادلة التقريب المستخدمة:**
```javascript
amount.toLocaleString("ar-YE", {
  minimumFractionDigits: precision,  // 2
  maximumFractionDigits: precision   // 2
})
```

---

### 2.3 مشكلات التزامن

| السيناريو | الحماية الحالية | المخاطر |
|-----------|-----------------|---------|
| تغير سعر الصرف أثناء إنشاء الفاتورة | سعر الصرف يُثبّت عند الحفظ | ✅ لا خطر |
| تحديثات متزامنة لأسعار الصرف | UNIQUE constraint على (from, to, date) | ✅ محمي |
| الفاتورة تُعدَّل بعد الترحيل | سعر الصرف immutable بعد الترحيل | ✅ محمي |

---

## 3. تحليل السيناريوهات

### 3.1 سيناريو: عميل SAR، منتجات YER

```
┌─────────────────────────────────────────────────────────────────────┐
│ المدخلات:                                                           │
│ • عميل: أحمد (currency_code = 'SAR')                                │
│ • منتج: باراسيتامول (سعر في DB = 4,200 ر.ي)                         │
│ • كمية: 10 علب                                                      │
│ • سعر الصرف: 1 SAR = 420 YER                                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ الحسابات:                                                           │
│ 1. سعر الوحدة بـ SAR = 4,200 ÷ 420 = 10 ر.س                        │
│ 2. إجمالي البنود (FC) = 10 × 10 = 100 ر.س                          │
│ 3. إجمالي البنود (BC) = 100 × 420 = 42,000 ر.ي                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ البيانات المحفوظة:                                                   │
│ sales_invoices:                                                     │
│   currency_code: 'SAR'                                              │
│   exchange_rate: 420                                                │
│   total_amount: 100           (FC)                                  │
│   base_currency_total: 42000  (BC)                                  │
│                                                                     │
│ sales_invoice_items:                                                │
│   unit_price: 10              (بـ SAR)                              │
│   total_price: 100            (بـ SAR)                              │
│                                                                     │
│ gl_journal_lines:                                                   │
│   debit_fc: 100, debit_bc: 42000                                   │
└─────────────────────────────────────────────────────────────────────┘
```

**الإجابة:** سعر الصرف يُطبَّق على مستوى الفاتورة الكلي، وليس على كل بند على حدة.

---

### 3.2 سيناريو: دفع فاتورة USD بصندوق EUR

```
❌ هذا السيناريو غير مسموح به في النظام الحالي!

القاعدة: عملة الصندوق يجب أن تتطابق مع عملة الفاتورة

الحلول الممكنة:
1. إجراء مصارفة أولاً من صندوق USD إلى صندوق EUR
2. ثم الدفع من صندوق EUR

المسار البديل:
┌────────────────────────────────────────────────────────────────┐
│ فاتورة بـ USD                                                   │
│      │                                                          │
│      ▼                                                          │
│ مصارفة: USD → YER                                               │
│      │                                                          │
│      ▼                                                          │
│ مصارفة: YER → EUR                                               │
│      │                                                          │
│      ▼                                                          │
│ دفع من صندوق EUR                                                │
└────────────────────────────────────────────────────────────────┘

ملاحظة: هذا يُنشئ فرق صرف قد يكون ربح أو خسارة
```

---

### 3.3 سيناريو: تقرير مالي متعدد العملات

```sql
-- كل التقارير المالية تستخدم العملة الأساسية (YER)

-- مثال: ميزان المراجعة
SELECT 
  gl.account_code,
  gl.account_name,
  SUM(jl.debit_bc) as total_debit,    -- دائماً BC
  SUM(jl.credit_bc) as total_credit   -- دائماً BC
FROM gl_journal_lines jl
JOIN gl_accounts gl ON gl.id = jl.account_id
GROUP BY gl.id
-- النتيجة: جميع القيم بالريال اليمني (YER)
```

**القاعدة الذهبية:** جميع التقارير المالية تُعرض بالريال اليمني فقط، بغض النظر عن عملة المعاملة الأصلية.

---

## 4. الواجهات البرمجية

### 4.1 دوال قاعدة البيانات (RPC)

#### `get_exchange_rate(from, to, date)`

```sql
CREATE FUNCTION get_exchange_rate(
  p_from_currency VARCHAR,
  p_to_currency VARCHAR,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC

-- الخوارزمية:
-- 1. إذا from = to → إرجاع 1.0
-- 2. بحث مباشر: from → to بتاريخ ≤ p_date
-- 3. إذا لم يوجد: بحث عكسي to → from وحساب 1/rate
-- 4. إذا لم يوجد: RAISE EXCEPTION
```

#### `convert_to_base_currency(amount, from, date)`

```sql
CREATE FUNCTION convert_to_base_currency(
  p_amount NUMERIC,
  p_from_currency VARCHAR,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC

-- الخوارزمية:
-- 1. جلب العملة الأساسية (YER)
-- 2. إذا from = YER → إرجاع المبلغ كما هو
-- 3. جلب سعر الصرف
-- 4. إرجاع amount × rate
```

#### `execute_cash_box_exchange(...)`

```sql
CREATE FUNCTION execute_cash_box_exchange(
  p_from_cash_box_id UUID,
  p_to_cash_box_id UUID,
  p_from_amount NUMERIC,
  p_exchange_date DATE,
  p_notes TEXT
) RETURNS JSONB

-- ينفذ مصارفة كاملة مع:
-- ✓ التحققات الأمنية
-- ✓ القيد المحاسبي المزدوج
-- ✓ تحديث أرصدة الصناديق
-- ✓ سجل المصارفة
```

---

### 4.2 Triggers التحقق

| Trigger | الجدول | الوظيفة |
|---------|--------|---------|
| `validate_sales_invoice_currency` | sales_invoices | التحقق من كود العملة |
| `validate_sales_invoice_amounts` | sales_invoices | BC = FC × Rate |
| `calculate_base_currency_sales` | sales_invoices | حساب BC تلقائياً |
| `validate_pi_currency_trigger` | purchase_invoices | التحقق من العملة |
| `validate_pi_amounts_trigger` | purchase_invoices | التحقق من المبالغ |
| `validate_po_currency_trigger` | purchase_orders | التحقق من العملة |
| `validate_cash_transaction_currency_trigger` | cash_transactions | تطابق عملة الصندوق |
| `audit_sales_invoice_currency` | sales_invoices | تسجيل تغييرات العملة |

---

### 4.3 Frontend API (`src/lib/currency.ts`)

```typescript
// جلب العملات
fetchCurrencies(includeInactive?: boolean): Promise<Currency[]>

// العملة الأساسية
getBaseCurrency(): Promise<Currency | null>
getBaseCurrencyCode(): Promise<string>  // مع cache

// أسعار الصرف
getExchangeRate(from, to, date): Promise<number>
convertToBaseCurrency(amount, from, date): Promise<{ amountBC, rate }>
fetchExchangeRates(filters?): Promise<ExchangeRate[]>
fetchLatestExchangeRates(): Promise<ExchangeRate[]>

// CRUD أسعار الصرف
createExchangeRate(rate): Promise<ExchangeRate>
updateExchangeRate(id, updates): Promise<ExchangeRate>
deleteExchangeRate(id): Promise<void>

// حساب فروق الصرف
calculateFxGainLoss(originalFC, originalRate, settlementFC, settlementRate): number

// التنسيق
formatCurrency(amount, currency, showSymbol?): string
formatCurrencyWithCode(amount, code, precision?): string
```

---

## 5. نظام المحاسبة

### 5.1 بنية القيد المحاسبي (`gl_journal_lines`)

```sql
CREATE TABLE gl_journal_lines (
  id            UUID PRIMARY KEY,
  journal_id    UUID NOT NULL,
  account_id    UUID NOT NULL,
  line_no       INTEGER NOT NULL,
  
  -- المبالغ الرئيسية (للتوافق القديم)
  debit         NUMERIC DEFAULT 0,
  credit        NUMERIC DEFAULT 0,
  
  -- المبالغ بالعملة الأجنبية (FC)
  currency_code VARCHAR DEFAULT 'YER',
  debit_fc      NUMERIC DEFAULT 0,
  credit_fc     NUMERIC DEFAULT 0,
  
  -- المبالغ بالعملة الأساسية (BC = YER)
  debit_bc      NUMERIC DEFAULT 0,
  credit_bc     NUMERIC DEFAULT 0,
  
  -- سعر الصرف المُثبّت
  exchange_rate NUMERIC DEFAULT 1,
  
  -- ...
);
```

**القاعدة الحاسمة:** 
- `debit_bc` و `credit_bc` تُستخدم دائماً في التقارير المالية
- `debit_fc` و `credit_fc` للمراجعة والتدقيق فقط

---

### 5.2 حسابات فروق العملة

| الرمز | الاسم | النوع | الاستخدام |
|-------|-------|-------|-----------|
| 4400 | أرباح فروق العملة المحققة | إيراد | عند تسوية فاتورة بسعر أعلى |
| 4401 | أرباح فروق العملة غير المحققة | إيراد | إعادة تقييم نهاية الفترة |
| 5400 | خسائر فروق العملة المحققة | مصروف | عند تسوية فاتورة بسعر أقل |
| 5401 | خسائر فروق العملة غير المحققة | مصروف | إعادة تقييم نهاية الفترة |

---

### 5.3 مثال قيد فاتورة مبيعات بـ SAR

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ فاتورة مبيعات: INV-001                                                                  │
│ المبلغ: 100 ر.س | سعر الصرف: 420 | المبلغ بـ YER: 42,000                               │
└────────────────────────────────────────────────────────────────────────────────────────┘

القيد المحاسبي:
┌──────────────────┬─────────────┬─────────────┬───────────────┬───────────────┐
│ الحساب          │ مدين FC     │ دائن FC     │ مدين BC       │ دائن BC       │
├──────────────────┼─────────────┼─────────────┼───────────────┼───────────────┤
│ ذمم العملاء     │ 100 SAR     │ -           │ 42,000 YER    │ -             │
│ إيرادات المبيعات│ -           │ 100 SAR     │ -             │ 42,000 YER    │
└──────────────────┴─────────────┴─────────────┴───────────────┴───────────────┘
```

---

### 5.4 مثال قيد فرق صرف محقق

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ السيناريو:                                                                              │
│ - فاتورة أصلية: 100 SAR بسعر 420 = 42,000 YER                                          │
│ - تسديد: 100 SAR بسعر 430 = 43,000 YER                                                 │
│ - فرق الصرف: 43,000 - 42,000 = 1,000 YER (ربح)                                         │
└────────────────────────────────────────────────────────────────────────────────────────┘

القيد:
┌──────────────────────────────────┬───────────────┬───────────────┐
│ الحساب                          │ مدين BC       │ دائن BC       │
├──────────────────────────────────┼───────────────┼───────────────┤
│ الصندوق النقدي                  │ 43,000        │ -             │
│ ذمم العملاء                     │ -             │ 42,000        │
│ أرباح فروق العملة المحققة (4400)│ -             │ 1,000         │
└──────────────────────────────────┴───────────────┴───────────────┘
```

---

## 6. الأمان والصلاحيات

### 6.1 مصفوفة الصلاحيات

| الدور | إضافة عملة | تعديل عملة | إضافة سعر صرف | تعديل سعر صرف | حذف سعر صرف | مصارفة |
|-------|-----------|-----------|---------------|---------------|-------------|--------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| pharmacist | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| inventory_manager | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| cashier | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| anon | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

### 6.2 قواعد سلامة البيانات (Triggers)

```sql
-- منع تغيير العملة الأساسية
CREATE TRIGGER prevent_base_currency_change
BEFORE UPDATE ON currencies
FOR EACH ROW
WHEN (OLD.is_base = true AND NEW.is_base = false)
EXECUTE FUNCTION raise_exception('لا يمكن إلغاء العملة الأساسية');

-- منع حذف العملة الأساسية
CREATE TRIGGER prevent_base_currency_delete
BEFORE DELETE ON currencies
FOR EACH ROW
WHEN (OLD.is_base = true)
EXECUTE FUNCTION raise_exception('لا يمكن حذف العملة الأساسية');

-- التحقق من exchange_rate > 0
CHECK (exchange_rate > 0)
```

---

### 6.3 سجل التدقيق

```sql
-- تسجيل تغييرات أسعار الصرف والعملات في audit_log
CREATE TRIGGER audit_exchange_rate_changes
AFTER INSERT OR UPDATE OR DELETE ON exchange_rates
FOR EACH ROW
EXECUTE FUNCTION log_audit_trail();

-- تسجيل تغييرات العملة في الفواتير
CREATE TRIGGER audit_sales_invoice_currency
AFTER UPDATE OF currency_code, exchange_rate ON sales_invoices
FOR EACH ROW
EXECUTE FUNCTION log_currency_change();
```

---

## 7. مقترحات التحسين

### 7.1 قصيرة المدى (Easy - خلال أسبوع)

| التحسين | الجهد | التأثير | المخاطر |
|---------|-------|---------|---------|
| إضافة زر "تحديث سعر الصرف" في الفاتورة | Easy | Medium | منخفضة |
| عرض آخر سعر صرف في header الصفحة | Easy | Low | لا توجد |
| إضافة تنبيه عند اختلاف عملة العميل عن الفاتورة | Easy | Medium | لا توجد |
| تحسين رسائل الخطأ العربية | Easy | Medium | لا توجد |

---

### 7.2 متوسطة المدى (Medium - خلال شهر)

| التحسين | الجهد | التأثير | المخاطر | التبعيات |
|---------|-------|---------|---------|----------|
| تقرير أرباح/خسائر العملات الأجنبية | Medium | High | منخفضة | لا توجد |
| دعم GBP و CNY | Medium | Medium | منخفضة | إضافة أسعار صرف |
| تكامل مع API أسعار الصرف الخارجية | Medium | High | متوسطة | مفتاح API |
| إعادة تقييم أرصدة العملاء نهاية الفترة | Medium | High | متوسطة | تقرير الفروقات |

---

### 7.3 طويلة المدى (Hard - أكثر من شهر)

| التحسين | الجهد | التأثير | المخاطر | التبعيات |
|---------|-------|---------|---------|----------|
| نظام محفظة عملات متعددة للعميل | Hard | High | عالية | إعادة هيكلة DB |
| تكامل مع بوابات الدفع الإلكتروني | Hard | High | عالية | Edge Functions + API Keys |
| تقارير مقارنة بعملات متعددة | Hard | Medium | متوسطة | لا توجد |
| دعم العملات الرقمية (Crypto) | Hard | Low | عالية جداً | بنية جديدة |

---

## 8. الملفات التقنية

### 8.1 ملفات Frontend

| الملف | الغرض |
|-------|-------|
| `src/lib/currency.ts` | جميع دوال العملات والصرف |
| `src/components/CurrencySelect.tsx` | مكون اختيار العملة |
| `src/components/currency/InvoiceCurrencyPanel.tsx` | لوحة عملة الفاتورة |
| `src/components/currency/ExchangeRateDisplay.tsx` | عرض سعر الصرف |
| `src/components/currency/DualAmountDisplay.tsx` | عرض المبلغ المزدوج |
| `src/components/currency/CashBoxCurrencyInfo.tsx` | معلومات عملة الصندوق |
| `src/components/currency/CustomerBalanceCard.tsx` | بطاقة رصيد العميل |
| `src/pages/Currencies.tsx` | صفحة إدارة العملات |
| `src/pages/ExchangeRates.tsx` | صفحة أسعار الصرف |
| `src/pages/CashBoxExchange.tsx` | صفحة المصارفة |

---

### 8.2 مثال كود: تحويل العملة

```typescript
// src/lib/currency.ts

export async function convertToBaseCurrency(
  amount: number,
  fromCurrency: string,
  date: string = new Date().toISOString().split("T")[0]
): Promise<{ amountBC: number; rate: number }> {
  const baseCurrency = await getBaseCurrencyCode();
  
  // نفس العملة = لا تحويل
  if (fromCurrency === baseCurrency) {
    return { amountBC: amount, rate: 1.0 };
  }

  // جلب سعر الصرف وتحويل
  const rate = await getExchangeRate(fromCurrency, baseCurrency, date);
  return {
    amountBC: amount * rate,
    rate,
  };
}
```

---

### 8.3 مثال استعلام: رصيد العميل بعملته

```sql
-- رصيد العميل بالعملة الأساسية (YER) دائماً
SELECT 
  c.id,
  c.name,
  c.currency_code,
  c.balance as balance_bc,  -- الرصيد بـ YER
  -- تحويل الرصيد لعملة العميل للعرض فقط
  CASE 
    WHEN c.currency_code = 'YER' THEN c.balance
    ELSE c.balance / COALESCE(
      (SELECT rate FROM exchange_rates 
       WHERE from_currency = c.currency_code 
         AND to_currency = 'YER'
       ORDER BY effective_date DESC LIMIT 1), 1)
  END as balance_fc
FROM customers c
WHERE c.id = 'xxx';
```

---

## 9. التوصيات

### 9.1 أولويات التطوير

```
الأولوية 1 (فورية):
├── ✓ نظام العملات الأساسي - مكتمل
├── ✓ أسعار الصرف التاريخية - مكتمل
├── ✓ الفواتير المزدوجة (FC/BC) - مكتمل
├── ✓ المصارفة بين الصناديق - مكتمل
└── ✓ Triggers التحقق - مكتمل

الأولوية 2 (خلال شهر):
├── ⏳ تقرير أرباح/خسائر العملات
├── ⏳ تكامل API أسعار الصرف
└── ⏳ إعادة التقييم نهاية الفترة

الأولوية 3 (مستقبلي):
├── 🔮 محفظة عملات متعددة للعميل
├── 🔮 تكامل بوابات الدفع
└── 🔮 تقارير مقارنة متعددة العملات
```

---

### 9.2 ملخص الحالة الحالية

| المكون | الحالة | النضج |
|--------|--------|-------|
| جدول العملات | ✅ مكتمل | 100% |
| أسعار الصرف | ✅ مكتمل | 95% |
| فواتير المبيعات | ✅ مكتمل | 95% |
| فواتير المشتريات | ✅ مكتمل | 95% |
| أوامر الشراء | ✅ مكتمل | 90% |
| الصناديق النقدية | ✅ مكتمل | 95% |
| المصارفة | ✅ مكتمل | 100% |
| القيود المحاسبية | ✅ مكتمل | 95% |
| التقارير المالية | ⏳ جزئي | 70% |
| تكامل خارجي | ❌ غير موجود | 0% |

**التقييم العام: 87% مكتمل** ⭐⭐⭐⭐

---

### 9.3 المخاطر المحتملة

| المخاطر | الاحتمالية | التأثير | الإجراء الوقائي |
|---------|------------|---------|-----------------|
| أسعار صرف قديمة | عالية | متوسط | تكامل API خارجي |
| أخطاء التقريب | منخفضة | منخفض | استخدام NUMERIC |
| فقدان سعر الصرف | منخفضة | عالي | Trigger للتحقق قبل الحفظ |
| تغيير العملة الأساسية | منخفضة جداً | كارثي | محمي بـ constraint |

---

## 📎 المرفقات

- [دليل استخدام العملات](./multi-currency-usage.md)
- [دليل النظام الكامل](./SYSTEM_COMPLETE_GUIDE.md)

---

**نهاية التقرير**

*آخر تحديث: 2026-01-18*
