-- ============================================================
-- SECURITY FIX: Currency Validation (Error-Level Issues)
-- 1. currency_client_validation - Server-side currency validation
-- 2. currency_amount_validation - FC/BC amount consistency
-- ============================================================

-- ==============================================
-- FUNCTION: Validate and recalculate currency amounts
-- Ensures BC = FC * exchange_rate with tolerance
-- ==============================================
CREATE OR REPLACE FUNCTION validate_currency_amounts()
RETURNS TRIGGER AS $$
DECLARE
  v_tolerance NUMERIC := 0.01;
  v_expected_bc NUMERIC;
  v_base_currency TEXT := 'YER';
BEGIN
  -- For base currency, exchange_rate must be 1 and FC = BC
  IF NEW.currency_code = v_base_currency THEN
    NEW.exchange_rate := 1;
    NEW.subtotal_bc := NEW.subtotal_fc;
    NEW.discount_amount_bc := NEW.discount_amount_fc;
    NEW.tax_amount_bc := NEW.tax_amount_fc;
    NEW.total_amount_bc := NEW.total_amount_fc;
    NEW.paid_amount_bc := NEW.paid_amount_fc;
  ELSE
    -- For foreign currency, validate exchange_rate > 0
    IF NEW.exchange_rate IS NULL OR NEW.exchange_rate <= 0 THEN
      RAISE EXCEPTION 'سعر الصرف غير صالح - يجب أن يكون أكبر من صفر';
    END IF;
    
    -- Recalculate BC amounts from FC amounts using exchange_rate
    NEW.subtotal_bc := ROUND(NEW.subtotal_fc * NEW.exchange_rate, 2);
    NEW.discount_amount_bc := ROUND(NEW.discount_amount_fc * NEW.exchange_rate, 2);
    NEW.tax_amount_bc := ROUND(NEW.tax_amount_fc * NEW.exchange_rate, 2);
    NEW.total_amount_bc := ROUND(NEW.total_amount_fc * NEW.exchange_rate, 2);
    NEW.paid_amount_bc := ROUND(NEW.paid_amount_fc * NEW.exchange_rate, 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==============================================
-- FUNCTION: Validate currency code is active
-- ==============================================
CREATE OR REPLACE FUNCTION validate_currency_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if currency code exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM currencies 
    WHERE code = NEW.currency_code 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'العملة غير صالحة أو غير نشطة: %', NEW.currency_code;
  END IF;
  
  -- For non-base currency, validate exchange rate exists
  IF NEW.currency_code != 'YER' THEN
    IF NOT EXISTS (
      SELECT 1 FROM exchange_rates 
      WHERE (
        (from_currency = NEW.currency_code AND to_currency = 'YER') OR
        (from_currency = 'YER' AND to_currency = NEW.currency_code)
      )
      AND effective_date <= COALESCE(NEW.invoice_date, CURRENT_DATE)
    ) THEN
      RAISE EXCEPTION 'سعر الصرف غير متوفر للعملة: %', NEW.currency_code;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==============================================
-- FUNCTION: Validate purchase order currency
-- ==============================================
CREATE OR REPLACE FUNCTION validate_po_currency()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if currency code exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM currencies 
    WHERE code = NEW.currency_code 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'العملة غير صالحة أو غير نشطة: %', NEW.currency_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==============================================
-- FUNCTION: Validate purchase order currency amounts
-- ==============================================
CREATE OR REPLACE FUNCTION validate_po_currency_amounts()
RETURNS TRIGGER AS $$
DECLARE
  v_base_currency TEXT := 'YER';
BEGIN
  -- For base currency, exchange_rate must be 1 and FC = BC
  IF NEW.currency_code = v_base_currency THEN
    NEW.exchange_rate := 1;
    NEW.subtotal_bc := NEW.subtotal_fc;
    NEW.tax_amount_bc := NEW.tax_amount_fc;
    NEW.total_amount_bc := NEW.total_amount_fc;
  ELSE
    -- For foreign currency, validate exchange_rate > 0
    IF NEW.exchange_rate IS NULL OR NEW.exchange_rate <= 0 THEN
      RAISE EXCEPTION 'سعر الصرف غير صالح - يجب أن يكون أكبر من صفر';
    END IF;
    
    -- Recalculate BC amounts from FC amounts using exchange_rate
    NEW.subtotal_bc := ROUND(NEW.subtotal_fc * NEW.exchange_rate, 2);
    NEW.tax_amount_bc := ROUND(NEW.tax_amount_fc * NEW.exchange_rate, 2);
    NEW.total_amount_bc := ROUND(NEW.total_amount_fc * NEW.exchange_rate, 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==============================================
-- TRIGGERS for sales_invoices
-- ==============================================
DROP TRIGGER IF EXISTS validate_sales_invoice_currency ON sales_invoices;
CREATE TRIGGER validate_sales_invoice_currency
  BEFORE INSERT OR UPDATE ON sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_currency_code();

DROP TRIGGER IF EXISTS validate_sales_invoice_amounts ON sales_invoices;
CREATE TRIGGER validate_sales_invoice_amounts
  BEFORE INSERT OR UPDATE ON sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_currency_amounts();

-- ==============================================
-- TRIGGERS for purchase_orders
-- ==============================================
DROP TRIGGER IF EXISTS validate_po_currency_trigger ON purchase_orders;
CREATE TRIGGER validate_po_currency_trigger
  BEFORE INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_po_currency();

DROP TRIGGER IF EXISTS validate_po_amounts_trigger ON purchase_orders;
CREATE TRIGGER validate_po_amounts_trigger
  BEFORE INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_po_currency_amounts();

-- ==============================================
-- FUNCTION: Validate purchase invoice currency amounts
-- ==============================================
CREATE OR REPLACE FUNCTION validate_purchase_invoice_currency_amounts()
RETURNS TRIGGER AS $$
DECLARE
  v_base_currency TEXT := 'YER';
BEGIN
  -- For base currency, exchange_rate must be 1 and FC = BC
  IF NEW.currency_code = v_base_currency THEN
    NEW.exchange_rate := 1;
    NEW.subtotal_bc := NEW.subtotal_fc;
    NEW.discount_amount_bc := NEW.discount_amount_fc;
    NEW.tax_amount_bc := NEW.tax_amount_fc;
    NEW.total_amount_bc := NEW.total_amount_fc;
    NEW.paid_amount_bc := NEW.paid_amount_fc;
  ELSE
    -- For foreign currency, validate exchange_rate > 0
    IF NEW.exchange_rate IS NULL OR NEW.exchange_rate <= 0 THEN
      RAISE EXCEPTION 'سعر الصرف غير صالح - يجب أن يكون أكبر من صفر';
    END IF;
    
    -- Recalculate BC amounts from FC amounts using exchange_rate
    NEW.subtotal_bc := ROUND(NEW.subtotal_fc * NEW.exchange_rate, 2);
    NEW.discount_amount_bc := ROUND(NEW.discount_amount_fc * NEW.exchange_rate, 2);
    NEW.tax_amount_bc := ROUND(NEW.tax_amount_fc * NEW.exchange_rate, 2);
    NEW.total_amount_bc := ROUND(NEW.total_amount_fc * NEW.exchange_rate, 2);
    NEW.paid_amount_bc := ROUND(NEW.paid_amount_fc * NEW.exchange_rate, 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==============================================
-- TRIGGERS for purchase_invoices
-- ==============================================
DROP TRIGGER IF EXISTS validate_pi_currency_trigger ON purchase_invoices;
CREATE TRIGGER validate_pi_currency_trigger
  BEFORE INSERT OR UPDATE ON purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_currency_code();

DROP TRIGGER IF EXISTS validate_pi_amounts_trigger ON purchase_invoices;
CREATE TRIGGER validate_pi_amounts_trigger
  BEFORE INSERT OR UPDATE ON purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_purchase_invoice_currency_amounts();

-- ==============================================
-- FUNCTION: Validate cash transaction currency amounts
-- ==============================================
CREATE OR REPLACE FUNCTION validate_cash_transaction_currency()
RETURNS TRIGGER AS $$
DECLARE
  v_cash_box_currency TEXT;
  v_base_currency TEXT := 'YER';
BEGIN
  -- Get the cash box currency
  SELECT currency_code INTO v_cash_box_currency
  FROM cash_boxes
  WHERE id = NEW.cash_box_id;
  
  -- Validate transaction currency matches cash box currency
  IF NEW.currency_code IS NOT NULL AND NEW.currency_code != v_cash_box_currency THEN
    RAISE EXCEPTION 'لا يمكن الدفع بهذه العملة - الصندوق مرتبط بعملة مختلفة (%)' , v_cash_box_currency;
  END IF;
  
  -- Set currency code from cash box if not provided
  IF NEW.currency_code IS NULL THEN
    NEW.currency_code := v_cash_box_currency;
  END IF;
  
  -- For base currency, FC = BC
  IF NEW.currency_code = v_base_currency THEN
    NEW.exchange_rate := 1;
    NEW.amount_bc := NEW.amount_fc;
  ELSE
    -- Recalculate BC from FC
    IF NEW.exchange_rate IS NOT NULL AND NEW.exchange_rate > 0 THEN
      NEW.amount_bc := ROUND(NEW.amount_fc * NEW.exchange_rate, 2);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==============================================
-- TRIGGER for cash_transactions
-- ==============================================
DROP TRIGGER IF EXISTS validate_cash_transaction_currency_trigger ON cash_transactions;
CREATE TRIGGER validate_cash_transaction_currency_trigger
  BEFORE INSERT OR UPDATE ON cash_transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_cash_transaction_currency();

-- ==============================================
-- Add exchange_rate constraint (must be positive)
-- ==============================================
DO $$
BEGIN
  -- Add constraint to sales_invoices if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_invoices_exchange_rate_positive'
  ) THEN
    ALTER TABLE sales_invoices 
    ADD CONSTRAINT sales_invoices_exchange_rate_positive 
    CHECK (exchange_rate > 0);
  END IF;
  
  -- Add constraint to purchase_invoices if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_invoices_exchange_rate_positive'
  ) THEN
    ALTER TABLE purchase_invoices 
    ADD CONSTRAINT purchase_invoices_exchange_rate_positive 
    CHECK (exchange_rate > 0);
  END IF;
  
  -- Add constraint to purchase_orders if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_exchange_rate_positive'
  ) THEN
    ALTER TABLE purchase_orders 
    ADD CONSTRAINT purchase_orders_exchange_rate_positive 
    CHECK (exchange_rate > 0);
  END IF;
END $$;

-- ==============================================
-- Add audit logging for currency changes
-- ==============================================
CREATE OR REPLACE FUNCTION log_currency_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when currency_code or exchange_rate changes
  IF TG_OP = 'UPDATE' THEN
    IF OLD.currency_code IS DISTINCT FROM NEW.currency_code OR 
       OLD.exchange_rate IS DISTINCT FROM NEW.exchange_rate THEN
      INSERT INTO security_audit_log (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_by,
        changed_at
      ) VALUES (
        TG_TABLE_NAME,
        NEW.id::text,
        'CURRENCY_CHANGE',
        jsonb_build_object(
          'currency_code', OLD.currency_code,
          'exchange_rate', OLD.exchange_rate,
          'total_amount_fc', OLD.total_amount_fc,
          'total_amount_bc', OLD.total_amount_bc
        ),
        jsonb_build_object(
          'currency_code', NEW.currency_code,
          'exchange_rate', NEW.exchange_rate,
          'total_amount_fc', NEW.total_amount_fc,
          'total_amount_bc', NEW.total_amount_bc
        ),
        auth.uid(),
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create audit triggers for currency changes
DROP TRIGGER IF EXISTS audit_sales_invoice_currency ON sales_invoices;
CREATE TRIGGER audit_sales_invoice_currency
  AFTER UPDATE ON sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_currency_change();

DROP TRIGGER IF EXISTS audit_purchase_invoice_currency ON purchase_invoices;
CREATE TRIGGER audit_purchase_invoice_currency
  AFTER UPDATE ON purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_currency_change();