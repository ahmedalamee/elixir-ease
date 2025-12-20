
-- إضافة أعمدة balance_bc/fc للموردين
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS balance_bc numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_fc numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_currency_code varchar(10) DEFAULT 'YER';

-- تحديث الأرصدة الحالية للموردين
UPDATE public.suppliers 
SET balance_bc = COALESCE(balance, 0),
    balance_fc = COALESCE(balance, 0),
    balance_currency_code = COALESCE(currency_code, 'YER')
WHERE balance_bc IS NULL OR balance_bc = 0;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN public.suppliers.balance_bc IS 'رصيد المورد بالعملة الأساسية YER';
COMMENT ON COLUMN public.suppliers.balance_fc IS 'رصيد المورد بالعملة الأجنبية';
