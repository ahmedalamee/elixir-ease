
-- ==============================================================
-- 🔒 PHARMACEUTICAL ERP - COMPREHENSIVE ENFORCEMENT MIGRATION
-- Enforces: SAP/Oracle/Odoo Best Practices
-- ==============================================================

-- =====================================================
-- 1️⃣ PRODUCT INVENTORY GOLDEN RULE
-- Products MUST start at qty=0, NO manual stock changes
-- =====================================================

-- Add optional expiry_alert_months field (Rule 3)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS expiry_alert_months INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.products.expiry_alert_months IS 
'عدد الأشهر للتنبيه قبل انتهاء الصلاحية (اختياري)';

-- Force products.quantity to always be 0 (legacy field protection)
-- This field should NOT be used, warehouse_stock is the source of truth
CREATE OR REPLACE FUNCTION public.enforce_product_zero_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- On INSERT: Always force quantity to 0
  IF TG_OP = 'INSERT' THEN
    IF NEW.quantity IS NOT NULL AND NEW.quantity <> 0 THEN
      RAISE EXCEPTION '❌ لا يمكن إنشاء منتج بكمية غير صفرية! يجب أن يبدأ المخزون من الصفر دائماً';
    END IF;
    NEW.quantity := 0;
  END IF;
  
  -- On UPDATE: Block any quantity change
  IF TG_OP = 'UPDATE' THEN
    IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
      RAISE EXCEPTION '❌ لا يمكن تعديل كمية المنتج مباشرة! استخدم فاتورة شراء أو تسوية مخزون معتمدة';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_product_zero_quantity ON public.products;
CREATE TRIGGER trg_enforce_product_zero_quantity
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_zero_quantity();

-- =====================================================
-- 2️⃣ WAREHOUSE STOCK ABSOLUTE PROTECTION
-- Strengthen existing protection with audit logging
-- =====================================================

CREATE OR REPLACE FUNCTION public.trg_absolute_stock_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller TEXT;
  v_allowed TEXT[] := ARRAY[
    'post_goods_receipt', 'post_purchase_invoice', 'post_sales_invoice',
    'post_sales_return', 'post_purchase_return', 'post_stock_adjustment',
    'post_warehouse_transfer', 'reverse_sales_invoice', 'reverse_purchase_invoice',
    'consume_fifo_layers', 'add_cost_layer', 'system_init'
  ];
BEGIN
  v_caller := current_setting('app.current_function', true);
  
  -- Block direct qty_on_hand changes
  IF TG_OP = 'UPDATE' AND OLD.qty_on_hand IS DISTINCT FROM NEW.qty_on_hand THEN
    IF v_caller IS NULL OR NOT (v_caller = ANY(v_allowed)) THEN
      -- Log violation attempt
      INSERT INTO public.audit_log (
        table_name, record_id, operation, old_data, new_data, changed_by, changed_at
      ) VALUES (
        'warehouse_stock_violation',
        NEW.item_id::text,
        'BLOCKED_MODIFICATION',
        jsonb_build_object('qty_on_hand', OLD.qty_on_hand),
        jsonb_build_object('qty_on_hand', NEW.qty_on_hand, 'attempted_caller', v_caller),
        auth.uid(),
        NOW()
      );
      
      RAISE EXCEPTION '❌ [مخالفة أمنية] لا يمكن تعديل المخزون مباشرة! المسموح: فاتورة شراء/بيع، مرتجع، أو تسوية معتمدة. (Caller: %)', COALESCE(v_caller, 'NULL');
    END IF;
  END IF;
  
  -- Block INSERT with initial quantity
  IF TG_OP = 'INSERT' AND COALESCE(NEW.qty_on_hand, 0) > 0 THEN
    IF v_caller IS NULL OR NOT (v_caller = ANY(v_allowed)) THEN
      RAISE EXCEPTION '❌ لا يمكن إنشاء سجل مخزون بكمية أولية! يجب أن يبدأ المخزون من الصفر';
    END IF;
  END IF;
  
  -- Block DELETE entirely
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION '❌ لا يمكن حذف سجلات المخزون! استخدم تسوية مخزون بدلاً من ذلك';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Replace existing triggers with absolute protection
DROP TRIGGER IF EXISTS trg_strict_stock_protection ON public.warehouse_stock;
DROP TRIGGER IF EXISTS trg_protect_warehouse_stock ON public.warehouse_stock;
DROP TRIGGER IF EXISTS trg_absolute_stock_protection ON public.warehouse_stock;

CREATE TRIGGER trg_absolute_stock_protection
  BEFORE INSERT OR UPDATE OR DELETE ON public.warehouse_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_absolute_stock_protection();

-- =====================================================
-- 3️⃣ DOCUMENT IMMUTABILITY - NO REVERSE/EDIT/DELETE
-- Posted documents are FROZEN forever
-- =====================================================

CREATE OR REPLACE FUNCTION public.enforce_document_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_posted BOOLEAN;
BEGIN
  -- Check if document was posted
  v_is_posted := COALESCE(OLD.status, '') IN ('posted', 'completed', 'approved');
  
  -- Block DELETE on any posted document
  IF TG_OP = 'DELETE' AND v_is_posted THEN
    RAISE EXCEPTION '❌ لا يمكن حذف مستند مرحّل! قم بإنشاء مستند مرتجع بدلاً من ذلك';
  END IF;
  
  -- Block UPDATE on posted document (except specific fields)
  IF TG_OP = 'UPDATE' AND v_is_posted THEN
    -- Only allow payment_status updates for tracking payments
    IF OLD.status = NEW.status 
       AND (TG_TABLE_NAME IN ('purchase_invoices', 'sales_invoices')) 
       AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
      -- Allow payment status updates only
      RETURN NEW;
    END IF;
    
    -- Block status reversal attempts
    IF NEW.status IN ('draft', 'cancelled') THEN
      RAISE EXCEPTION '❌ لا يمكن عكس أو إلغاء مستند مرحّل! قم بإنشاء مستند مرتجع منفصل';
    END IF;
    
    -- Block any other changes to critical fields
    IF OLD.total_amount IS DISTINCT FROM NEW.total_amount
       OR OLD.supplier_id IS DISTINCT FROM NEW.supplier_id
       OR OLD.customer_id IS DISTINCT FROM NEW.customer_id
       OR OLD.warehouse_id IS DISTINCT FROM NEW.warehouse_id THEN
      RAISE EXCEPTION '❌ لا يمكن تعديل بيانات مستند مرحّل! قم بإنشاء مستند مرتجع إذا لزم الأمر';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply to sales_invoices
DROP TRIGGER IF EXISTS trg_enforce_sales_immutability ON public.sales_invoices;
CREATE TRIGGER trg_enforce_sales_immutability
  BEFORE UPDATE OR DELETE ON public.sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_document_immutability();

-- Apply to purchase_invoices  
DROP TRIGGER IF EXISTS trg_enforce_purchase_immutability ON public.purchase_invoices;
CREATE TRIGGER trg_enforce_purchase_immutability
  BEFORE UPDATE OR DELETE ON public.purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_document_immutability();

-- =====================================================
-- 4️⃣ MANDATORY PROCUREMENT CHAIN ENFORCEMENT
-- PR → RFQ → PO → GRN → PI (No bypass allowed)
-- =====================================================

-- RFQ MUST have PR reference
CREATE OR REPLACE FUNCTION public.enforce_rfq_requires_pr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.pr_id IS NULL THEN
    RAISE EXCEPTION '❌ لا يمكن إنشاء طلب تسعير بدون طلب شراء (PR)! يجب ربط RFQ بطلب شراء أولاً';
  END IF;
  
  -- Verify PR exists and is approved
  IF NOT EXISTS (
    SELECT 1 FROM public.purchase_requisitions 
    WHERE id = NEW.pr_id AND status IN ('approved', 'partial', 'completed')
  ) THEN
    RAISE EXCEPTION '❌ طلب الشراء (PR) غير موجود أو غير معتمد!';
  END IF;
  
  RETURN NEW;
END;
$$;

-- PO MUST have RFQ or PR reference
CREATE OR REPLACE FUNCTION public.enforce_po_requires_rfq_or_pr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow if linked to RFQ (which already validates PR)
  IF NEW.rfq_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.rfq_requests 
      WHERE id = NEW.rfq_id AND status IN ('completed', 'partial_awarded', 'awarded')
    ) THEN
      RAISE EXCEPTION '❌ طلب التسعير (RFQ) غير موجود أو غير مكتمل!';
    END IF;
    RETURN NEW;
  END IF;
  
  -- Allow if linked to PR directly (emergency/direct purchase)
  IF NEW.pr_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.purchase_requisitions 
      WHERE id = NEW.pr_id AND status IN ('approved', 'partial', 'completed')
    ) THEN
      RAISE EXCEPTION '❌ طلب الشراء (PR) غير موجود أو غير معتمد!';
    END IF;
    RETURN NEW;
  END IF;
  
  -- Neither RFQ nor PR - reject
  RAISE EXCEPTION '❌ لا يمكن إنشاء أمر شراء بدون طلب تسعير (RFQ) أو طلب شراء (PR)!';
END;
$$;

-- GRN MUST have PO reference
CREATE OR REPLACE FUNCTION public.enforce_grn_requires_po()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.po_id IS NULL THEN
    RAISE EXCEPTION '❌ لا يمكن إنشاء إشعار استلام بدون أمر شراء (PO)! يجب ربط GRN بأمر شراء أولاً';
  END IF;
  
  -- Verify PO exists and is approved
  IF NOT EXISTS (
    SELECT 1 FROM public.purchase_orders 
    WHERE id = NEW.po_id AND status IN ('approved', 'partial', 'completed')
  ) THEN
    RAISE EXCEPTION '❌ أمر الشراء (PO) غير موجود أو غير معتمد!';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Purchase Invoice MUST have PO or GRN reference
CREATE OR REPLACE FUNCTION public.enforce_pi_requires_po_or_grn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if linked to GRN
  IF NEW.grn_id IS NOT NULL OR (NEW.source_grn_ids IS NOT NULL AND array_length(NEW.source_grn_ids, 1) > 0) THEN
    RETURN NEW;
  END IF;
  
  -- Check if linked to PO
  IF NEW.po_id IS NOT NULL OR (NEW.source_po_ids IS NOT NULL AND array_length(NEW.source_po_ids, 1) > 0) THEN
    RETURN NEW;
  END IF;
  
  -- Neither - reject with clear message
  RAISE EXCEPTION '❌ لا يمكن إنشاء فاتورة شراء مباشرة! يجب الربط بأمر شراء (PO) أو إشعار استلام (GRN)';
END;
$$;

-- Apply procurement chain triggers
DROP TRIGGER IF EXISTS trg_enforce_rfq_requires_pr ON public.rfq_requests;
CREATE TRIGGER trg_enforce_rfq_requires_pr
  BEFORE INSERT ON public.rfq_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_rfq_requires_pr();

DROP TRIGGER IF EXISTS trg_enforce_po_requires_rfq ON public.purchase_orders;
CREATE TRIGGER trg_enforce_po_requires_rfq
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_po_requires_rfq_or_pr();

DROP TRIGGER IF EXISTS trg_enforce_grn_requires_po ON public.goods_receipts;
CREATE TRIGGER trg_enforce_grn_requires_po
  BEFORE INSERT ON public.goods_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_grn_requires_po();

DROP TRIGGER IF EXISTS trg_validate_purchase_invoice_source ON public.purchase_invoices;
DROP TRIGGER IF EXISTS trg_enforce_pi_requires_source ON public.purchase_invoices;
CREATE TRIGGER trg_enforce_pi_requires_source
  BEFORE INSERT ON public.purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pi_requires_po_or_grn();

-- =====================================================
-- 5️⃣ SALES STOCK AVAILABILITY CHECK
-- Cannot sell more than available quantity
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_sales_stock_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available NUMERIC;
  v_product_name TEXT;
BEGIN
  -- Get available quantity (total - reserved)
  SELECT 
    COALESCE(ws.qty_on_hand, 0) - COALESCE(ws.qty_reserved, 0),
    p.name
  INTO v_available, v_product_name
  FROM public.warehouse_stock ws
  JOIN public.products p ON p.id = ws.item_id
  WHERE ws.item_id = NEW.product_id 
    AND ws.warehouse_id = NEW.warehouse_id;
  
  -- If no stock record exists
  IF v_available IS NULL THEN
    SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
    RAISE EXCEPTION '❌ المنتج [%] غير متوفر في هذا المستودع! الكمية المتاحة: 0', v_product_name;
  END IF;
  
  -- Check if requested quantity exceeds available
  IF NEW.quantity > v_available THEN
    RAISE EXCEPTION '❌ الكمية المطلوبة (%) للمنتج [%] تتجاوز الكمية المتاحة (%)!', 
      NEW.quantity, v_product_name, v_available;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_sales_availability ON public.sales_invoice_items;
CREATE TRIGGER trg_check_sales_availability
  BEFORE INSERT OR UPDATE ON public.sales_invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.check_sales_stock_availability();

-- =====================================================
-- 6️⃣ COMPREHENSIVE STOCK VIEW
-- Shows: Total, Available, Reserved, Inbound
-- =====================================================

CREATE OR REPLACE VIEW public.v_stock_levels AS
SELECT 
  ws.warehouse_id,
  w.name AS warehouse_name,
  ws.item_id AS product_id,
  p.name AS product_name,
  p.barcode,
  p.sku,
  COALESCE(ws.qty_on_hand, 0) AS total_quantity,
  COALESCE(ws.qty_reserved, 0) AS reserved_quantity,
  COALESCE(ws.qty_on_hand, 0) - COALESCE(ws.qty_reserved, 0) AS available_quantity,
  COALESCE(ws.qty_inbound, 0) AS inbound_quantity,
  COALESCE(ws.qty_outbound, 0) AS outbound_quantity,
  -- Stock status indicator
  CASE 
    WHEN COALESCE(ws.qty_on_hand, 0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(ws.qty_on_hand, 0) - COALESCE(ws.qty_reserved, 0) <= 0 THEN 'fully_reserved'
    WHEN COALESCE(ws.qty_on_hand, 0) <= COALESCE(p.min_quantity, 10) THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status,
  ws.last_updated
FROM public.warehouse_stock ws
JOIN public.warehouses w ON w.id = ws.warehouse_id
JOIN public.products p ON p.id = ws.item_id;

-- Grant access to authenticated users
GRANT SELECT ON public.v_stock_levels TO authenticated;

-- =====================================================
-- 7️⃣ AUTOMATIC STOCK RESERVATION SYSTEM
-- Reserve on Sales Invoice creation, release on cancel
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_reserve_sales_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Only reserve when invoice changes to draft from nothing (new invoice)
  IF TG_OP = 'INSERT' AND NEW.status = 'draft' THEN
    -- Reserve quantities for all items
    FOR v_item IN 
      SELECT product_id, quantity, warehouse_id
      FROM sales_invoice_items 
      WHERE invoice_id = NEW.id
    LOOP
      -- Update warehouse_stock reserved quantity
      UPDATE warehouse_stock
      SET qty_reserved = COALESCE(qty_reserved, 0) + v_item.quantity,
          last_updated = NOW()
      WHERE item_id = v_item.product_id 
        AND warehouse_id = COALESCE(v_item.warehouse_id, NEW.warehouse_id);
      
      -- Create reservation record
      INSERT INTO stock_reservations (
        warehouse_id, item_id, reference_type, reference_id, 
        reference_number, quantity_reserved, status, reservation_type, can_sell
      ) VALUES (
        COALESCE(v_item.warehouse_id, NEW.warehouse_id),
        v_item.product_id,
        'sales_invoice',
        NEW.id,
        NEW.invoice_number,
        v_item.quantity,
        'active',
        'sales',
        false
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_release_sales_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Release reservations when invoice is cancelled
  IF OLD.status = 'draft' AND NEW.status = 'cancelled' THEN
    -- Release reserved quantities
    UPDATE warehouse_stock ws
    SET qty_reserved = GREATEST(0, COALESCE(qty_reserved, 0) - sr.quantity_reserved),
        last_updated = NOW()
    FROM stock_reservations sr
    WHERE sr.reference_id = NEW.id
      AND sr.reference_type = 'sales_invoice'
      AND sr.status = 'active'
      AND ws.item_id = sr.item_id
      AND ws.warehouse_id = sr.warehouse_id;
    
    -- Update reservation status
    UPDATE stock_reservations
    SET status = 'released',
        released_at = NOW(),
        released_by = auth.uid()
    WHERE reference_id = NEW.id
      AND reference_type = 'sales_invoice'
      AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 8️⃣ EXPIRY ALERT NOTIFICATION VIEW
-- Products nearing expiry based on expiry_alert_months
-- =====================================================

CREATE OR REPLACE VIEW public.v_expiry_alerts AS
SELECT 
  icl.product_id,
  p.name AS product_name,
  p.barcode,
  icl.warehouse_id,
  w.name AS warehouse_name,
  icl.batch_number,
  icl.expiry_date,
  icl.quantity_remaining,
  p.expiry_alert_months,
  -- Days until expiry
  (icl.expiry_date - CURRENT_DATE) AS days_until_expiry,
  -- Alert level
  CASE 
    WHEN icl.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN icl.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'critical'
    WHEN icl.expiry_date <= CURRENT_DATE + (COALESCE(p.expiry_alert_months, 3) || ' months')::INTERVAL THEN 'warning'
    ELSE 'ok'
  END AS alert_level,
  icl.unit_cost,
  icl.quantity_remaining * icl.unit_cost AS total_value_at_risk
FROM public.inventory_cost_layers icl
JOIN public.products p ON p.id = icl.product_id
JOIN public.warehouses w ON w.id = icl.warehouse_id
WHERE icl.quantity_remaining > 0
  AND icl.expiry_date IS NOT NULL
  AND (
    icl.expiry_date < CURRENT_DATE  -- Already expired
    OR icl.expiry_date <= CURRENT_DATE + (COALESCE(p.expiry_alert_months, 3) || ' months')::INTERVAL
  )
ORDER BY icl.expiry_date ASC;

GRANT SELECT ON public.v_expiry_alerts TO authenticated;

-- =====================================================
-- 9️⃣ AUDIT VIOLATION LOG TABLE
-- Track all blocked attempts
-- =====================================================

CREATE TABLE IF NOT EXISTS public.erp_violation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  attempted_action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  blocked_reason TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.erp_violation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view violation logs"
  ON public.erp_violation_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert violation logs"
  ON public.erp_violation_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.erp_violation_log IS 
'سجل محاولات انتهاك قواعد النظام - للمراجعة والتدقيق';

-- =====================================================
-- ✅ FINAL: Grant necessary permissions
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.v_stock_levels TO authenticated;
GRANT SELECT ON public.v_expiry_alerts TO authenticated;
