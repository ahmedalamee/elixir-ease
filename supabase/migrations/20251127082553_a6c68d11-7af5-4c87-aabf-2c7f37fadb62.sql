-- دالة تحليل ربحية المنتجات (Product Profitability Analysis)
CREATE OR REPLACE FUNCTION public.analyze_product_profitability(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_product_category TEXT DEFAULT NULL
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  category TEXT,
  total_quantity_sold NUMERIC,
  total_revenue NUMERIC,
  total_cost NUMERIC,
  gross_profit NUMERIC,
  profit_margin NUMERIC,
  avg_selling_price NUMERIC,
  inventory_turnover NUMERIC
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
    COALESCE(c.name, 'غير مصنف') as category,
    COALESCE(SUM(sii.quantity), 0)::NUMERIC as total_quantity_sold,
    COALESCE(SUM(sii.line_total), 0)::NUMERIC as total_revenue,
    COALESCE(SUM(sii.quantity * p.cost_price), 0)::NUMERIC as total_cost,
    COALESCE(SUM(sii.line_total) - SUM(sii.quantity * p.cost_price), 0)::NUMERIC as gross_profit,
    CASE 
      WHEN SUM(sii.line_total) > 0 
      THEN ROUND((SUM(sii.line_total) - SUM(sii.quantity * p.cost_price)) / SUM(sii.line_total) * 100, 2)
      ELSE 0 
    END::NUMERIC as profit_margin,
    CASE 
      WHEN SUM(sii.quantity) > 0 
      THEN ROUND(SUM(sii.line_total) / SUM(sii.quantity), 2)
      ELSE 0 
    END::NUMERIC as avg_selling_price,
    CASE 
      WHEN AVG(ws.qty_on_hand) > 0 
      THEN ROUND(SUM(sii.quantity) / AVG(ws.qty_on_hand), 2)
      ELSE 0 
    END::NUMERIC as inventory_turnover
  FROM products p
  LEFT JOIN sales_invoice_items sii ON sii.item_id = p.id
  LEFT JOIN sales_invoices si ON si.id = sii.invoice_id 
    AND si.status = 'posted'
    AND si.invoice_date BETWEEN p_start_date AND p_end_date
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN warehouse_stock ws ON ws.item_id = p.id
  WHERE p.is_active = true
    AND (p_product_category IS NULL OR c.name = p_product_category)
  GROUP BY p.id, p.name, c.name
  HAVING SUM(sii.quantity) > 0
  ORDER BY gross_profit DESC;
END;
$$;

-- دالة تحليل الأداء التشغيلي (Operational Performance)
CREATE OR REPLACE FUNCTION public.get_operational_performance(
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
    'period', json_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'sales_metrics', (
      SELECT json_build_object(
        'total_invoices', COUNT(*),
        'total_revenue', COALESCE(SUM(total_amount), 0),
        'average_invoice_value', COALESCE(AVG(total_amount), 0),
        'total_items_sold', COALESCE(SUM(
          (SELECT SUM(quantity) FROM sales_invoice_items WHERE invoice_id = si.id)
        ), 0)
      )
      FROM sales_invoices si
      WHERE si.status = 'posted'
        AND si.invoice_date BETWEEN p_start_date AND p_end_date
    ),
    'top_selling_products', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          p.name as product_name,
          SUM(sii.quantity) as quantity_sold,
          SUM(sii.line_total) as revenue
        FROM sales_invoice_items sii
        JOIN sales_invoices si ON si.id = sii.invoice_id
        JOIN products p ON p.id = sii.item_id
        WHERE si.status = 'posted'
          AND si.invoice_date BETWEEN p_start_date AND p_end_date
        GROUP BY p.id, p.name
        ORDER BY quantity_sold DESC
        LIMIT 10
      ) t
    ),
    'customer_metrics', (
      SELECT json_build_object(
        'total_customers', COUNT(DISTINCT customer_id),
        'repeat_customers', COUNT(DISTINCT customer_id) FILTER (
          WHERE (SELECT COUNT(*) FROM sales_invoices si2 
                 WHERE si2.customer_id = si.customer_id 
                 AND si2.status = 'posted') > 1
        ),
        'average_purchase_per_customer', COALESCE(AVG(total_amount), 0)
      )
      FROM sales_invoices si
      WHERE si.status = 'posted'
        AND si.invoice_date BETWEEN p_start_date AND p_end_date
    ),
    'inventory_metrics', (
      SELECT json_build_object(
        'total_stock_value', COALESCE(SUM(ws.qty_on_hand * p.cost_price), 0),
        'low_stock_items', COUNT(*) FILTER (
          WHERE ws.qty_on_hand <= p.reorder_level AND p.reorder_level > 0
        ),
        'out_of_stock_items', COUNT(*) FILTER (WHERE ws.qty_on_hand = 0)
      )
      FROM warehouse_stock ws
      JOIN products p ON p.id = ws.item_id
      WHERE p.is_active = true
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- دالة تحليل دوران المخزون (Inventory Turnover Analysis)
CREATE OR REPLACE FUNCTION public.analyze_inventory_turnover(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  category TEXT,
  beginning_inventory NUMERIC,
  purchases NUMERIC,
  sales NUMERIC,
  ending_inventory NUMERIC,
  cogs NUMERIC,
  average_inventory NUMERIC,
  turnover_ratio NUMERIC,
  days_to_sell NUMERIC,
  stock_status TEXT
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
    COALESCE(c.name, 'غير مصنف') as category,
    COALESCE(
      (SELECT SUM(qty_on_hand) 
       FROM warehouse_stock 
       WHERE item_id = p.id), 0
    )::NUMERIC as beginning_inventory,
    COALESCE(
      (SELECT SUM(quantity) 
       FROM grn_items gi
       JOIN goods_receipts gr ON gr.id = gi.grn_id
       WHERE gi.item_id = p.id 
         AND gr.status = 'posted'
         AND gr.receipt_date BETWEEN p_start_date AND p_end_date), 0
    )::NUMERIC as purchases,
    COALESCE(
      (SELECT SUM(quantity) 
       FROM sales_invoice_items sii
       JOIN sales_invoices si ON si.id = sii.invoice_id
       WHERE sii.item_id = p.id 
         AND si.status = 'posted'
         AND si.invoice_date BETWEEN p_start_date AND p_end_date), 0
    )::NUMERIC as sales,
    COALESCE(
      (SELECT SUM(qty_on_hand) 
       FROM warehouse_stock 
       WHERE item_id = p.id), 0
    )::NUMERIC as ending_inventory,
    COALESCE(
      (SELECT SUM(sii.quantity * p.cost_price)
       FROM sales_invoice_items sii
       JOIN sales_invoices si ON si.id = sii.invoice_id
       WHERE sii.item_id = p.id 
         AND si.status = 'posted'
         AND si.invoice_date BETWEEN p_start_date AND p_end_date), 0
    )::NUMERIC as cogs,
    COALESCE(
      (SELECT AVG(qty_on_hand) 
       FROM warehouse_stock 
       WHERE item_id = p.id), 0
    )::NUMERIC as average_inventory,
    CASE 
      WHEN (SELECT AVG(qty_on_hand) FROM warehouse_stock WHERE item_id = p.id) > 0
      THEN ROUND(
        (SELECT SUM(quantity) FROM sales_invoice_items sii
         JOIN sales_invoices si ON si.id = sii.invoice_id
         WHERE sii.item_id = p.id AND si.status = 'posted'
         AND si.invoice_date BETWEEN p_start_date AND p_end_date) /
        (SELECT AVG(qty_on_hand) FROM warehouse_stock WHERE item_id = p.id), 2
      )
      ELSE 0
    END::NUMERIC as turnover_ratio,
    CASE 
      WHEN (SELECT SUM(quantity) FROM sales_invoice_items sii
            JOIN sales_invoices si ON si.id = sii.invoice_id
            WHERE sii.item_id = p.id AND si.status = 'posted'
            AND si.invoice_date BETWEEN p_start_date AND p_end_date) > 0
      THEN ROUND(
        (p_end_date - p_start_date) * 
        (SELECT AVG(qty_on_hand) FROM warehouse_stock WHERE item_id = p.id) /
        (SELECT SUM(quantity) FROM sales_invoice_items sii
         JOIN sales_invoices si ON si.id = sii.invoice_id
         WHERE sii.item_id = p.id AND si.status = 'posted'
         AND si.invoice_date BETWEEN p_start_date AND p_end_date), 1
      )
      ELSE 999
    END::NUMERIC as days_to_sell,
    CASE 
      WHEN (SELECT SUM(qty_on_hand) FROM warehouse_stock WHERE item_id = p.id) = 0 
        THEN 'نفذ من المخزون'
      WHEN (SELECT SUM(qty_on_hand) FROM warehouse_stock WHERE item_id = p.id) <= p.reorder_level 
        THEN 'مخزون منخفض'
      WHEN (SELECT SUM(quantity) FROM sales_invoice_items sii
            JOIN sales_invoices si ON si.id = sii.invoice_id
            WHERE sii.item_id = p.id AND si.status = 'posted'
            AND si.invoice_date BETWEEN p_start_date AND p_end_date) = 0
        THEN 'راكد'
      ELSE 'طبيعي'
    END::TEXT as stock_status
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE p.is_active = true
  ORDER BY turnover_ratio DESC;
END;
$$;

-- دالة تحليل الإيرادات حسب الفئة (Revenue by Category Analysis)
CREATE OR REPLACE FUNCTION public.analyze_revenue_by_category(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  category_name TEXT,
  total_revenue NUMERIC,
  total_cost NUMERIC,
  gross_profit NUMERIC,
  profit_margin NUMERIC,
  quantity_sold NUMERIC,
  invoice_count BIGINT,
  revenue_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_revenue_sum NUMERIC;
BEGIN
  -- Calculate total revenue for percentage calculation
  SELECT COALESCE(SUM(sii.line_total), 0) INTO total_revenue_sum
  FROM sales_invoice_items sii
  JOIN sales_invoices si ON si.id = sii.invoice_id
  WHERE si.status = 'posted'
    AND si.invoice_date BETWEEN p_start_date AND p_end_date;

  RETURN QUERY
  SELECT 
    COALESCE(c.name, 'غير مصنف') as category_name,
    COALESCE(SUM(sii.line_total), 0)::NUMERIC as total_revenue,
    COALESCE(SUM(sii.quantity * p.cost_price), 0)::NUMERIC as total_cost,
    COALESCE(SUM(sii.line_total) - SUM(sii.quantity * p.cost_price), 0)::NUMERIC as gross_profit,
    CASE 
      WHEN SUM(sii.line_total) > 0 
      THEN ROUND((SUM(sii.line_total) - SUM(sii.quantity * p.cost_price)) / SUM(sii.line_total) * 100, 2)
      ELSE 0 
    END::NUMERIC as profit_margin,
    COALESCE(SUM(sii.quantity), 0)::NUMERIC as quantity_sold,
    COUNT(DISTINCT si.id)::BIGINT as invoice_count,
    CASE 
      WHEN total_revenue_sum > 0 
      THEN ROUND(SUM(sii.line_total) / total_revenue_sum * 100, 2)
      ELSE 0 
    END::NUMERIC as revenue_percentage
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN sales_invoice_items sii ON sii.item_id = p.id
  LEFT JOIN sales_invoices si ON si.id = sii.invoice_id 
    AND si.status = 'posted'
    AND si.invoice_date BETWEEN p_start_date AND p_end_date
  WHERE p.is_active = true
  GROUP BY c.id, c.name
  HAVING SUM(sii.line_total) > 0
  ORDER BY total_revenue DESC;
END;
$$;