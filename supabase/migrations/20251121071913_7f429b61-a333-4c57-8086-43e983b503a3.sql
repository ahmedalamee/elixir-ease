-- إنشاء جدول payment_methods إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة الأعمدة المفقودة إلى sales_invoices
ALTER TABLE sales_invoices 
ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES payment_methods(id),
ADD COLUMN IF NOT EXISTS payment_terms text;

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_sales_invoices_payment_method ON sales_invoices(payment_method_id);

-- تفعيل RLS على جدول payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لجدول payment_methods
CREATE POLICY "Staff can view payment methods"
  ON payment_methods FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));

CREATE POLICY "Admin can manage payment methods"
  ON payment_methods FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));