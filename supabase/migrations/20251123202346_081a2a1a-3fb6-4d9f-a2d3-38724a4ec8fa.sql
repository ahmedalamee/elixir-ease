-- إضافة الأعمدة المفقودة إلى جدول sales_return_items
ALTER TABLE sales_return_items 
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS line_total NUMERIC(12,2) DEFAULT 0;

-- تحديث القيود للتأكد من صحة البيانات
ALTER TABLE sales_return_items
ADD CONSTRAINT check_discount_percentage CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD CONSTRAINT check_tax_percentage CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
ADD CONSTRAINT check_line_total CHECK (line_total >= 0);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_sales_return_items_return_id ON sales_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_item_id ON sales_return_items(item_id);