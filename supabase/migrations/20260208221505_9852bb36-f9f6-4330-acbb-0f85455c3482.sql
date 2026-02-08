
-- Fix audit function to use valid operation values
CREATE OR REPLACE FUNCTION public.audit_product_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    INSERT INTO audit_log (
      table_name,
      record_id,
      operation,
      old_data,
      new_data,
      changed_by,
      changed_at
    ) VALUES (
      'products',
      NEW.id::text,
      'UPDATE',
      jsonb_build_object(
        'is_active', OLD.is_active,
        'name', OLD.name,
        'action', CASE WHEN OLD.is_active THEN 'was_active' ELSE 'was_disabled' END
      ),
      jsonb_build_object(
        'is_active', NEW.is_active,
        'name', NEW.name,
        'action', CASE WHEN NEW.is_active THEN 'PRODUCT_ENABLED' ELSE 'PRODUCT_DISABLED' END
      ),
      auth.uid(),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
