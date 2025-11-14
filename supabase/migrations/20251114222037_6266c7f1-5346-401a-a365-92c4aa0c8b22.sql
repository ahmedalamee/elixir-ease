-- إصلاح مشكلة search_path في الدوال لتحسين الأمان

-- إصلاح دالة ensure_single_default_warehouse
CREATE OR REPLACE FUNCTION ensure_single_default_warehouse()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- إلغاء الافتراضي من جميع المخازن الأخرى
    UPDATE warehouses 
    SET is_default = false 
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;