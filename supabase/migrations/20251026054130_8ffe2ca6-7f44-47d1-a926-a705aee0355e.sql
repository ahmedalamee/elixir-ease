-- Create employee attendance table
CREATE TABLE IF NOT EXISTS public.employee_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out TIMESTAMP WITH TIME ZONE,
  work_hours NUMERIC,
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create employee leaves table
CREATE TABLE IF NOT EXISTS public.employee_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create employee tasks table
CREATE TABLE IF NOT EXISTS public.employee_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  task_description TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create employee performance table
CREATE TABLE IF NOT EXISTS public.employee_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  evaluation_date DATE NOT NULL,
  overall_rating NUMERIC CHECK (overall_rating >= 1 AND overall_rating <= 5),
  attendance_score NUMERIC,
  productivity_score NUMERIC,
  quality_score NUMERIC,
  teamwork_score NUMERIC,
  comments TEXT,
  evaluated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_attendance
CREATE POLICY "Admin manage attendance" ON public.employee_attendance
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees view own attendance" ON public.employee_attendance
  FOR SELECT USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- RLS Policies for employee_leaves
CREATE POLICY "Admin manage leaves" ON public.employee_leaves
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees manage own leaves" ON public.employee_leaves
  FOR ALL USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- RLS Policies for employee_tasks
CREATE POLICY "Admin manage tasks" ON public.employee_tasks
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees view own tasks" ON public.employee_tasks
  FOR SELECT USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Employees update own tasks" ON public.employee_tasks
  FOR UPDATE USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- RLS Policies for employee_performance
CREATE POLICY "Admin manage performance" ON public.employee_performance
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees view own performance" ON public.employee_performance
  FOR SELECT USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.employee_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.employee_attendance(check_in);
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON public.employee_leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON public.employee_leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_employee ON public.employee_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.employee_tasks(status);
CREATE INDEX IF NOT EXISTS idx_performance_employee ON public.employee_performance(employee_id);

-- Triggers for updated_at
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.employee_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leaves_updated_at BEFORE UPDATE ON public.employee_leaves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.employee_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_performance_updated_at BEFORE UPDATE ON public.employee_performance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();