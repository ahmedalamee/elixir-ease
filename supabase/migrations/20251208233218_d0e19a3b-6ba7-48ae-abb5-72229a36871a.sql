-- ============================================================================
-- Sprint 2: Multi-Currency Foundation (YER/SAR)
-- تأسيس دعم العملات المتعددة بشكل كامل
-- ============================================================================

-- 1. إضافة حقول العملات المفقودة إلى po_items
ALTER TABLE po_items
  ADD COLUMN IF NOT EXISTS price_fc NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_bc NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount_fc NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount_bc NUMERIC DEFAULT 0;

-- 2. إضافة حقول العملات المفقودة إلى pi_items
ALTER TABLE pi_items
  ADD COLUMN IF NOT EXISTS price_fc NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_bc NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total_fc NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total_bc NUMERIC DEFAULT 0;

-- 3. إنشاء دالة لتحميل سعر الصرف تلقائياً
CREATE OR REPLACE FUNCTION get_latest_exchange_rate(
  p_from_currency VARCHAR,
  p_to_currency VARCHAR,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  -- If same currency, rate is 1
  IF p_from_currency = p_to_currency THEN
    RETURN 1;
  END IF;
  
  -- Try to get direct rate
  SELECT rate INTO v_rate
  FROM exchange_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;
  
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;
  
  -- Try inverse rate
  SELECT 1.0 / rate INTO v_rate
  FROM exchange_rates
  WHERE from_currency = p_to_currency
    AND to_currency = p_from_currency
    AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;
  
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;
  
  -- Return NULL if no rate found
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION get_latest_exchange_rate IS 'جلب أحدث سعر صرف بين عملتين لتاريخ معين';

-- 4. إنشاء دالة لتحويل المبلغ إلى العملة الأساسية
CREATE OR REPLACE FUNCTION convert_to_base_currency(
  p_amount NUMERIC,
  p_from_currency VARCHAR,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_base_currency VARCHAR;
  v_rate NUMERIC;
BEGIN
  -- Get base currency
  SELECT code INTO v_base_currency
  FROM currencies
  WHERE is_base = true
  LIMIT 1;
  
  IF v_base_currency IS NULL THEN
    v_base_currency := 'YER';
  END IF;
  
  -- If already base currency
  IF p_from_currency = v_base_currency THEN
    RETURN p_amount;
  END IF;
  
  -- Get exchange rate
  v_rate := get_latest_exchange_rate(p_from_currency, v_base_currency, p_date);
  
  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'سعر الصرف غير متوفر للعملة % بتاريخ %', p_from_currency, p_date;
  END IF;
  
  RETURN p_amount * v_rate;
END;
$$;

COMMENT ON FUNCTION convert_to_base_currency IS 'تحويل مبلغ إلى العملة الأساسية (YER)';

-- 5. إنشاء Trigger لتحديث قيم BC تلقائياً في PO
CREATE OR REPLACE FUNCTION update_po_bc_amounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  -- Get effective exchange rate
  v_rate := COALESCE(NEW.exchange_rate, 1);
  
  -- Update BC amounts based on FC amounts
  NEW.subtotal_bc := COALESCE(NEW.subtotal_fc, NEW.subtotal, 0) * v_rate;
  NEW.tax_amount_bc := COALESCE(NEW.tax_amount_fc, NEW.tax_amount, 0) * v_rate;
  NEW.total_amount_bc := COALESCE(NEW.total_amount_fc, NEW.total_amount, 0) * v_rate;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_po_bc_amounts ON purchase_orders;
CREATE TRIGGER trg_update_po_bc_amounts
  BEFORE INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_po_bc_amounts();

-- 6. إنشاء Trigger لتحديث قيم BC تلقائياً في PI
CREATE OR REPLACE FUNCTION update_pi_bc_amounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  -- Get effective exchange rate
  v_rate := COALESCE(NEW.exchange_rate, 1);
  
  -- Update BC amounts based on FC amounts
  NEW.subtotal_bc := COALESCE(NEW.subtotal_fc, NEW.subtotal, 0) * v_rate;
  NEW.discount_amount_bc := COALESCE(NEW.discount_amount_fc, NEW.discount_amount, 0) * v_rate;
  NEW.tax_amount_bc := COALESCE(NEW.tax_amount_fc, NEW.tax_amount, 0) * v_rate;
  NEW.total_amount_bc := COALESCE(NEW.total_amount_fc, NEW.total_amount, 0) * v_rate;
  NEW.paid_amount_bc := COALESCE(NEW.paid_amount_fc, NEW.paid_amount, 0) * v_rate;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_pi_bc_amounts ON purchase_invoices;
CREATE TRIGGER trg_update_pi_bc_amounts
  BEFORE INSERT OR UPDATE ON purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_pi_bc_amounts();

-- 7. إنشاء عرض لأحدث أسعار الصرف (إذا لم يكن موجوداً)
CREATE OR REPLACE VIEW vw_current_exchange_rates
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (from_currency, to_currency)
  id,
  from_currency,
  to_currency,
  rate,
  effective_date
FROM exchange_rates
ORDER BY from_currency, to_currency, effective_date DESC;