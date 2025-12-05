-- ============================================================================
-- MULTI-CURRENCY SYSTEM - PHASE 1: DATABASE INFRASTRUCTURE
-- Base Currency: YER (Yemen Rial)
-- ============================================================================

-- ============================================================================
-- 1. ENHANCE CURRENCIES TABLE
-- ============================================================================

-- Add is_base column to track base currency
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS is_base BOOLEAN DEFAULT false;

-- Create unique partial index to ensure only ONE base currency
DROP INDEX IF EXISTS idx_currencies_base;
CREATE UNIQUE INDEX idx_currencies_base ON currencies (is_base) WHERE is_base = true;

-- Set YER as the base currency
UPDATE currencies SET is_base = true WHERE code = 'YER';

-- If YER doesn't exist, insert it
INSERT INTO currencies (code, name, name_en, symbol, precision, is_active, is_base)
VALUES ('YER', 'ريال يمني', 'Yemeni Rial', 'ر.ي', 2, true, true)
ON CONFLICT (code) DO UPDATE SET is_base = true;

-- Deactivate duplicate YR entry (keep YER as standard)
UPDATE currencies SET is_active = false WHERE code = 'YR';

-- ============================================================================
-- 2. CREATE EXCHANGE_RATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    to_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    rate NUMERIC(18,8) NOT NULL CHECK (rate > 0),
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    
    CONSTRAINT exchange_rates_unique UNIQUE (from_currency, to_currency, effective_date),
    CONSTRAINT exchange_rates_different_currencies CHECK (from_currency <> to_currency)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup 
ON exchange_rates (from_currency, to_currency, effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_date 
ON exchange_rates (effective_date DESC);

-- Enable RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view exchange rates"
ON exchange_rates FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Admin can manage exchange rates"
ON exchange_rates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default exchange rates (SAR and USD to YER)
INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date, notes)
VALUES 
    ('SAR', 'YER', 66.50, CURRENT_DATE, 'سعر افتراضي - يرجى التحديث'),
    ('USD', 'YER', 250.00, CURRENT_DATE, 'سعر افتراضي - يرجى التحديث'),
    ('EUR', 'YER', 270.00, CURRENT_DATE, 'سعر افتراضي - يرجى التحديث')
ON CONFLICT (from_currency, to_currency, effective_date) DO NOTHING;

-- ============================================================================
-- 3. ENHANCE GL_JOURNAL_LINES FOR DUAL CURRENCY
-- ============================================================================

-- Add dual currency columns
ALTER TABLE gl_journal_lines 
    ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'YER',
    ADD COLUMN IF NOT EXISTS debit_fc NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS credit_fc NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS debit_bc NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS credit_bc NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,8) DEFAULT 1;

-- Migrate existing data: copy debit/credit to both FC and BC columns (assuming YER)
UPDATE gl_journal_lines 
SET 
    currency_code = 'YER',
    debit_fc = debit,
    credit_fc = credit,
    debit_bc = debit,
    credit_bc = credit,
    exchange_rate = 1
WHERE currency_code IS NULL OR debit_fc = 0;

-- ============================================================================
-- 4. CREATE FX GAIN/LOSS GL ACCOUNTS
-- ============================================================================

-- Currency Exchange Gains (Realized) - Revenue
INSERT INTO gl_accounts (account_code, account_name, account_name_en, account_type, is_active, is_header, currency, description)
VALUES ('4400', 'أرباح فروق العملة المحققة', 'Realized Currency Exchange Gains', 'revenue', true, false, 'YER', 'أرباح ناتجة عن فروقات أسعار الصرف عند تسوية المعاملات')
ON CONFLICT (account_code) DO NOTHING;

-- Currency Exchange Losses (Realized) - Expense
INSERT INTO gl_accounts (account_code, account_name, account_name_en, account_type, is_active, is_header, currency, description)
VALUES ('5400', 'خسائر فروق العملة المحققة', 'Realized Currency Exchange Losses', 'expense', true, false, 'YER', 'خسائر ناتجة عن فروقات أسعار الصرف عند تسوية المعاملات')
ON CONFLICT (account_code) DO NOTHING;

-- Unrealized FX Gains (for future month-end revaluation)
INSERT INTO gl_accounts (account_code, account_name, account_name_en, account_type, is_active, is_header, currency, description)
VALUES ('4401', 'أرباح فروق العملة غير المحققة', 'Unrealized Currency Exchange Gains', 'revenue', true, false, 'YER', 'أرباح فروق عملة غير محققة (تقييم نهاية الفترة)')
ON CONFLICT (account_code) DO NOTHING;

-- Unrealized FX Losses (for future month-end revaluation)
INSERT INTO gl_accounts (account_code, account_name, account_name_en, account_type, is_active, is_header, currency, description)
VALUES ('5401', 'خسائر فروق العملة غير المحققة', 'Unrealized Currency Exchange Losses', 'expense', true, false, 'YER', 'خسائر فروق عملة غير محققة (تقييم نهاية الفترة)')
ON CONFLICT (account_code) DO NOTHING;

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get exchange rate for a specific date
CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_from_currency VARCHAR,
    p_to_currency VARCHAR,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC AS $$
DECLARE
    v_rate NUMERIC(18,8);
BEGIN
    -- Same currency = 1.0
    IF p_from_currency = p_to_currency THEN
        RETURN 1.0;
    END IF;
    
    -- Direct rate lookup (from -> to)
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
    
    -- Try inverse rate (to -> from)
    SELECT 1.0 / rate INTO v_rate
    FROM exchange_rates
    WHERE from_currency = p_to_currency
      AND to_currency = p_from_currency
      AND effective_date <= p_date
    ORDER BY effective_date DESC
    LIMIT 1;
    
    IF v_rate IS NULL THEN
        RAISE EXCEPTION 'لا يوجد سعر صرف لـ %/% بتاريخ %', p_from_currency, p_to_currency, p_date;
    END IF;
    
    RETURN v_rate;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Function to calculate FX gain/loss
CREATE OR REPLACE FUNCTION calculate_fx_gain_loss(
    p_original_amount_fc NUMERIC,
    p_original_rate NUMERIC,
    p_settlement_amount_fc NUMERIC,
    p_settlement_rate NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    v_original_bc NUMERIC;
    v_settlement_bc NUMERIC;
BEGIN
    v_original_bc := p_original_amount_fc * p_original_rate;
    v_settlement_bc := p_settlement_amount_fc * p_settlement_rate;
    
    -- Positive = Gain, Negative = Loss
    RETURN v_settlement_bc - v_original_bc;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- Function to get base currency code
CREATE OR REPLACE FUNCTION get_base_currency()
RETURNS VARCHAR AS $$
BEGIN
    RETURN (SELECT code FROM currencies WHERE is_base = true LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Function to convert amount to base currency
CREATE OR REPLACE FUNCTION convert_to_base_currency(
    p_amount NUMERIC,
    p_from_currency VARCHAR,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC AS $$
DECLARE
    v_base_currency VARCHAR;
    v_rate NUMERIC;
BEGIN
    v_base_currency := get_base_currency();
    
    IF p_from_currency = v_base_currency THEN
        RETURN p_amount;
    END IF;
    
    v_rate := get_exchange_rate(p_from_currency, v_base_currency, p_date);
    RETURN p_amount * v_rate;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 6. UPDATE CASH_BOXES TABLE
-- ============================================================================

-- Ensure cash_boxes has currency_code (already exists based on schema)
-- Add constraint to ensure currency matches transactions
ALTER TABLE cash_boxes 
    DROP CONSTRAINT IF EXISTS cash_boxes_currency_check;

-- ============================================================================
-- 7. UPDATE CASH_TRANSACTIONS TABLE
-- ============================================================================

-- Add dual currency columns to cash_transactions
ALTER TABLE cash_transactions 
    ADD COLUMN IF NOT EXISTS amount_fc NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS amount_bc NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,8) DEFAULT 1;

-- Migrate existing data
UPDATE cash_transactions 
SET 
    amount_fc = amount,
    amount_bc = amount,
    exchange_rate = 1
WHERE amount_fc IS NULL;

-- ============================================================================
-- 8. CREATE VIEW FOR EXCHANGE RATES WITH LATEST
-- ============================================================================

CREATE OR REPLACE VIEW vw_latest_exchange_rates AS
SELECT DISTINCT ON (from_currency, to_currency)
    id,
    from_currency,
    to_currency,
    rate,
    effective_date,
    created_at
FROM exchange_rates
ORDER BY from_currency, to_currency, effective_date DESC;

-- ============================================================================
-- 9. ACCOUNT MAPPINGS FOR FX
-- ============================================================================

-- Add FX account mappings
INSERT INTO erp_account_mappings (module, operation, debit_account_id, credit_account_id, notes, is_active)
SELECT 'fx', 'realized_gain', NULL, ga.id, 'أرباح فروق العملة المحققة', true
FROM gl_accounts ga WHERE ga.account_code = '4400'
ON CONFLICT DO NOTHING;

INSERT INTO erp_account_mappings (module, operation, debit_account_id, credit_account_id, notes, is_active)
SELECT 'fx', 'realized_loss', ga.id, NULL, 'خسائر فروق العملة المحققة', true
FROM gl_accounts ga WHERE ga.account_code = '5400'
ON CONFLICT DO NOTHING;