-- Fix security warning: Set search_path for check_batch_expiry function
CREATE OR REPLACE FUNCTION public.check_batch_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_expired := (NEW.expiry_date < CURRENT_DATE);
  RETURN NEW;
END;
$$;