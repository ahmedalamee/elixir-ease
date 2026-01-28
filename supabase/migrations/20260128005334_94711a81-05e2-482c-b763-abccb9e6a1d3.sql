-- Create customer_representatives table
CREATE TABLE IF NOT EXISTS public.customer_representatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL,
    name_en TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create sales_representatives table
CREATE TABLE IF NOT EXISTS public.sales_representatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL,
    name_en TEXT,
    phone TEXT,
    email TEXT,
    commission_rate NUMERIC(5,2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create delivery_agents table
CREATE TABLE IF NOT EXISTS public.delivery_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL,
    name_en TEXT,
    phone TEXT,
    vehicle_number TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns to sales_invoices table
ALTER TABLE public.sales_invoices 
ADD COLUMN IF NOT EXISTS customer_representative_id UUID REFERENCES public.customer_representatives(id),
ADD COLUMN IF NOT EXISTS sales_representative_id UUID REFERENCES public.sales_representatives(id),
ADD COLUMN IF NOT EXISTS delivery_agent_id UUID REFERENCES public.delivery_agents(id),
ADD COLUMN IF NOT EXISTS prevent_return BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.customer_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_agents ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_representatives
CREATE POLICY "Staff can view customer_representatives" ON public.customer_representatives
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage customer_representatives" ON public.customer_representatives
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'pharmacist'))
);

-- RLS policies for sales_representatives
CREATE POLICY "Staff can view sales_representatives" ON public.sales_representatives
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage sales_representatives" ON public.sales_representatives
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'pharmacist'))
);

-- RLS policies for delivery_agents
CREATE POLICY "Staff can view delivery_agents" ON public.delivery_agents
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage delivery_agents" ON public.delivery_agents
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'pharmacist'))
);

-- Insert sample data for testing
INSERT INTO public.customer_representatives (name_ar, name_en, phone) VALUES
('أحمد محمد', 'Ahmed Mohammed', '777123456'),
('محمد علي', 'Mohammed Ali', '777234567'),
('خالد سعيد', 'Khaled Saeed', '777345678')
ON CONFLICT DO NOTHING;

INSERT INTO public.sales_representatives (name_ar, name_en, phone, commission_rate) VALUES
('عبدالله أحمد', 'Abdullah Ahmed', '770111222', 2.5),
('سالم محمد', 'Salem Mohammed', '770222333', 3.0),
('فهد عبدالرحمن', 'Fahd Abdulrahman', '770333444', 2.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.delivery_agents (name_ar, name_en, phone, vehicle_number) VALUES
('ياسر حسين', 'Yasser Hussein', '773111222', 'YMN-1234'),
('عمر صالح', 'Omar Saleh', '773222333', 'YMN-5678'),
('حسن علي', 'Hassan Ali', '773333444', 'YMN-9012')
ON CONFLICT DO NOTHING;

-- Create function to check if invoice can be returned
CREATE OR REPLACE FUNCTION public.check_invoice_returnable(p_invoice_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prevent_return BOOLEAN;
BEGIN
    SELECT prevent_return INTO v_prevent_return
    FROM sales_invoices
    WHERE id = p_invoice_id;
    
    IF v_prevent_return = true THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;

-- Update post_sales_return to check prevent_return
CREATE OR REPLACE FUNCTION public.validate_sales_return()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prevent_return BOOLEAN;
BEGIN
    -- Check if the original invoice prevents returns
    SELECT prevent_return INTO v_prevent_return
    FROM sales_invoices
    WHERE id = NEW.invoice_id;
    
    IF v_prevent_return = true THEN
        RAISE EXCEPTION 'لا يمكن إرجاع هذه الفاتورة - تم تفعيل خيار منع الإرجاع';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to validate sales returns
DROP TRIGGER IF EXISTS tr_validate_sales_return ON public.sales_returns;
CREATE TRIGGER tr_validate_sales_return
    BEFORE INSERT ON public.sales_returns
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_sales_return();