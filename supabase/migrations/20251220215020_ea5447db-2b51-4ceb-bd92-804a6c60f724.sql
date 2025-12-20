
-- 1. إضافة balance_bc للعملاء
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS balance_bc numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_fc numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_currency_code varchar(10) DEFAULT 'YER';

-- 2. إضافة أعمدة FC/BC لقيود GL
ALTER TABLE public.journal_entry_lines
ADD COLUMN IF NOT EXISTS debit_amount_fc numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS debit_amount_bc numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_amount_fc numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_amount_bc numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS currency_code varchar(10) DEFAULT 'YER';

-- 3. تحديث الأرصدة الحالية للعملاء (نقل balance إلى balance_bc)
UPDATE public.customers 
SET balance_bc = COALESCE(balance, 0),
    balance_fc = COALESCE(balance, 0),
    balance_currency_code = 'YER'
WHERE balance_bc IS NULL OR balance_bc = 0;

-- 4. تحديث قيود GL الحالية
UPDATE public.journal_entry_lines
SET debit_amount_bc = COALESCE(debit_amount, 0),
    credit_amount_bc = COALESCE(credit_amount, 0),
    debit_amount_fc = COALESCE(debit_amount, 0),
    credit_amount_fc = COALESCE(credit_amount, 0),
    currency_code = COALESCE(currency, 'YER'),
    exchange_rate = 1
WHERE debit_amount_bc = 0 AND credit_amount_bc = 0;

-- 5. إضافة تعليق توضيحي
COMMENT ON COLUMN public.customers.balance_bc IS 'رصيد العميل بالعملة الأساسية YER';
COMMENT ON COLUMN public.customers.balance_fc IS 'رصيد العميل بالعملة الأجنبية';
COMMENT ON COLUMN public.journal_entry_lines.debit_amount_bc IS 'مدين بالعملة الأساسية';
COMMENT ON COLUMN public.journal_entry_lines.credit_amount_bc IS 'دائن بالعملة الأساسية';
