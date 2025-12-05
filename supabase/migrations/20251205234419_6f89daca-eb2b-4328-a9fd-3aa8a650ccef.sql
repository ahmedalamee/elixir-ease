-- Fix SECURITY DEFINER view issue
DROP VIEW IF EXISTS vw_latest_exchange_rates;

CREATE VIEW vw_latest_exchange_rates 
WITH (security_invoker = true) AS
SELECT DISTINCT ON (from_currency, to_currency)
    id,
    from_currency,
    to_currency,
    rate,
    effective_date,
    created_at
FROM exchange_rates
ORDER BY from_currency, to_currency, effective_date DESC;