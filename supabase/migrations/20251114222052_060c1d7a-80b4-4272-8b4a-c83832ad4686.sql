-- إصلاح جميع الدوال الأخرى بإضافة search_path

-- إصلاح دالة update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- إصلاح دالة has_permission
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_custom_roles ucr
    JOIN role_permissions rp ON ucr.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ucr.user_id = $1
      AND p.permission_key = $2
      AND p.is_active = true
  );
END;
$$;