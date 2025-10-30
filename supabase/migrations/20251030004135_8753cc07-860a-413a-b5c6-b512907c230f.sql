-- ============================================
-- Security Enhancement Migration
-- Adding server-side role validation and RLS improvements
-- ============================================

-- 1. Create server-side role validation function for admin actions
CREATE OR REPLACE FUNCTION public.validate_admin_action()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  RETURN TRUE;
END;
$$;

-- 2. Create function to validate any role requirement
CREATE OR REPLACE FUNCTION public.validate_role_action(required_roles app_role[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_any_role(auth.uid(), required_roles) THEN
    RAISE EXCEPTION 'Unauthorized: Insufficient permissions';
  END IF;
  RETURN TRUE;
END;
$$;

-- 3. Add stricter RLS policies for critical operations

-- Categories: Only admin and inventory_manager can delete
DROP POLICY IF EXISTS "Admin and inventory manager manage categories" ON categories;

CREATE POLICY "Admin and inventory manager insert/update categories"
  ON categories FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Only admin can delete categories"
  ON categories FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Suppliers: Only admin can delete
DROP POLICY IF EXISTS "Admin and inventory manager manage suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admin and pharmacist full access to suppliers" ON suppliers;

CREATE POLICY "Admin and pharmacist manage suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Admin and pharmacist update suppliers"
  ON suppliers FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Only admin can delete suppliers"
  ON suppliers FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Warehouses: Only admin can delete
DROP POLICY IF EXISTS "Admin and inventory manager manage warehouses" ON warehouses;

CREATE POLICY "Admin and inventory manager insert/update warehouses"
  ON warehouses FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Only admin can delete warehouses"
  ON warehouses FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Products: Only admin can delete
DROP POLICY IF EXISTS "Admin and inventory manager manage products" ON products;

CREATE POLICY "Admin and inventory manager manage products insert/update"
  ON products FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Only admin can delete products"
  ON products FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Customers: Only admin and pharmacist can delete
DROP POLICY IF EXISTS "Admin and pharmacist full access to customers" ON customers;

CREATE POLICY "Admin and pharmacist manage customers"
  ON customers FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Admin and pharmacist update customers"
  ON customers FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Only admin can delete customers"
  ON customers FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Add audit logging trigger function for sensitive operations
CREATE OR REPLACE FUNCTION public.audit_sensitive_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log deletion of sensitive records
  IF (TG_OP = 'DELETE') THEN
    RAISE LOG 'User % deleted % record with id %', 
      auth.uid(), TG_TABLE_NAME, OLD.id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_employee_delete ON employees;
CREATE TRIGGER audit_employee_delete
  BEFORE DELETE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION audit_sensitive_operation();

DROP TRIGGER IF EXISTS audit_supplier_delete ON suppliers;
CREATE TRIGGER audit_supplier_delete
  BEFORE DELETE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION audit_sensitive_operation();

DROP TRIGGER IF EXISTS audit_customer_delete ON customers;
CREATE TRIGGER audit_customer_delete
  BEFORE DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION audit_sensitive_operation();

-- 6. Add comments for documentation
COMMENT ON FUNCTION validate_admin_action() IS 'Server-side validation that current user has admin role. Raises exception if not.';
COMMENT ON FUNCTION validate_role_action(app_role[]) IS 'Server-side validation that current user has one of the required roles. Raises exception if not.';
COMMENT ON FUNCTION audit_sensitive_operation() IS 'Audit logging for sensitive DELETE operations on critical tables.';