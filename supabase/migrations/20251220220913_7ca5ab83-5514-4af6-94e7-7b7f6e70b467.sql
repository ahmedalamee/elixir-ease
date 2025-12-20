-- Fix function without search_path
CREATE OR REPLACE FUNCTION public.update_pr_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;