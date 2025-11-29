-- ================================================
-- Chart of Accounts: Role-Based Access Control
-- ================================================
-- This migration implements RLS policies for gl_accounts
-- using the existing user_roles system.
--
-- Role mapping:
--   - admin: Full CRUD access
--   - inventory_manager: Full CRUD access  
--   - pharmacist: View-only access
--   - cashier: View-only access
-- ================================================

-- Drop existing policies on gl_accounts (if any)
DROP POLICY IF EXISTS "gl_accounts_select_authenticated" ON gl_accounts;
DROP POLICY IF EXISTS "gl_accounts_insert_by_role" ON gl_accounts;
DROP POLICY IF EXISTS "gl_accounts_update_by_role" ON gl_accounts;
DROP POLICY IF EXISTS "gl_accounts_delete_by_role" ON gl_accounts;

-- Ensure RLS is enabled
ALTER TABLE gl_accounts ENABLE ROW LEVEL SECURITY;

-- ================================================
-- SELECT Policy: All authenticated users can view
-- ================================================
CREATE POLICY "gl_accounts_select_authenticated"
  ON gl_accounts
  FOR SELECT
  TO authenticated
  USING (true);

-- ================================================
-- INSERT Policy: Only admin and inventory_manager
-- ================================================
CREATE POLICY "gl_accounts_insert_authorized"
  ON gl_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role])
  );

-- ================================================
-- UPDATE Policy: Only admin and inventory_manager
-- ================================================
CREATE POLICY "gl_accounts_update_authorized"
  ON gl_accounts
  FOR UPDATE
  TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role])
  )
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role])
  );

-- ================================================
-- DELETE Policy: Only admin and inventory_manager
-- ================================================
-- Note: We use soft delete (is_active = false) in the app,
-- but this prevents hard deletes at the database level
CREATE POLICY "gl_accounts_delete_authorized"
  ON gl_accounts
  FOR DELETE
  TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role])
  );

-- ================================================
-- Comments for documentation
-- ================================================
COMMENT ON POLICY "gl_accounts_select_authenticated" ON gl_accounts IS 
  'All authenticated users can view GL accounts';

COMMENT ON POLICY "gl_accounts_insert_authorized" ON gl_accounts IS 
  'Only admin and inventory_manager can create GL accounts';

COMMENT ON POLICY "gl_accounts_update_authorized" ON gl_accounts IS 
  'Only admin and inventory_manager can update GL accounts';

COMMENT ON POLICY "gl_accounts_delete_authorized" ON gl_accounts IS 
  'Only admin and inventory_manager can delete GL accounts';
