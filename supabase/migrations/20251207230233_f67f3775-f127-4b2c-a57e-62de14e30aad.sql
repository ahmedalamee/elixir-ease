-- Fix Security Definer View issue for public_company_info
-- Recreate view with SECURITY INVOKER to use querying user's permissions

DROP VIEW IF EXISTS public.public_company_info;

CREATE VIEW public.public_company_info
WITH (security_invoker = true)
AS
SELECT 
  company_name,
  company_name_en,
  company_logo_url,
  theme_color
FROM company_branding
LIMIT 1;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.public_company_info TO authenticated;
GRANT SELECT ON public.public_company_info TO anon;