
-- ============================================================
-- FREE PURCHASE ITEMS (BONUS QUANTITY) IMPLEMENTATION
-- ERP-Compliant | Auditable | Database-Level Protection
-- ============================================================

-- 1. Add free_qty column to pi_items (purchase invoice items)
ALTER TABLE public.pi_items 
ADD COLUMN IF NOT EXISTS free_qty NUMERIC NOT NULL DEFAULT 0 
CHECK (free_qty >= 0);

COMMENT ON COLUMN public.pi_items.free_qty IS 'Supplier bonus quantity - tracked separately from purchased qty';

-- 2. Add free_quantity column to warehouse_stock
ALTER TABLE public.warehouse_stock 
ADD COLUMN IF NOT EXISTS free_quantity NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.warehouse_stock.free_quantity IS 'Free stock from supplier bonuses - NOT available for automatic sale consumption';

-- 3. Create trigger to protect free_quantity from manual updates
CREATE OR REPLACE FUNCTION public.trg_protect_free_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Allow system functions to update free_quantity
  IF current_setting('app.current_function', true) IN (
    'post_purchase_invoice',
    'post_purchase_return',
    'convert_free_stock',
    'post_stock_adjustment'
  ) THEN
    RETURN NEW;
  END IF;

  -- Check if free_quantity is being modified
  IF TG_OP = 'UPDATE' AND OLD.free_quantity IS DISTINCT FROM NEW.free_quantity THEN
    -- Log the violation
    INSERT INTO erp_violation_log (
      violation_type,
      attempted_action,
      table_name,
      record_id,
      old_values,
      new_values,
      user_id,
      error_message
    ) VALUES (
      'manual_free_stock_modification',
      'UPDATE',
      'warehouse_stock',
      NEW.item_id::text || ':' || NEW.warehouse_id::text,
      jsonb_build_object('free_quantity', OLD.free_quantity),
      jsonb_build_object('free_quantity', NEW.free_quantity),
      auth.uid(),
      'محاولة تعديل المخزون المجاني يدوياً - مخالفة لقواعد ERP'
    );
    
    RAISE EXCEPTION 'لا يمكن تعديل الكمية المجانية يدوياً. استخدم فواتير الشراء أو التسويات المعتمدة.';
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_protect_free_quantity ON public.warehouse_stock;
CREATE TRIGGER trg_protect_free_quantity
  BEFORE UPDATE ON public.warehouse_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_free_quantity();

-- 4. Create audit table for free stock changes
CREATE TABLE IF NOT EXISTS public.free_stock_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL,
  item_id UUID NOT NULL,
  operation TEXT NOT NULL, -- 'add', 'adjust', 'convert'
  quantity_change NUMERIC NOT NULL,
  quantity_before NUMERIC NOT NULL,
  quantity_after NUMERIC NOT NULL,
  source_document_type TEXT, -- 'purchase_invoice', 'stock_adjustment'
  source_document_id UUID,
  source_document_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on audit log
ALTER TABLE public.free_stock_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view free stock audit log
CREATE POLICY "Admins can view free stock audit log"
  ON public.free_stock_audit_log FOR SELECT
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role]));

-- System can insert audit entries
CREATE POLICY "System can insert free stock audit entries"
  ON public.free_stock_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role])
    OR current_setting('app.current_function', true) IS NOT NULL
  );

-- 5. Update v_stock_levels view to include free_quantity
DROP VIEW IF EXISTS public.v_stock_levels CASCADE;
CREATE OR REPLACE VIEW public.v_stock_levels
WITH (security_invoker = true)
AS
SELECT 
  ws.warehouse_id,
  w.name AS warehouse_name,
  ws.item_id AS product_id,
  p.name AS product_name,
  p.barcode,
  p.sku,
  COALESCE(ws.qty_on_hand, 0) AS total_quantity,
  COALESCE(ws.qty_reserved, 0) AS reserved_quantity,
  (COALESCE(ws.qty_on_hand, 0) - COALESCE(ws.qty_reserved, 0)) AS available_quantity,
  COALESCE(ws.qty_inbound, 0) AS inbound_quantity,
  COALESCE(ws.qty_outbound, 0) AS outbound_quantity,
  COALESCE(ws.free_quantity, 0) AS free_quantity,
  (COALESCE(ws.qty_on_hand, 0) + COALESCE(ws.free_quantity, 0)) AS total_stock_with_free,
  CASE
    WHEN COALESCE(ws.qty_on_hand, 0) <= 0 THEN 'out_of_stock'
    WHEN (COALESCE(ws.qty_on_hand, 0) - COALESCE(ws.qty_reserved, 0)) <= 0 THEN 'fully_reserved'
    WHEN COALESCE(ws.qty_on_hand, 0) <= COALESCE(p.min_quantity, 10) THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status,
  ws.last_updated
FROM warehouse_stock ws
JOIN warehouses w ON w.id = ws.warehouse_id
JOIN products p ON p.id = ws.item_id;

-- Grant access to authenticated users
REVOKE ALL ON public.v_stock_levels FROM anon, public;
GRANT SELECT ON public.v_stock_levels TO authenticated;

-- 6. Update v_comprehensive_stock_status to include free_quantity
DROP VIEW IF EXISTS public.v_comprehensive_stock_status CASCADE;
CREATE OR REPLACE VIEW public.v_comprehensive_stock_status
WITH (security_invoker = true)
AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.barcode,
  w.id AS warehouse_id,
  w.name AS warehouse_name,
  COALESCE(ws.qty_on_hand, 0) AS total_quantity,
  COALESCE((
    SELECT SUM(sr.quantity_reserved)
    FROM stock_reservations sr
    WHERE sr.item_id = p.id 
      AND sr.warehouse_id = w.id 
      AND sr.status = 'active' 
      AND sr.can_sell = false
  ), 0) AS reserved_quantity,
  COALESCE((
    SELECT SUM(sr.quantity_reserved)
    FROM stock_reservations sr
    WHERE sr.item_id = p.id 
      AND sr.warehouse_id = w.id 
      AND sr.status = 'active' 
      AND sr.reservation_type = 'inbound'
  ), 0) AS inbound_quantity,
  get_available_stock(p.id, w.id) AS available_quantity,
  COALESCE(ws.free_quantity, 0) AS free_quantity,
  (COALESCE(ws.qty_on_hand, 0) + COALESCE(ws.free_quantity, 0)) AS total_stock_with_free,
  CASE
    WHEN COALESCE(ws.qty_on_hand, 0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(ws.qty_on_hand, 0) <= COALESCE(p.reorder_level, 10) THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status
FROM products p
CROSS JOIN warehouses w
LEFT JOIN warehouse_stock ws ON ws.item_id = p.id AND ws.warehouse_id = w.id
WHERE p.is_active = true AND w.is_active = true;

REVOKE ALL ON public.v_comprehensive_stock_status FROM anon, public;
GRANT SELECT ON public.v_comprehensive_stock_status TO authenticated;

-- 7. Update v_product_stock_summary to include free_quantity
DROP VIEW IF EXISTS public.v_product_stock_summary CASCADE;
CREATE OR REPLACE VIEW public.v_product_stock_summary
WITH (security_invoker = true)
AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.barcode,
  p.sku,
  c.name AS category_name,
  s.name AS supplier_name,
  s.id AS supplier_id,
  COALESCE(SUM(ws.qty_on_hand), 0) AS total_stock,
  COALESCE(SUM(ws.qty_reserved), 0) AS reserved_stock,
  COALESCE(SUM(ws.qty_inbound), 0) AS inbound_stock,
  COALESCE(SUM(ws.qty_on_hand) - SUM(ws.qty_reserved), 0) AS available_stock,
  COALESCE(SUM(ws.free_quantity), 0) AS free_stock,
  COALESCE((SUM(ws.qty_on_hand) + SUM(ws.free_quantity)), 0) AS total_stock_with_free,
  COALESCE((
    SELECT SUM(sr.quantity_reserved - sr.quantity_released)
    FROM stock_reservations sr
    WHERE sr.item_id = p.id 
      AND sr.status IN ('active', 'partially_released')
  ), 0) AS locked_stock,
  p.reorder_level,
  p.min_quantity,
  p.is_active
FROM products p
LEFT JOIN warehouse_stock ws ON ws.item_id = p.id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN suppliers s ON s.id = p.preferred_supplier_id
GROUP BY p.id, p.name, p.barcode, p.sku, c.name, s.name, s.id, p.reorder_level, p.min_quantity, p.is_active;

REVOKE ALL ON public.v_product_stock_summary FROM anon, public;
GRANT SELECT ON public.v_product_stock_summary TO authenticated;

-- 8. Update post_purchase_invoice function to handle free_qty
CREATE OR REPLACE FUNCTION public.post_purchase_invoice(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_invoice RECORD;
  v_item RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_mapping_purchase RECORD;
  v_mapping_tax RECORD;
  v_mapping_payable RECORD;
  v_line_no INTEGER := 0;
  v_result JSONB;
  v_old_free_qty NUMERIC;
BEGIN
  -- Set context for trigger bypass
  PERFORM set_config('app.current_function', 'post_purchase_invoice', true);

  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'inventory_manager']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات الترحيل';
  END IF;

  -- Get invoice details
  SELECT pi.*, s.name as supplier_name 
  INTO v_invoice 
  FROM purchase_invoices pi
  LEFT JOIN suppliers s ON s.id = pi.supplier_id
  WHERE pi.id = p_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'فاتورة الشراء غير موجودة';
  END IF;
  
  IF v_invoice.status = 'posted' THEN
    RAISE EXCEPTION 'الفاتورة مرحّلة مسبقاً';
  END IF;

  -- Validate posting period
  PERFORM validate_posting_period(v_invoice.invoice_date);

  -- Check for existing GL entry
  IF EXISTS (SELECT 1 FROM gl_journal_entries WHERE source_document_id = p_invoice_id::text AND source_module = 'purchase_invoices') THEN
    RAISE EXCEPTION 'تم إنشاء قيد محاسبي لهذه الفاتورة مسبقاً';
  END IF;

  -- Get account mappings
  SELECT * INTO v_mapping_purchase FROM erp_account_mappings 
  WHERE module = 'purchases' AND operation = 'purchase_invoice' AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_tax FROM erp_account_mappings 
  WHERE module = 'purchases' AND operation = 'purchase_tax' AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_payable FROM erp_account_mappings 
  WHERE module = 'purchases' AND operation = 'accounts_payable' AND is_active = true LIMIT 1;

  IF v_mapping_purchase.debit_account_id IS NULL THEN
    SELECT id INTO v_mapping_purchase.debit_account_id FROM gl_accounts WHERE account_code = '1310' LIMIT 1;
  END IF;
  
  IF v_mapping_payable.credit_account_id IS NULL THEN
    SELECT id INTO v_mapping_payable.credit_account_id FROM gl_accounts WHERE account_code = '2110' LIMIT 1;
  END IF;

  -- Generate journal entry number
  v_je_number := (SELECT generate_journal_entry_number());

  -- Create journal entry with dual currency support
  INSERT INTO gl_journal_entries (
    entry_no, entry_date, posting_date, description,
    source_module, source_document_id, is_posted, is_reversed, created_by
  ) VALUES (
    v_je_number,
    v_invoice.invoice_date,
    CURRENT_DATE,
    'فاتورة شراء رقم: ' || v_invoice.pi_number || ' - ' || COALESCE(v_invoice.supplier_name, ''),
    'purchase_invoices',
    p_invoice_id::TEXT,
    true, false, auth.uid()
  ) RETURNING id INTO v_je_id;

  -- Debit: Inventory/Purchases (subtotal in BC)
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (
    journal_id, line_no, account_id, 
    debit, credit, 
    debit_fc, credit_fc, debit_bc, credit_bc,
    currency_code, exchange_rate, description
  ) VALUES (
    v_je_id, v_line_no, v_mapping_purchase.debit_account_id,
    COALESCE(v_invoice.subtotal_bc, v_invoice.subtotal), 0,
    v_invoice.subtotal_fc, 0, COALESCE(v_invoice.subtotal_bc, v_invoice.subtotal), 0,
    COALESCE(v_invoice.currency_code, 'YER'), COALESCE(v_invoice.exchange_rate, 1),
    'مشتريات'
  );

  -- Debit: VAT Input (tax amount in BC)
  IF COALESCE(v_invoice.tax_amount, 0) > 0 THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (
      journal_id, line_no, account_id, 
      debit, credit,
      debit_fc, credit_fc, debit_bc, credit_bc,
      currency_code, exchange_rate, description
    ) VALUES (
      v_je_id, v_line_no, 
      COALESCE(v_mapping_tax.debit_account_id, (SELECT id FROM gl_accounts WHERE account_code = '1320' LIMIT 1)),
      COALESCE(v_invoice.tax_amount_bc, v_invoice.tax_amount), 0,
      v_invoice.tax_amount_fc, 0, COALESCE(v_invoice.tax_amount_bc, v_invoice.tax_amount), 0,
      COALESCE(v_invoice.currency_code, 'YER'), COALESCE(v_invoice.exchange_rate, 1),
      'ضريبة مدخلات'
    );
  END IF;

  -- Credit: Accounts Payable (total in BC)
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (
    journal_id, line_no, account_id, 
    debit, credit,
    debit_fc, credit_fc, debit_bc, credit_bc,
    currency_code, exchange_rate, description
  ) VALUES (
    v_je_id, v_line_no, v_mapping_payable.credit_account_id,
    0, COALESCE(v_invoice.total_amount_bc, v_invoice.total_amount),
    0, v_invoice.total_amount_fc, 0, COALESCE(v_invoice.total_amount_bc, v_invoice.total_amount),
    COALESCE(v_invoice.currency_code, 'YER'), COALESCE(v_invoice.exchange_rate, 1),
    'ذمم موردين'
  );

  -- Process each invoice item for inventory update
  FOR v_item IN
    SELECT pi_items.*, p.name as product_name
    FROM pi_items
    JOIN products p ON p.id = pi_items.item_id
    WHERE pi_items.pi_id = p_invoice_id
  LOOP
    -- Update warehouse stock - normal qty goes to qty_on_hand
    INSERT INTO warehouse_stock (warehouse_id, item_id, qty_on_hand, free_quantity, last_updated)
    VALUES (v_invoice.warehouse_id, v_item.item_id, COALESCE(v_item.qty, 0), COALESCE(v_item.free_qty, 0), now())
    ON CONFLICT (warehouse_id, item_id)
    DO UPDATE SET 
      qty_on_hand = warehouse_stock.qty_on_hand + COALESCE(v_item.qty, 0),
      free_quantity = warehouse_stock.free_quantity + COALESCE(v_item.free_qty, 0),
      last_updated = now();

    -- Create stock ledger entry for normal qty
    IF COALESCE(v_item.qty, 0) > 0 THEN
      INSERT INTO stock_ledger (
        item_id, warehouse_id, movement_type, qty_in,
        reference_type, reference_id, notes, created_by
      ) VALUES (
        v_item.item_id, v_invoice.warehouse_id, 'purchase',
        v_item.qty,
        'purchase_invoice', p_invoice_id,
        'فاتورة شراء: ' || v_invoice.pi_number,
        auth.uid()
      );
    END IF;

    -- Create stock ledger entry for free qty if exists
    IF COALESCE(v_item.free_qty, 0) > 0 THEN
      INSERT INTO stock_ledger (
        item_id, warehouse_id, movement_type, qty_in,
        reference_type, reference_id, notes, created_by
      ) VALUES (
        v_item.item_id, v_invoice.warehouse_id, 'free_purchase',
        v_item.free_qty,
        'purchase_invoice', p_invoice_id,
        'كمية مجانية من المورد - فاتورة: ' || v_invoice.pi_number,
        auth.uid()
      );

      -- Get old free quantity for audit
      SELECT COALESCE(ws.free_quantity, 0) - v_item.free_qty
      INTO v_old_free_qty
      FROM warehouse_stock ws
      WHERE ws.warehouse_id = v_invoice.warehouse_id AND ws.item_id = v_item.item_id;

      -- Audit log for free stock
      INSERT INTO free_stock_audit_log (
        warehouse_id, item_id, operation,
        quantity_change, quantity_before, quantity_after,
        source_document_type, source_document_id, source_document_number,
        notes, created_by
      ) VALUES (
        v_invoice.warehouse_id, v_item.item_id, 'add',
        v_item.free_qty, COALESCE(v_old_free_qty, 0), COALESCE(v_old_free_qty, 0) + v_item.free_qty,
        'purchase_invoice', p_invoice_id, v_invoice.pi_number,
        'كمية مجانية من المورد للمنتج: ' || v_item.product_name,
        auth.uid()
      );
    END IF;

    -- Create FIFO cost layer for purchased qty ONLY (not free qty)
    IF COALESCE(v_item.qty, 0) > 0 THEN
      INSERT INTO inventory_cost_layers (
        product_id, warehouse_id, quantity, remaining_quantity,
        unit_cost, total_cost, receipt_date,
        source_document_type, source_document_id, created_by
      ) VALUES (
        v_item.item_id, v_invoice.warehouse_id,
        v_item.qty, v_item.qty,
        COALESCE(v_item.price_bc, v_item.price) / NULLIF(v_item.qty, 0),
        COALESCE(v_item.line_total_bc, v_item.line_total),
        v_invoice.invoice_date,
        'purchase_invoice', p_invoice_id,
        auth.uid()
      );
    END IF;
  END LOOP;

  -- Update invoice status
  UPDATE purchase_invoices
  SET status = 'posted',
      posted_at = now(),
      posted_by = auth.uid(),
      journal_entry_id = v_je_id
  WHERE id = p_invoice_id;

  -- Clear context
  PERFORM set_config('app.current_function', '', true);

  v_result := jsonb_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'message', 'تم ترحيل فاتورة الشراء بنجاح'
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Clear context on error
  PERFORM set_config('app.current_function', '', true);
  RAISE;
END;
$function$;

-- 9. Recreate stock_alerts view (dependency)
CREATE OR REPLACE VIEW public.stock_alerts
WITH (security_invoker = true)
AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  p.reorder_level,
  w.id AS warehouse_id,
  w.name AS warehouse_name,
  COALESCE(ws.qty_on_hand, 0) AS current_qty,
  (COALESCE(p.reorder_level, 0) - COALESCE(ws.qty_on_hand, 0)) AS shortage
FROM products p
CROSS JOIN warehouses w
LEFT JOIN warehouse_stock ws ON ws.item_id = p.id AND ws.warehouse_id = w.id
WHERE p.is_active = true 
  AND w.is_active = true 
  AND COALESCE(ws.qty_on_hand, 0) <= COALESCE(p.reorder_level, 0)
  AND auth.uid() IS NOT NULL 
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]);

REVOKE ALL ON public.stock_alerts FROM anon, public;
GRANT SELECT ON public.stock_alerts TO authenticated;

-- 10. Add index for free_quantity queries
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_free_quantity 
ON public.warehouse_stock(item_id, warehouse_id) 
WHERE free_quantity > 0;
