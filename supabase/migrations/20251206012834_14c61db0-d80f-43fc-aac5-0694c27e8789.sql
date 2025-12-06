-- Create company_branding table (singleton)
CREATE TABLE IF NOT EXISTS public.company_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT '',
  company_name_en TEXT,
  company_logo_url TEXT,
  company_email TEXT,
  company_phone TEXT,
  company_phone_2 TEXT,
  company_address TEXT,
  company_address_en TEXT,
  invoice_footer_note TEXT,
  invoice_footer_note_en TEXT,
  tax_number TEXT,
  commercial_register TEXT,
  website TEXT,
  theme_color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default row if not exists
INSERT INTO public.company_branding (id, company_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'اسم الشركة')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read, only admin can update
CREATE POLICY "Anyone can read company branding"
  ON public.company_branding
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admin can update company branding"
  ON public.company_branding
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_company_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_company_branding_updated_at
  BEFORE UPDATE ON public.company_branding
  FOR EACH ROW
  EXECUTE FUNCTION update_company_branding_updated_at();

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view company logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'company-logos');

CREATE POLICY "Admin can upload company logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin can update company logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin can delete company logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );