-- إصلاح جدول المخازن: إضافة عمود المستودع الافتراضي
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- إضافة constraint للتأكد من وجود مستودع افتراضي واحد فقط
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_single_default 
ON warehouses (is_default) 
WHERE is_default = true;

-- تعيين أول مستودع نشط كمستودع افتراضي إذا لم يكن هناك مستودع افتراضي
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM warehouses WHERE is_default = true) THEN
    UPDATE warehouses 
    SET is_default = true 
    WHERE id = (
      SELECT id 
      FROM warehouses 
      WHERE is_active = true 
      ORDER BY created_at 
      LIMIT 1
    );
  END IF;
END $$;

-- إصلاح جدول وحدات القياس: إضافة عمود is_active
ALTER TABLE uoms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- تحديث جميع السجلات الحالية لتكون نشطة
UPDATE uoms SET is_active = true WHERE is_active IS NULL;

-- إصلاح جدول فواتير الشراء: التأكد من وجود حقل المخزن
-- (الحقل موجود بالفعل من migration سابقة، هذا فقط للتأكيد)

-- إضافة محفز لتحديث is_default عند تحديد مستودع جديد كافتراضي
CREATE OR REPLACE FUNCTION ensure_single_default_warehouse()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- إلغاء الافتراضي من جميع المخازن الأخرى
    UPDATE warehouses 
    SET is_default = false 
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_default_warehouse ON warehouses;
CREATE TRIGGER trigger_ensure_single_default_warehouse
  BEFORE INSERT OR UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_warehouse();

-- إضافة indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON po_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_item_id ON po_items(item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_warehouse_id ON purchase_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);