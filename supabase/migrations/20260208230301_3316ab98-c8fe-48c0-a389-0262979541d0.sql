-- ============================================================================
-- SECURITY FIX: Exchange Rate Validation for Multi-Currency Transactions
-- Prevents manipulation of exchange rates to cause financial loss or fraud
-- ============================================================================

-- 1. Add CHECK constraints to prevent obviously invalid exchange rates
-- First check if constraints exist, drop if they do (for idempotency)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_exchange_rate_bounds' AND conrelid = 'sales_invoices'::regclass) THEN
    ALTER TABLE sales_invoices DROP CONSTRAINT check_exchange_rate_bounds;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_exchange_rate_bounds' AND conrelid = 'purchase_invoices'::regclass) THEN
    ALTER TABLE purchase_invoices DROP CONSTRAINT check_exchange_rate_bounds;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_exchange_rate_bounds' AND conrelid = 'purchase_orders'::regclass) THEN
    ALTER TABLE purchase_orders DROP CONSTRAINT check_exchange_rate_bounds;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_exchange_rate_bounds' AND conrelid = 'cash_box_exchanges'::regclass) THEN
    ALTER TABLE cash_box_exchanges DROP CONSTRAINT check_exchange_rate_bounds;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_exchange_rate_bounds' AND conrelid = 'cash_transactions'::regclass) THEN
    ALTER TABLE cash_transactions DROP CONSTRAINT check_exchange_rate_bounds;
  END IF;
END $$;

-- Add constraints with reasonable bounds
ALTER TABLE sales_invoices
ADD CONSTRAINT check_exchange_rate_bounds
CHECK (exchange_rate IS NULL OR (exchange_rate > 0.0001 AND exchange_rate < 100000));

ALTER TABLE purchase_invoices
ADD CONSTRAINT check_exchange_rate_bounds
CHECK (exchange_rate IS NULL OR (exchange_rate > 0.0001 AND exchange_rate < 100000));

ALTER TABLE purchase_orders
ADD CONSTRAINT check_exchange_rate_bounds
CHECK (exchange_rate IS NULL OR (exchange_rate > 0.0001 AND exchange_rate < 100000));

ALTER TABLE cash_box_exchanges
ADD CONSTRAINT check_exchange_rate_bounds
CHECK (exchange_rate > 0.0001 AND exchange_rate < 100000);

ALTER TABLE cash_transactions
ADD CONSTRAINT check_exchange_rate_bounds
CHECK (exchange_rate IS NULL OR (exchange_rate > 0.0001 AND exchange_rate < 100000));


-- ============================================================================
-- 2. Create exchange rate validation function with tolerance checking
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_exchange_rate(
  p_from_currency TEXT,
  p_to_currency TEXT,
  p_rate NUMERIC,
  p_date DATE DEFAULT CURRENT_DATE,
  p_tolerance NUMERIC DEFAULT 0.20
) RETURNS BOOLEAN AS $$
DECLARE
  v_official_rate NUMERIC;
  v_is_base_currency BOOLEAN;
  v_tolerance_pct INT;
BEGIN
  v_tolerance_pct := (p_tolerance * 100)::INT;
  
  IF p_from_currency = p_to_currency THEN
    IF p_rate != 1 THEN
      RAISE EXCEPTION 'سعر الصرف يجب أن يكون 1 عند استخدام نفس العملة';
    END IF;
    RETURN true;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM currencies WHERE code = p_from_currency AND is_base = true
  ) INTO v_is_base_currency;
  
  IF v_is_base_currency THEN
    IF p_rate != 1 THEN
      RAISE EXCEPTION 'سعر الصرف من العملة الأساسية (YER) يجب أن يكون 1';
    END IF;
    RETURN true;
  END IF;
  
  SELECT rate INTO v_official_rate
  FROM exchange_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;
  
  IF v_official_rate IS NULL THEN
    SELECT 1.0 / rate INTO v_official_rate
    FROM exchange_rates
    WHERE from_currency = p_to_currency
      AND to_currency = p_from_currency
      AND effective_date <= p_date
    ORDER BY effective_date DESC
    LIMIT 1;
  END IF;
  
  IF v_official_rate IS NULL THEN
    RAISE EXCEPTION 'لا يوجد سعر صرف رسمي لـ % / % في التاريخ %', p_from_currency, p_to_currency, p_date;
  END IF;
  
  IF p_rate < v_official_rate * (1 - p_tolerance) OR
     p_rate > v_official_rate * (1 + p_tolerance) THEN
    RAISE EXCEPTION 'سعر الصرف % خارج النطاق المسموح. السعر الرسمي: %', p_rate, ROUND(v_official_rate, 4);
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

COMMENT ON FUNCTION validate_exchange_rate IS 
'Validates exchange rate against official rates with configurable tolerance.';


-- ============================================================================
-- 3. Create trigger function for validating exchange rates on sales invoices
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_validate_invoice_exchange_rate()
RETURNS TRIGGER AS $$
DECLARE
  v_base_currency TEXT;
BEGIN
  SELECT code INTO v_base_currency FROM currencies WHERE is_base = true LIMIT 1;
  IF v_base_currency IS NULL THEN
    v_base_currency := 'YER';
  END IF;
  
  IF NEW.currency_code = v_base_currency OR NEW.currency_code IS NULL THEN
    IF NEW.exchange_rate IS NOT NULL AND NEW.exchange_rate != 1 THEN
      RAISE EXCEPTION 'سعر الصرف للعملة الأساسية يجب أن يكون 1';
    END IF;
    RETURN NEW;
  END IF;
  
  IF NEW.exchange_rate IS NULL OR NEW.exchange_rate <= 0 THEN
    RAISE EXCEPTION 'يجب تحديد سعر صرف صالح للعملة الأجنبية %', NEW.currency_code;
  END IF;
  
  PERFORM validate_exchange_rate(
    NEW.currency_code,
    v_base_currency,
    NEW.exchange_rate,
    COALESCE(NEW.invoice_date, CURRENT_DATE),
    0.20
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_sales_invoice_exchange_rate ON sales_invoices;
CREATE TRIGGER trg_validate_sales_invoice_exchange_rate
BEFORE INSERT OR UPDATE OF exchange_rate, currency_code ON sales_invoices
FOR EACH ROW
WHEN (NEW.currency_code IS NOT NULL AND NEW.currency_code != 'YER')
EXECUTE FUNCTION trg_validate_invoice_exchange_rate();


-- ============================================================================
-- 4. Create trigger for purchase invoices
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_validate_purchase_invoice_exchange_rate()
RETURNS TRIGGER AS $$
DECLARE
  v_base_currency TEXT;
BEGIN
  SELECT code INTO v_base_currency FROM currencies WHERE is_base = true LIMIT 1;
  IF v_base_currency IS NULL THEN
    v_base_currency := 'YER';
  END IF;
  
  IF NEW.currency_code = v_base_currency OR NEW.currency_code IS NULL THEN
    IF NEW.exchange_rate IS NOT NULL AND NEW.exchange_rate != 1 THEN
      RAISE EXCEPTION 'سعر الصرف للعملة الأساسية يجب أن يكون 1';
    END IF;
    RETURN NEW;
  END IF;
  
  IF NEW.exchange_rate IS NULL OR NEW.exchange_rate <= 0 THEN
    RAISE EXCEPTION 'يجب تحديد سعر صرف صالح للعملة الأجنبية %', NEW.currency_code;
  END IF;
  
  PERFORM validate_exchange_rate(
    NEW.currency_code,
    v_base_currency,
    NEW.exchange_rate,
    COALESCE(NEW.invoice_date, CURRENT_DATE),
    0.20
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_purchase_invoice_exchange_rate ON purchase_invoices;
CREATE TRIGGER trg_validate_purchase_invoice_exchange_rate
BEFORE INSERT OR UPDATE OF exchange_rate, currency_code ON purchase_invoices
FOR EACH ROW
WHEN (NEW.currency_code IS NOT NULL AND NEW.currency_code != 'YER')
EXECUTE FUNCTION trg_validate_purchase_invoice_exchange_rate();


-- ============================================================================
-- 5. Create trigger for purchase orders
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_validate_purchase_order_exchange_rate()
RETURNS TRIGGER AS $$
DECLARE
  v_base_currency TEXT;
BEGIN
  SELECT code INTO v_base_currency FROM currencies WHERE is_base = true LIMIT 1;
  IF v_base_currency IS NULL THEN
    v_base_currency := 'YER';
  END IF;
  
  IF NEW.currency_code = v_base_currency OR NEW.currency_code IS NULL THEN
    IF NEW.exchange_rate IS NOT NULL AND NEW.exchange_rate != 1 THEN
      RAISE EXCEPTION 'سعر الصرف للعملة الأساسية يجب أن يكون 1';
    END IF;
    RETURN NEW;
  END IF;
  
  IF NEW.exchange_rate IS NULL OR NEW.exchange_rate <= 0 THEN
    RAISE EXCEPTION 'يجب تحديد سعر صرف صالح للعملة الأجنبية %', NEW.currency_code;
  END IF;
  
  PERFORM validate_exchange_rate(
    NEW.currency_code,
    v_base_currency,
    NEW.exchange_rate,
    COALESCE(NEW.order_date, CURRENT_DATE),
    0.20
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_purchase_order_exchange_rate ON purchase_orders;
CREATE TRIGGER trg_validate_purchase_order_exchange_rate
BEFORE INSERT OR UPDATE OF exchange_rate, currency_code ON purchase_orders
FOR EACH ROW
WHEN (NEW.currency_code IS NOT NULL AND NEW.currency_code != 'YER')
EXECUTE FUNCTION trg_validate_purchase_order_exchange_rate();


-- ============================================================================
-- 6. Create audit trigger for exchange rate changes
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_audit_exchange_rate_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, operation, new_data, changed_by, changed_at)
    VALUES (
      'exchange_rates', NEW.id, 'INSERT',
      jsonb_build_object('from_currency', NEW.from_currency, 'to_currency', NEW.to_currency, 'rate', NEW.rate, 'effective_date', NEW.effective_date),
      auth.uid(), NOW()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.rate != NEW.rate THEN
      INSERT INTO audit_log (table_name, record_id, operation, old_data, new_data, changed_by, changed_at)
      VALUES (
        'exchange_rates', NEW.id, 'UPDATE',
        jsonb_build_object('from_currency', OLD.from_currency, 'to_currency', OLD.to_currency, 'rate', OLD.rate, 'effective_date', OLD.effective_date),
        jsonb_build_object('from_currency', NEW.from_currency, 'to_currency', NEW.to_currency, 'rate', NEW.rate, 'effective_date', NEW.effective_date),
        auth.uid(), NOW()
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, operation, old_data, changed_by, changed_at)
    VALUES (
      'exchange_rates', OLD.id, 'DELETE',
      jsonb_build_object('from_currency', OLD.from_currency, 'to_currency', OLD.to_currency, 'rate', OLD.rate, 'effective_date', OLD.effective_date),
      auth.uid(), NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_audit_exchange_rates ON exchange_rates;
CREATE TRIGGER trg_audit_exchange_rates
AFTER INSERT OR UPDATE OR DELETE ON exchange_rates
FOR EACH ROW
EXECUTE FUNCTION trg_audit_exchange_rate_changes();


-- ============================================================================
-- 7. Add helper function for frontend rate deviation warnings
-- ============================================================================

CREATE OR REPLACE FUNCTION get_rate_deviation_warning(
  p_from_currency TEXT,
  p_to_currency TEXT,
  p_rate NUMERIC,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  has_warning BOOLEAN,
  warning_message TEXT,
  official_rate NUMERIC,
  deviation_percentage NUMERIC
) AS $$
DECLARE
  v_official_rate NUMERIC;
  v_deviation NUMERIC;
BEGIN
  SELECT rate INTO v_official_rate
  FROM exchange_rates
  WHERE from_currency = p_from_currency AND to_currency = p_to_currency AND effective_date <= p_date
  ORDER BY effective_date DESC LIMIT 1;
  
  IF v_official_rate IS NULL THEN
    SELECT 1.0 / rate INTO v_official_rate
    FROM exchange_rates
    WHERE from_currency = p_to_currency AND to_currency = p_from_currency AND effective_date <= p_date
    ORDER BY effective_date DESC LIMIT 1;
  END IF;
  
  IF v_official_rate IS NULL THEN
    RETURN QUERY SELECT true, 'لا يوجد سعر صرف رسمي مسجل'::TEXT, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;
  
  v_deviation := ((p_rate - v_official_rate) / v_official_rate) * 100;
  
  IF ABS(v_deviation) > 10 THEN
    RETURN QUERY SELECT true, 
      'تحذير: السعر يختلف بنسبة ' || ROUND(v_deviation, 2) || '% عن السعر الرسمي (' || ROUND(v_official_rate, 4) || ')',
      v_official_rate, ROUND(v_deviation, 2);
  ELSE
    RETURN QUERY SELECT false, NULL::TEXT, v_official_rate, ROUND(v_deviation, 2);
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

GRANT EXECUTE ON FUNCTION validate_exchange_rate TO authenticated;
GRANT EXECUTE ON FUNCTION get_rate_deviation_warning TO authenticated;