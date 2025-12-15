
-- =====================================================
-- FIX VIEW COLUMN TYPE ISSUE
-- =====================================================

-- Drop and recreate the view with proper type casting
DROP VIEW IF EXISTS safe_suppliers_summary;

CREATE VIEW safe_suppliers_summary
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  code,
  CASE 
    WHEN has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]) THEN phone
    ELSE NULL::text
  END AS phone,
  CASE 
    WHEN has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]) THEN email
    ELSE NULL::text
  END AS email,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN balance
    ELSE NULL::numeric(10,2)
  END AS balance,
  currency_code,
  is_active
FROM suppliers
WHERE auth.uid() IS NOT NULL
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]);

-- Grant access to authenticated only
REVOKE ALL ON safe_suppliers_summary FROM anon, public;
GRANT SELECT ON safe_suppliers_summary TO authenticated;
