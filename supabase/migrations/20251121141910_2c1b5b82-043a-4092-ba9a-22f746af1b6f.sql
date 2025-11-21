-- حذف الجداول القديمة إن وجدت
DROP TABLE IF EXISTS public.pos_sessions CASCADE;
DROP TABLE IF EXISTS public.pos_shifts CASCADE;
DROP TABLE IF EXISTS public.pos_devices CASCADE;

-- إنشاء جدول أجهزة نقاط البيع
CREATE TABLE public.pos_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'computer',
  serial_number TEXT UNIQUE,
  location TEXT,
  branch TEXT,
  floor_section TEXT,
  ip_address TEXT,
  port INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  last_activity TIMESTAMP WITH TIME ZONE,
  operating_system TEXT,
  version TEXT,
  printer_settings JSONB,
  permissions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- إنشاء جدول ورديات نقاط البيع
CREATE TABLE public.pos_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_name TEXT NOT NULL,
  shift_type TEXT NOT NULL DEFAULT 'morning',
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active_days TEXT[] DEFAULT ARRAY['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],
  opening_balance NUMERIC DEFAULT 0,
  max_balance NUMERIC,
  allow_credit_sales BOOLEAN DEFAULT false,
  credit_limit NUMERIC DEFAULT 0,
  allowed_users UUID[],
  allowed_devices UUID[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- إنشاء جدول جلسات نقاط البيع
CREATE TABLE public.pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_number TEXT NOT NULL UNIQUE,
  device_id UUID REFERENCES public.pos_devices(id),
  shift_id UUID REFERENCES public.pos_shifts(id),
  user_id UUID,
  employee_id UUID REFERENCES public.employees(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  opening_cash NUMERIC NOT NULL DEFAULT 0,
  closing_cash NUMERIC,
  expected_cash NUMERIC,
  cash_difference NUMERIC,
  total_sales NUMERIC DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  closed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس للأداء
CREATE INDEX idx_pos_devices_status ON public.pos_devices(status);
CREATE INDEX idx_pos_devices_code ON public.pos_devices(device_code);
CREATE INDEX idx_pos_shifts_active ON public.pos_shifts(is_active);
CREATE INDEX idx_pos_sessions_status ON public.pos_sessions(status);
CREATE INDEX idx_pos_sessions_user ON public.pos_sessions(user_id);
CREATE INDEX idx_pos_sessions_date ON public.pos_sessions(session_date);

-- تفعيل RLS
ALTER TABLE public.pos_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للأجهزة
CREATE POLICY "Admin and managers can manage devices"
  ON public.pos_devices FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Staff can view devices"
  ON public.pos_devices FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));

-- سياسات الأمان للورديات
CREATE POLICY "Admin and managers can manage shifts"
  ON public.pos_shifts FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Staff can view shifts"
  ON public.pos_shifts FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));

-- سياسات الأمان للجلسات
CREATE POLICY "Staff can view own sessions"
  ON public.pos_sessions FOR SELECT
  USING (user_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Staff can create sessions"
  ON public.pos_sessions FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));

CREATE POLICY "Staff can update own sessions"
  ON public.pos_sessions FOR UPDATE
  USING (user_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- دالة توليد رقم جلسة تلقائي
CREATE OR REPLACE FUNCTION generate_pos_session_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date TEXT;
  v_sequence INTEGER;
  v_session_number TEXT;
BEGIN
  v_date := TO_CHAR(CURRENT_DATE, 'YYYY/MM/DD');
  
  SELECT COALESCE(MAX(CAST(SPLIT_PART(session_number, '/', 4) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM pos_sessions
  WHERE session_number LIKE v_date || '%';
  
  v_session_number := v_date || '/' || v_sequence;
  
  RETURN v_session_number;
END;
$$;