-- إصلاح آخر دالة بدون search_path
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;