-- إضافة حقول التحكم في الخصم إلى جدول المنتجات
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS allow_discount BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_discount_percentage NUMERIC(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS default_discount_percentage NUMERIC(5,2) DEFAULT 0.00;

COMMENT ON COLUMN products.allow_discount IS 'السماح بالخصم على هذا المنتج';
COMMENT ON COLUMN products.max_discount_percentage IS 'أقصى نسبة خصم مسموحة';
COMMENT ON COLUMN products.default_discount_percentage IS 'نسبة الخصم الافتراضية';