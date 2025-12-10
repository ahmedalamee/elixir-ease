-- ========================================
-- 1. FIX STOCK_LEDGER FOREIGN KEY ISSUE
-- ========================================

-- Drop the problematic foreign key constraint that causes errors
ALTER TABLE IF EXISTS stock_ledger 
DROP CONSTRAINT IF EXISTS stock_ledger_batch_id_fkey;

-- ========================================
-- 2. CONVERT VIEWS TO SECURITY INVOKER
-- ========================================

-- 2.1 safe_employee_details - Admin/HR only
DROP VIEW IF EXISTS safe_employee_details;
CREATE VIEW safe_employee_details
WITH (security_invoker = true) AS
SELECT 
  e.id,
  e.employee_code,
  e.full_name,
  e.full_name_en,
  e.phone,
  e.email,
  e.job_title,
  e.department,
  CASE 
    WHEN has_any_role(auth.uid(), ARRAY['admin'::app_role]) THEN e.salary
    ELSE NULL
  END as salary,
  e.hire_date,
  e.is_active,
  e.created_at
FROM employees e
WHERE auth.uid() IS NOT NULL;

-- 2.2 safe_customers_summary - Staff only
DROP VIEW IF EXISTS safe_customers_summary;
CREATE VIEW safe_customers_summary
WITH (security_invoker = true) AS
SELECT 
  c.id,
  c.name,
  c.phone,
  c.email,
  c.balance,
  c.credit_limit,
  c.loyalty_points,
  c.is_active,
  c.currency_code
FROM customers c
WHERE auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]);

-- 2.3 safe_suppliers_summary - Staff only  
DROP VIEW IF EXISTS safe_suppliers_summary;
CREATE VIEW safe_suppliers_summary
WITH (security_invoker = true) AS
SELECT 
  s.id,
  s.name,
  s.code,
  s.phone,
  s.email,
  s.balance,
  s.currency_code,
  s.is_active
FROM suppliers s
WHERE auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]);

-- 2.4 sales_by_currency - Admin/Pharmacist only
DROP VIEW IF EXISTS sales_by_currency;
CREATE VIEW sales_by_currency
WITH (security_invoker = true) AS
SELECT 
  currency_code,
  COUNT(*) as invoice_count,
  SUM(total_amount_fc) as total_fc,
  SUM(total_amount_bc) as total_bc
FROM sales_invoices
WHERE status = 'posted'
  AND auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
GROUP BY currency_code;

-- 2.5 sales_summary_view - Admin/Pharmacist only
DROP VIEW IF EXISTS sales_summary_view;
CREATE VIEW sales_summary_view
WITH (security_invoker = true) AS
SELECT 
  DATE(invoice_date) as sale_date,
  COUNT(*) as invoice_count,
  SUM(subtotal_bc) as total_subtotal,
  SUM(discount_amount_bc) as total_discount,
  SUM(tax_amount_bc) as total_tax,
  SUM(total_amount_bc) as total_amount
FROM sales_invoices
WHERE status = 'posted'
  AND auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
GROUP BY DATE(invoice_date)
ORDER BY sale_date DESC;

-- 2.6 inventory_summary_view - Staff only (using price instead of sale_price)
DROP VIEW IF EXISTS inventory_summary_view;
CREATE VIEW inventory_summary_view
WITH (security_invoker = true) AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.barcode,
  w.id as warehouse_id,
  w.name as warehouse_name,
  COALESCE(ws.qty_on_hand, 0) as qty_on_hand,
  p.cost_price,
  p.price as sale_price,
  COALESCE(ws.qty_on_hand, 0) * COALESCE(p.cost_price, 0) as total_value
FROM products p
CROSS JOIN warehouses w
LEFT JOIN warehouse_stock ws ON ws.item_id = p.id AND ws.warehouse_id = w.id
WHERE p.is_active = true
  AND w.is_active = true
  AND auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]);

-- 2.7 stock_alerts - Staff only
DROP VIEW IF EXISTS stock_alerts;
CREATE VIEW stock_alerts
WITH (security_invoker = true) AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.reorder_level,
  w.id as warehouse_id,
  w.name as warehouse_name,
  COALESCE(ws.qty_on_hand, 0) as current_qty,
  COALESCE(p.reorder_level, 0) - COALESCE(ws.qty_on_hand, 0) as shortage
FROM products p
CROSS JOIN warehouses w
LEFT JOIN warehouse_stock ws ON ws.item_id = p.id AND ws.warehouse_id = w.id
WHERE p.is_active = true
  AND w.is_active = true
  AND COALESCE(ws.qty_on_hand, 0) <= COALESCE(p.reorder_level, 0)
  AND auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]);

-- 2.8 returns_statistics - Admin only
DROP VIEW IF EXISTS returns_statistics;
CREATE VIEW returns_statistics
WITH (security_invoker = true) AS
SELECT 
  'sales' as return_type,
  COUNT(*) as return_count,
  COALESCE(SUM(total_amount), 0) as total_value
FROM sales_returns
WHERE status = 'posted'
  AND auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'admin'::app_role)
UNION ALL
SELECT 
  'purchase' as return_type,
  COUNT(*) as return_count,
  COALESCE(SUM(total_amount), 0) as total_value
FROM purchase_returns
WHERE status = 'posted'
  AND auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'admin'::app_role);

-- 2.9 returns_inventory_impact - Admin/Inventory Manager only
DROP VIEW IF EXISTS returns_inventory_impact;
CREATE VIEW returns_inventory_impact
WITH (security_invoker = true) AS
SELECT 
  sr.id as return_id,
  sr.return_number,
  'sales_return' as return_type,
  sri.item_id as product_id,
  p.name as product_name,
  sri.quantity,
  sr.warehouse_id,
  w.name as warehouse_name,
  sr.posted_at
FROM sales_returns sr
JOIN sales_return_items sri ON sri.return_id = sr.id
JOIN products p ON p.id = sri.item_id
LEFT JOIN warehouses w ON w.id = sr.warehouse_id
WHERE sr.status = 'posted'
  AND auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]);

-- 2.10 posted_documents_audit - Admin only
DROP VIEW IF EXISTS posted_documents_audit;
CREATE VIEW posted_documents_audit
WITH (security_invoker = true) AS
SELECT 
  'sales_invoice' as doc_type,
  id,
  invoice_number as doc_number,
  posted_at,
  posted_by,
  total_amount_bc as amount
FROM sales_invoices
WHERE status = 'posted'
  AND auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'admin'::app_role)
UNION ALL
SELECT 
  'purchase_invoice' as doc_type,
  id,
  pi_number as doc_number,
  posted_at,
  posted_by,
  total_amount_bc as amount
FROM purchase_invoices
WHERE status = 'posted'
  AND auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'admin'::app_role);

-- 2.11 returns_processing_monitor - Admin only
DROP VIEW IF EXISTS returns_processing_monitor;
CREATE VIEW returns_processing_monitor
WITH (security_invoker = true) AS
SELECT 
  sr.id,
  sr.return_number,
  sr.status,
  sr.total_amount,
  sr.created_at,
  sr.posted_at,
  e.full_name as posted_by_name
FROM sales_returns sr
LEFT JOIN employees e ON e.user_id = sr.posted_by
WHERE auth.uid() IS NOT NULL
  AND has_role(auth.uid(), 'admin'::app_role);

-- 2.12 vw_latest_exchange_rates - All authenticated users
DROP VIEW IF EXISTS vw_latest_exchange_rates;
CREATE VIEW vw_latest_exchange_rates
WITH (security_invoker = true) AS
SELECT DISTINCT ON (from_currency, to_currency)
  from_currency,
  to_currency,
  rate,
  effective_date
FROM exchange_rates
WHERE auth.uid() IS NOT NULL
ORDER BY from_currency, to_currency, effective_date DESC;

-- 2.13 vw_document_gl_links - Admin/Pharmacist only
DROP VIEW IF EXISTS vw_document_gl_links;
CREATE VIEW vw_document_gl_links
WITH (security_invoker = true) AS
SELECT 
  je.id as journal_entry_id,
  je.entry_number,
  je.reference_type as document_type,
  je.reference_id as document_id,
  je.entry_date,
  je.total_debit,
  je.total_credit,
  je.status
FROM journal_entries je
WHERE auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]);

-- ========================================
-- 3. AUDIT LOGGING SYSTEM
-- ========================================

-- Create security audit_log table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_security_audit_log_table ON security_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_changed_by ON security_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_changed_at ON security_audit_log(changed_at);

-- Enable RLS on audit_log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit log
DROP POLICY IF EXISTS "Admin can view audit log" ON security_audit_log;
CREATE POLICY "Admin can view audit log" ON security_audit_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit entries
DROP POLICY IF EXISTS "System can insert audit entries" ON security_audit_log;
CREATE POLICY "System can insert audit entries" ON security_audit_log
  FOR INSERT WITH CHECK (true);

-- Create generic audit trigger function
CREATE OR REPLACE FUNCTION security_audit_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO security_audit_log(table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO security_audit_log(table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO security_audit_log(table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS suppliers_security_audit_trg ON suppliers;
CREATE TRIGGER suppliers_security_audit_trg
AFTER INSERT OR UPDATE OR DELETE ON suppliers
FOR EACH ROW EXECUTE FUNCTION security_audit_changes();

DROP TRIGGER IF EXISTS employees_security_audit_trg ON employees;
CREATE TRIGGER employees_security_audit_trg
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION security_audit_changes();

DROP TRIGGER IF EXISTS customers_security_audit_trg ON customers;
CREATE TRIGGER customers_security_audit_trg
AFTER INSERT OR UPDATE OR DELETE ON customers
FOR EACH ROW EXECUTE FUNCTION security_audit_changes();

DROP TRIGGER IF EXISTS purchase_invoices_security_audit_trg ON purchase_invoices;
CREATE TRIGGER purchase_invoices_security_audit_trg
AFTER INSERT OR UPDATE OR DELETE ON purchase_invoices
FOR EACH ROW EXECUTE FUNCTION security_audit_changes();

DROP TRIGGER IF EXISTS purchase_orders_security_audit_trg ON purchase_orders;
CREATE TRIGGER purchase_orders_security_audit_trg
AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION security_audit_changes();

DROP TRIGGER IF EXISTS goods_receipts_security_audit_trg ON goods_receipts;
CREATE TRIGGER goods_receipts_security_audit_trg
AFTER INSERT OR UPDATE OR DELETE ON goods_receipts
FOR EACH ROW EXECUTE FUNCTION security_audit_changes();

DROP TRIGGER IF EXISTS sales_invoices_security_audit_trg ON sales_invoices;
CREATE TRIGGER sales_invoices_security_audit_trg
AFTER INSERT OR UPDATE OR DELETE ON sales_invoices
FOR EACH ROW EXECUTE FUNCTION security_audit_changes();

DROP TRIGGER IF EXISTS inventory_cost_layers_security_audit_trg ON inventory_cost_layers;
CREATE TRIGGER inventory_cost_layers_security_audit_trg
AFTER INSERT OR UPDATE OR DELETE ON inventory_cost_layers
FOR EACH ROW EXECUTE FUNCTION security_audit_changes();

DROP TRIGGER IF EXISTS cash_boxes_security_audit_trg ON cash_boxes;
CREATE TRIGGER cash_boxes_security_audit_trg
AFTER INSERT OR UPDATE OR DELETE ON cash_boxes
FOR EACH ROW EXECUTE FUNCTION security_audit_changes();

DROP TRIGGER IF EXISTS gl_accounts_security_audit_trg ON gl_accounts;
CREATE TRIGGER gl_accounts_security_audit_trg
AFTER INSERT OR UPDATE OR DELETE ON gl_accounts
FOR EACH ROW EXECUTE FUNCTION security_audit_changes();

-- ========================================
-- 4. UPDATE post_goods_receipt TO NOT USE batch_id FK
-- ========================================

CREATE OR REPLACE FUNCTION post_goods_receipt(p_grn_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grn RECORD;
  v_item RECORD;
  v_result JSONB;
  v_layer_id UUID;
  v_exchange_rate NUMERIC;
  v_unit_cost_bc NUMERIC;
BEGIN
  -- Check authorization
  IF NOT has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]) THEN
    RAISE EXCEPTION 'غير مصرح لك بترحيل استلام البضاعة';
  END IF;

  -- Get GRN header
  SELECT * INTO v_grn
  FROM goods_receipts
  WHERE id = p_grn_id AND status = 'draft';

  IF v_grn.id IS NULL THEN
    RAISE EXCEPTION 'استلام البضاعة غير موجود أو مرحل مسبقاً';
  END IF;

  -- Get exchange rate
  v_exchange_rate := COALESCE(v_grn.exchange_rate, 1);

  -- Process each item
  FOR v_item IN
    SELECT gi.*, p.name as product_name
    FROM grn_items gi
    JOIN products p ON p.id = gi.item_id
    WHERE gi.grn_id = p_grn_id
  LOOP
    -- Calculate base currency cost
    v_unit_cost_bc := v_item.unit_cost * v_exchange_rate;

    -- Create FIFO cost layer
    INSERT INTO inventory_cost_layers (
      product_id,
      warehouse_id,
      reference_type,
      reference_id,
      quantity,
      remaining_quantity,
      unit_cost,
      currency_code,
      exchange_rate,
      batch_number,
      expiry_date,
      created_at
    ) VALUES (
      v_item.item_id,
      v_grn.warehouse_id,
      'goods_receipt',
      p_grn_id,
      v_item.quantity,
      v_item.quantity,
      v_unit_cost_bc,
      COALESCE(v_grn.currency_code, 'YER'),
      v_exchange_rate,
      v_item.batch_number,
      v_item.expiry_date,
      NOW()
    ) RETURNING id INTO v_layer_id;

    -- Update warehouse stock
    INSERT INTO warehouse_stock (warehouse_id, item_id, qty_on_hand, qty_reserved, qty_inbound, qty_outbound, last_updated)
    VALUES (v_grn.warehouse_id, v_item.item_id, v_item.quantity, 0, 0, 0, NOW())
    ON CONFLICT (warehouse_id, item_id)
    DO UPDATE SET
      qty_on_hand = warehouse_stock.qty_on_hand + v_item.quantity,
      last_updated = NOW();

    -- Record stock movement (without batch_id foreign key)
    INSERT INTO stock_ledger (
      item_id,
      product_id,
      warehouse_id,
      transaction_type,
      reference_type,
      reference_id,
      qty_in,
      qty_out,
      quantity_change,
      unit_cost,
      notes,
      created_by,
      created_at,
      timestamp
    ) VALUES (
      v_item.item_id,
      v_item.item_id,
      v_grn.warehouse_id,
      'in',
      'goods_receipt',
      p_grn_id,
      v_item.quantity,
      0,
      v_item.quantity,
      v_unit_cost_bc,
      'استلام بضاعة: ' || v_grn.grn_number || ' - ' || v_item.product_name,
      auth.uid(),
      NOW(),
      NOW()
    );
  END LOOP;

  -- Update GRN status
  UPDATE goods_receipts
  SET
    status = 'posted',
    posted_by = auth.uid(),
    posted_at = NOW()
  WHERE id = p_grn_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'grn_id', p_grn_id,
    'grn_number', v_grn.grn_number,
    'message', 'تم ترحيل استلام البضاعة وتحديث المخزون بنجاح'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في ترحيل استلام البضاعة: %', SQLERRM;
END;
$$;