-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  full_name_en TEXT,
  phone TEXT,
  email TEXT,
  national_id TEXT,
  hire_date DATE DEFAULT CURRENT_DATE,
  job_title TEXT,
  department TEXT,
  salary NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin full access to employees"
ON public.employees
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view their own record"
ON public.employees
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view employees"
ON public.employees
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]));

-- Trigger for updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate employee code
CREATE OR REPLACE FUNCTION public.generate_employee_code()
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
    new_code := 'EMP-' || LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 5) AS INTEGER)), 0) + 1 FROM public.employees WHERE employee_code LIKE 'EMP-%')::TEXT, 6, '0');
    
    SELECT EXISTS(SELECT 1 FROM public.employees WHERE employee_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Create index for performance
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_employees_employee_code ON public.employees(employee_code);
CREATE INDEX idx_employees_is_active ON public.employees(is_active);