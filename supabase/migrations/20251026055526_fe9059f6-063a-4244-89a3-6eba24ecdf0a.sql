-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin and pharmacist manage doctors" ON public.doctors;
DROP POLICY IF EXISTS "All staff read doctors" ON public.doctors;
DROP POLICY IF EXISTS "Admin and pharmacist manage health records" ON public.customer_health_records;
DROP POLICY IF EXISTS "Admin and pharmacist manage prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Cashier read prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Admin and pharmacist manage prescription items" ON public.prescription_items;
DROP POLICY IF EXISTS "Cashier read prescription items" ON public.prescription_items;
DROP POLICY IF EXISTS "Admin and pharmacist manage medication history" ON public.medication_history;
DROP POLICY IF EXISTS "Admin and pharmacist manage drug interactions" ON public.drug_interactions;
DROP POLICY IF EXISTS "All staff read drug interactions" ON public.drug_interactions;
DROP POLICY IF EXISTS "Admin and pharmacist manage drug warnings" ON public.drug_warnings;
DROP POLICY IF EXISTS "All staff read drug warnings" ON public.drug_warnings;
DROP POLICY IF EXISTS "Admin and pharmacist manage vaccinations" ON public.vaccinations;
DROP POLICY IF EXISTS "Admin and pharmacist manage lab tests" ON public.lab_tests;
DROP POLICY IF EXISTS "Admin and pharmacist manage dosage guidelines" ON public.dosage_guidelines;
DROP POLICY IF EXISTS "All staff read dosage guidelines" ON public.dosage_guidelines;

-- Now create the secure RLS policies (authenticated users only)
CREATE POLICY "Admin and pharmacist manage doctors" ON public.doctors
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "All staff read doctors" ON public.doctors
  FOR SELECT TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role])
  );

CREATE POLICY "Admin and pharmacist manage health records" ON public.customer_health_records
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "Admin and pharmacist manage prescriptions" ON public.prescriptions
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "Cashier read prescriptions" ON public.prescriptions
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'cashier'::app_role)
  );

CREATE POLICY "Admin and pharmacist manage prescription items" ON public.prescription_items
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "Cashier read prescription items" ON public.prescription_items
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'cashier'::app_role)
  );

CREATE POLICY "Admin and pharmacist manage medication history" ON public.medication_history
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "Admin and pharmacist manage drug interactions" ON public.drug_interactions
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "All staff read drug interactions" ON public.drug_interactions
  FOR SELECT TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role])
  );

CREATE POLICY "Admin and pharmacist manage drug warnings" ON public.drug_warnings
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "All staff read drug warnings" ON public.drug_warnings
  FOR SELECT TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role])
  );

CREATE POLICY "Admin and pharmacist manage vaccinations" ON public.vaccinations
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "Admin and pharmacist manage lab tests" ON public.lab_tests
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "Admin and pharmacist manage dosage guidelines" ON public.dosage_guidelines
  FOR ALL TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "All staff read dosage guidelines" ON public.dosage_guidelines
  FOR SELECT TO authenticated USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role])
  );