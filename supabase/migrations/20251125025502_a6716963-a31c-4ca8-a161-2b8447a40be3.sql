
-- ======================================
-- نظام التكامل الأفقي الشامل
-- Comprehensive Horizontal Integration System
-- ======================================

-- 1. تحسين جدول تسجيل الأنشطة
-- ======================================
ALTER TABLE user_activity_log 
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS module TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical'));

CREATE INDEX IF NOT EXISTS idx_activity_log_user_module ON user_activity_log(user_id, module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_severity ON user_activity_log(severity, created_at DESC);

-- 2. جدول إدارة الأحداث (Event Management)
-- ======================================
CREATE TABLE IF NOT EXISTS system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL,
  event_data JSONB NOT NULL,
  triggered_by UUID,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

CREATE INDEX idx_system_events_type ON system_events(event_type, triggered_at DESC);
CREATE INDEX idx_system_events_unprocessed ON system_events(processed, triggered_at) WHERE NOT processed;

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view all events"
ON system_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'inventory_manager')
  )
);

-- 3. جدول تكامل المخزون
-- ======================================
CREATE TABLE IF NOT EXISTS stock_integration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  product_id UUID REFERENCES products(id),
  warehouse_id UUID REFERENCES warehouses(id),
  quantity_before NUMERIC,
  quantity_change NUMERIC NOT NULL,
  quantity_after NUMERIC,
  unit_cost NUMERIC,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_stock_integration_product ON stock_integration_log(product_id, created_at DESC);
CREATE INDEX idx_stock_integration_reference ON stock_integration_log(reference_type, reference_id);

ALTER TABLE stock_integration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory staff can view stock integration log"
ON stock_integration_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'inventory_manager', 'pharmacist')
  )
);

-- 4. جدول تكامل المحاسبة
-- ======================================
CREATE TABLE IF NOT EXISTS accounting_integration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  document_id UUID NOT NULL,
  document_number TEXT NOT NULL,
  journal_entry_id UUID REFERENCES journal_entries(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  total_debit NUMERIC DEFAULT 0,
  total_credit NUMERIC DEFAULT 0,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_accounting_integration_status ON accounting_integration_log(status, created_at DESC);
CREATE INDEX idx_accounting_integration_document ON accounting_integration_log(document_type, document_id);

ALTER TABLE accounting_integration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view accounting integration log"
ON accounting_integration_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- 5. دالة مساعدة لتسجيل الأحداث
-- ======================================
CREATE OR REPLACE FUNCTION log_system_event(
  p_event_type TEXT,
  p_event_source TEXT,
  p_event_data JSONB,
  p_triggered_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO system_events (
    event_type,
    event_source,
    event_data,
    triggered_by
  ) VALUES (
    p_event_type,
    p_event_source,
    p_event_data,
    COALESCE(p_triggered_by, auth.uid())
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- 6. دالة للتحقق من مستويات إعادة الطلب
-- ======================================
CREATE OR REPLACE FUNCTION check_reorder_levels()
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  warehouse_id UUID,
  warehouse_name TEXT,
  current_qty NUMERIC,
  reorder_level NUMERIC,
  max_quantity NUMERIC,
  shortage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    w.id,
    w.name,
    COALESCE(ws.qty_on_hand, 0),
    COALESCE(p.reorder_level, 0),
    COALESCE(p.max_quantity, 0),
    COALESCE(p.reorder_level, 0) - COALESCE(ws.qty_on_hand, 0) as shortage
  FROM products p
  CROSS JOIN warehouses w
  LEFT JOIN warehouse_stock ws ON ws.item_id = p.id AND ws.warehouse_id = w.id
  WHERE p.is_active = true
    AND w.is_active = true
    AND COALESCE(ws.qty_on_hand, 0) <= COALESCE(p.reorder_level, 0)
  ORDER BY shortage DESC;
END;
$$;

-- 7. دالة لتحليل حركة المخزون
-- ======================================
CREATE OR REPLACE FUNCTION analyze_stock_movement(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_product_id UUID DEFAULT NULL,
  p_warehouse_id UUID DEFAULT NULL
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  warehouse_name TEXT,
  total_in NUMERIC,
  total_out NUMERIC,
  net_movement NUMERIC,
  transaction_count BIGINT,
  avg_transaction_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.product_id,
    p.name as product_name,
    w.name as warehouse_name,
    COALESCE(SUM(CASE WHEN sl.transaction_type = 'IN' THEN sl.quantity_change ELSE 0 END), 0) as total_in,
    COALESCE(SUM(CASE WHEN sl.transaction_type = 'OUT' THEN ABS(sl.quantity_change) ELSE 0 END), 0) as total_out,
    COALESCE(SUM(sl.quantity_change), 0) as net_movement,
    COUNT(*) as transaction_count,
    AVG(ABS(sl.quantity_change)) as avg_transaction_value
  FROM stock_ledger sl
  JOIN products p ON p.id = sl.product_id
  JOIN warehouses w ON w.id = sl.warehouse_id
  WHERE sl.timestamp BETWEEN p_start_date AND p_end_date
    AND (p_product_id IS NULL OR sl.product_id = p_product_id)
    AND (p_warehouse_id IS NULL OR sl.warehouse_id = p_warehouse_id)
  GROUP BY sl.product_id, p.name, w.name
  ORDER BY net_movement DESC;
END;
$$;

-- 8. دالة للحصول على إحصائيات التكامل
-- ======================================
CREATE OR REPLACE FUNCTION get_integration_statistics(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'stock_integration', (
      SELECT json_build_object(
        'total_transactions', COUNT(*),
        'successful', COUNT(*) FILTER (WHERE status = 'success'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'success_rate', ROUND(
          COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / 
          NULLIF(COUNT(*), 0) * 100, 2
        )
      )
      FROM stock_integration_log
      WHERE created_at BETWEEN p_start_date AND p_end_date
    ),
    'accounting_integration', (
      SELECT json_build_object(
        'total_entries', COUNT(*),
        'posted', COUNT(*) FILTER (WHERE status = 'success'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'success_rate', ROUND(
          COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / 
          NULLIF(COUNT(*), 0) * 100, 2
        )
      )
      FROM accounting_integration_log
      WHERE created_at BETWEEN p_start_date AND p_end_date
    ),
    'document_gl_entries', (
      SELECT json_build_object(
        'total_documents', COUNT(*),
        'posted', COUNT(*) FILTER (WHERE status = 'posted'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'pending', COUNT(*) FILTER (WHERE status = 'pending')
      )
      FROM document_gl_entries
      WHERE created_at BETWEEN p_start_date AND p_end_date
    ),
    'system_events', (
      SELECT json_build_object(
        'total_events', COUNT(*),
        'processed', COUNT(*) FILTER (WHERE processed = true),
        'pending', COUNT(*) FILTER (WHERE processed = false)
      )
      FROM system_events
      WHERE triggered_at BETWEEN p_start_date AND p_end_date
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- 9. دالة لإحصائيات لوحة التحكم التنفيذية
-- ======================================
CREATE OR REPLACE FUNCTION get_executive_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'sales', (
      SELECT json_build_object(
        'today', COALESCE(SUM(total_amount) FILTER (WHERE DATE(posted_at) = CURRENT_DATE), 0),
        'this_week', COALESCE(SUM(total_amount) FILTER (WHERE posted_at >= CURRENT_DATE - INTERVAL '7 days'), 0),
        'this_month', COALESCE(SUM(total_amount) FILTER (WHERE posted_at >= DATE_TRUNC('month', CURRENT_DATE)), 0),
        'total_invoices', COUNT(*) FILTER (WHERE status = 'posted')
      )
      FROM sales_invoices
      WHERE status = 'posted'
    ),
    'inventory', (
      SELECT json_build_object(
        'total_products', COUNT(DISTINCT p.id),
        'total_stock_value', COALESCE(SUM(ws.qty_on_hand * p.cost_price), 0),
        'low_stock_items', COUNT(*) FILTER (WHERE ws.qty_on_hand <= p.reorder_level),
        'out_of_stock', COUNT(*) FILTER (WHERE ws.qty_on_hand = 0 OR ws.qty_on_hand IS NULL)
      )
      FROM products p
      LEFT JOIN warehouse_stock ws ON ws.item_id = p.id
      WHERE p.is_active = true
    ),
    'customers', (
      SELECT json_build_object(
        'total_customers', COUNT(*),
        'active_customers', COUNT(*) FILTER (WHERE is_active = true),
        'total_balance', COALESCE(SUM(balance), 0),
        'total_credit_limit', COALESCE(SUM(credit_limit), 0)
      )
      FROM customers
    ),
    'financial', (
      SELECT json_build_object(
        'total_revenue', COALESCE(
          (SELECT SUM(credit_amount - debit_amount)
           FROM journal_entry_lines jel
           JOIN journal_entries je ON je.id = jel.entry_id
           JOIN gl_accounts ga ON ga.id = jel.account_id
           WHERE je.status = 'posted'
             AND ga.account_type = 'revenue'
             AND je.entry_date >= DATE_TRUNC('month', CURRENT_DATE)), 0
        ),
        'total_expenses', COALESCE(
          (SELECT SUM(debit_amount - credit_amount)
           FROM journal_entry_lines jel
           JOIN journal_entries je ON je.id = jel.entry_id
           JOIN gl_accounts ga ON ga.id = jel.account_id
           WHERE je.status = 'posted'
             AND ga.account_type = 'expense'
             AND je.entry_date >= DATE_TRUNC('month', CURRENT_DATE)), 0
        ),
        'net_profit', COALESCE(
          (SELECT SUM(credit_amount - debit_amount)
           FROM journal_entry_lines jel
           JOIN journal_entries je ON je.id = jel.entry_id
           JOIN gl_accounts ga ON ga.id = jel.account_id
           WHERE je.status = 'posted'
             AND ga.account_type IN ('revenue', 'expense')
             AND je.entry_date >= DATE_TRUNC('month', CURRENT_DATE)), 0
        )
      )
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;
