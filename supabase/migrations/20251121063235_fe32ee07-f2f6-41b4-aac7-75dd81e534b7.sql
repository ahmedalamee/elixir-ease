-- إضافة الأعمدة الناقصة في جدول stock_ledger لتتوافق مع دالة post_sales_invoice

-- إضافة عمود product_id (نسخة من item_id)
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS product_id uuid;

-- إضافة عمود transaction_type
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS transaction_type text;

-- إضافة عمود reference_type (موازي لـ ref_type)
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS reference_type text;

-- إضافة عمود reference_id (موازي لـ ref_id)
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS reference_id uuid;

-- إضافة عمود quantity_change
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS quantity_change numeric;

-- إضافة عمود balance_after
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS balance_after numeric;

-- إضافة عمود batch_number
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS batch_number text;

-- إضافة عمود expiry_date
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS expiry_date date;

-- إضافة عمود notes (موازي لـ note)
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS notes text;

-- تحديث البيانات الموجودة: نسخ item_id إلى product_id
UPDATE stock_ledger SET product_id = item_id WHERE product_id IS NULL;

-- تحديث البيانات الموجودة: نسخ ref_type إلى reference_type
UPDATE stock_ledger SET reference_type = ref_type WHERE reference_type IS NULL;

-- تحديث البيانات الموجودة: نسخ ref_id إلى reference_id
UPDATE stock_ledger SET reference_id = ref_id WHERE reference_id IS NULL;

-- تحديث البيانات الموجودة: حساب quantity_change من qty_in و qty_out
UPDATE stock_ledger 
SET quantity_change = COALESCE(qty_in, 0) - COALESCE(qty_out, 0) 
WHERE quantity_change IS NULL;

-- تحديث البيانات الموجودة: نسخ note إلى notes
UPDATE stock_ledger SET notes = note WHERE notes IS NULL;

-- إضافة علاقة مع جدول products (باستخدام DO block لتجنب الخطأ إذا كان موجوداً)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_ledger_product'
  ) THEN
    ALTER TABLE stock_ledger 
    ADD CONSTRAINT fk_stock_ledger_product 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
  END IF;
END $$;

-- إنشاء indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_stock_ledger_product ON stock_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_warehouse ON stock_ledger(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_reference ON stock_ledger(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_timestamp ON stock_ledger(timestamp DESC);