-- إنشاء view لمراقبة تأثير المرتجعات على المخزون
CREATE OR REPLACE VIEW returns_inventory_impact AS
SELECT 
  sr.return_number,
  sr.return_date,
  sr.status,
  c.name as customer_name,
  w.name as warehouse_name,
  p.name as product_name,
  p.sku as product_sku,
  sri.quantity as returned_quantity,
  sri.condition as item_condition,
  ws.qty_on_hand as current_stock,
  sr.posted_at,
  sr.posted_by
FROM sales_returns sr
JOIN sales_return_items sri ON sri.return_id = sr.id
JOIN customers c ON c.id = sr.customer_id
JOIN warehouses w ON w.id = sr.warehouse_id
JOIN products p ON p.id = sri.item_id
LEFT JOIN warehouse_stock ws ON ws.warehouse_id = sr.warehouse_id AND ws.item_id = sri.item_id
ORDER BY sr.created_at DESC;

-- إنشاء view لمراقبة حالة المرتجعات
CREATE OR REPLACE VIEW returns_processing_monitor AS
SELECT 
  sr.id,
  sr.return_number,
  sr.status,
  sr.return_date,
  c.name as customer_name,
  w.name as warehouse_name,
  si.invoice_number as original_invoice,
  sr.total_amount,
  sr.refund_amount,
  (SELECT COUNT(*) FROM sales_return_items WHERE return_id = sr.id) as items_count,
  sr.created_at,
  sr.posted_at,
  u.email as created_by_email
FROM sales_returns sr
LEFT JOIN customers c ON sr.customer_id = c.id
LEFT JOIN warehouses w ON sr.warehouse_id = w.id
LEFT JOIN sales_invoices si ON sr.sales_invoice_id = si.id
LEFT JOIN auth.users u ON sr.created_by = u.id
ORDER BY sr.created_at DESC;

-- إنشاء view لإحصائيات المرتجعات
CREATE OR REPLACE VIEW returns_statistics AS
SELECT 
  status,
  COUNT(*) as returns_count,
  SUM(total_amount) as total_amount,
  SUM(refund_amount) as total_refunded,
  AVG(total_amount) as average_return_amount
FROM sales_returns 
GROUP BY status;

COMMENT ON VIEW returns_inventory_impact IS 'عرض تأثير المرتجعات على المخزون مع تفاصيل المنتجات';
COMMENT ON VIEW returns_processing_monitor IS 'مراقبة حالة معالجة المرتجعات';
COMMENT ON VIEW returns_statistics IS 'إحصائيات شاملة عن المرتجعات حسب الحالة';