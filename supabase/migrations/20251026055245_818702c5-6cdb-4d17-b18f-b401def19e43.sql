-- Create doctors table
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  full_name_en TEXT,
  specialization TEXT NOT NULL,
  license_number TEXT NOT NULL UNIQUE,
  phone TEXT,
  email TEXT,
  hospital_clinic TEXT,
  employee_id UUID REFERENCES public.employees(id),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create customer_health_records table
CREATE TABLE IF NOT EXISTS public.customer_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  blood_type TEXT,
  allergies TEXT[],
  chronic_diseases TEXT[],
  current_medications TEXT[],
  medical_history TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(customer_id)
);

-- Create prescriptions table
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_number TEXT NOT NULL UNIQUE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
  diagnosis TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  dispensed_at TIMESTAMP WITH TIME ZONE,
  dispensed_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create prescription_items table
CREATE TABLE IF NOT EXISTS public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  quantity NUMERIC NOT NULL,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create medication_history table
CREATE TABLE IF NOT EXISTS public.medication_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  prescription_id UUID REFERENCES public.prescriptions(id),
  start_date DATE NOT NULL,
  end_date DATE,
  dosage TEXT NOT NULL,
  frequency TEXT,
  reason TEXT,
  side_effects TEXT,
  effectiveness TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create drug_interactions table
CREATE TABLE IF NOT EXISTS public.drug_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug1_id UUID NOT NULL REFERENCES public.products(id),
  drug2_id UUID NOT NULL REFERENCES public.products(id),
  interaction_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  clinical_effects TEXT,
  management TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CHECK (drug1_id <> drug2_id)
);

-- Create drug_warnings table
CREATE TABLE IF NOT EXISTS public.drug_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  warning_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  precautions TEXT,
  contraindications TEXT,
  target_population TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create vaccinations table
CREATE TABLE IF NOT EXISTS public.vaccinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  vaccine_type TEXT,
  vaccination_date DATE NOT NULL,
  next_dose_date DATE,
  dose_number INTEGER,
  batch_number TEXT,
  administered_by UUID REFERENCES auth.users(id),
  site_of_injection TEXT,
  adverse_reactions TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create lab_tests table
CREATE TABLE IF NOT EXISTS public.lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_type TEXT,
  test_date DATE NOT NULL,
  ordered_by UUID REFERENCES public.doctors(id),
  results TEXT,
  reference_range TEXT,
  interpretation TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create dosage_guidelines table
CREATE TABLE IF NOT EXISTS public.dosage_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  age_group TEXT NOT NULL,
  min_age INTEGER,
  max_age INTEGER,
  weight_range TEXT,
  min_dose NUMERIC NOT NULL,
  max_dose NUMERIC NOT NULL,
  recommended_dose NUMERIC,
  frequency TEXT NOT NULL,
  route TEXT,
  special_instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dosage_guidelines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for doctors (Admin and Pharmacist)
CREATE POLICY "Admin and pharmacist manage doctors" ON public.doctors
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "All staff read doctors" ON public.doctors
  FOR SELECT TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role])
  );

-- RLS Policies for customer_health_records (Strict access)
CREATE POLICY "Admin and pharmacist manage health records" ON public.customer_health_records
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

-- RLS Policies for prescriptions
CREATE POLICY "Admin and pharmacist manage prescriptions" ON public.prescriptions
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "Cashier read prescriptions" ON public.prescriptions
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'cashier'::app_role)
  );

-- RLS Policies for prescription_items
CREATE POLICY "Admin and pharmacist manage prescription items" ON public.prescription_items
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "Cashier read prescription items" ON public.prescription_items
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'cashier'::app_role)
  );

-- RLS Policies for medication_history
CREATE POLICY "Admin and pharmacist manage medication history" ON public.medication_history
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

-- RLS Policies for drug_interactions
CREATE POLICY "Admin and pharmacist manage drug interactions" ON public.drug_interactions
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "All staff read drug interactions" ON public.drug_interactions
  FOR SELECT TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role])
  );

-- RLS Policies for drug_warnings
CREATE POLICY "Admin and pharmacist manage drug warnings" ON public.drug_warnings
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "All staff read drug warnings" ON public.drug_warnings
  FOR SELECT TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role])
  );

-- RLS Policies for vaccinations
CREATE POLICY "Admin and pharmacist manage vaccinations" ON public.vaccinations
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

-- RLS Policies for lab_tests
CREATE POLICY "Admin and pharmacist manage lab tests" ON public.lab_tests
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

-- RLS Policies for dosage_guidelines
CREATE POLICY "Admin and pharmacist manage dosage guidelines" ON public.dosage_guidelines
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "All staff read dosage guidelines" ON public.dosage_guidelines
  FOR SELECT TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role])
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doctors_code ON public.doctors(doctor_code);
CREATE INDEX IF NOT EXISTS idx_doctors_license ON public.doctors(license_number);
CREATE INDEX IF NOT EXISTS idx_doctors_active ON public.doctors(is_active);
CREATE INDEX IF NOT EXISTS idx_health_records_customer ON public.customer_health_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_number ON public.prescriptions(prescription_number);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_customer ON public.prescriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON public.prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_product ON public.prescription_items(product_id);
CREATE INDEX IF NOT EXISTS idx_medication_history_customer ON public.medication_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_medication_history_product ON public.medication_history(product_id);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug1 ON public.drug_interactions(drug1_id);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug2 ON public.drug_interactions(drug2_id);
CREATE INDEX IF NOT EXISTS idx_drug_warnings_product ON public.drug_warnings(product_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_customer ON public.vaccinations(customer_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_customer ON public.lab_tests(customer_id);
CREATE INDEX IF NOT EXISTS idx_dosage_guidelines_product ON public.dosage_guidelines(product_id);

-- Create triggers for updated_at
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_health_records_updated_at BEFORE UPDATE ON public.customer_health_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medication_history_updated_at BEFORE UPDATE ON public.medication_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drug_interactions_updated_at BEFORE UPDATE ON public.drug_interactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drug_warnings_updated_at BEFORE UPDATE ON public.drug_warnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vaccinations_updated_at BEFORE UPDATE ON public.vaccinations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_tests_updated_at BEFORE UPDATE ON public.lab_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dosage_guidelines_updated_at BEFORE UPDATE ON public.dosage_guidelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate doctor code
CREATE OR REPLACE FUNCTION public.generate_doctor_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'DR-' || LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(doctor_code FROM 4) AS INTEGER)), 0) + 1 FROM public.doctors WHERE doctor_code LIKE 'DR-%')::TEXT, 6, '0');
    
    SELECT EXISTS(SELECT 1 FROM public.doctors WHERE doctor_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Function to generate prescription number
CREATE OR REPLACE FUNCTION public.generate_prescription_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  number_exists BOOLEAN;
BEGIN
  LOOP
    new_number := 'RX-' || LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(prescription_number FROM 4) AS INTEGER)), 0) + 1 FROM public.prescriptions WHERE prescription_number LIKE 'RX-%')::TEXT, 6, '0');
    
    SELECT EXISTS(SELECT 1 FROM public.prescriptions WHERE prescription_number = new_number) INTO number_exists;
    
    EXIT WHEN NOT number_exists;
  END LOOP;
  
  RETURN new_number;
END;
$$;

-- Insert sample doctors
INSERT INTO public.doctors (doctor_code, full_name, full_name_en, specialization, license_number, phone, email, hospital_clinic, is_active)
VALUES 
  ('DR-000001', 'د. أحمد محمد الأحمدي', 'Dr. Ahmed Mohammed Al-Ahmadi', 'طب عام', 'MED-2024-001', '+966501234567', 'ahmed.ahmadi@hospital.com', 'مستشفى الملك فهد', true),
  ('DR-000002', 'د. فاطمة علي السعيد', 'Dr. Fatima Ali Al-Saeed', 'أطفال', 'MED-2024-002', '+966502345678', 'fatima.saeed@hospital.com', 'مستشفى الملك خالد', true),
  ('DR-000003', 'د. محمد عبدالله الغامدي', 'Dr. Mohammed Abdullah Al-Ghamdi', 'قلب وأوعية', 'MED-2024-003', '+966503456789', 'mohammed.ghamdi@hospital.com', 'مستشفى الملك فيصل', true),
  ('DR-000004', 'د. سارة حسن القحطاني', 'Dr. Sarah Hassan Al-Qahtani', 'نساء وولادة', 'MED-2024-004', '+966504567890', 'sarah.qahtani@hospital.com', 'مستشفى الحرس الوطني', true),
  ('DR-000005', 'د. خالد سعد العتيبي', 'Dr. Khaled Saad Al-Otaibi', 'جراحة عامة', 'MED-2024-005', '+966505678901', 'khaled.otaibi@hospital.com', 'المستشفى العسكري', true);

-- Insert common drug interactions
INSERT INTO public.drug_interactions (drug1_id, drug2_id, interaction_type, severity, description, clinical_effects, management)
SELECT 
  p1.id, p2.id, 
  'pharmacodynamic', 
  'major',
  'تفاعل دوائي محتمل بين الأدوية',
  'قد يؤدي إلى زيادة أو نقصان في فعالية الدواء',
  'يجب استشارة الطبيب قبل الاستخدام المتزامن'
FROM public.products p1
CROSS JOIN public.products p2
WHERE p1.id < p2.id
LIMIT 5;

-- Insert common drug warnings
INSERT INTO public.drug_warnings (product_id, warning_type, severity, description, precautions, target_population)
SELECT 
  id,
  'pregnancy',
  'moderate',
  'تحذير للحوامل - يجب استشارة الطبيب',
  'لا يستخدم خلال فترة الحمل إلا بإشراف طبي',
  'النساء الحوامل والمرضعات'
FROM public.products
LIMIT 3;

-- Insert dosage guidelines
INSERT INTO public.dosage_guidelines (product_id, age_group, min_age, max_age, min_dose, max_dose, recommended_dose, frequency, route)
SELECT 
  id,
  'adult',
  18, 65,
  50, 200, 100,
  'مرتين يومياً',
  'oral'
FROM public.products
LIMIT 3;