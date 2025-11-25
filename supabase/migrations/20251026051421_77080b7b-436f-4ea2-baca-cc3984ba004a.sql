-- Create customer segments/classifications table
CREATE TABLE IF NOT EXISTS public.customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  min_purchase_amount NUMERIC DEFAULT 0,
  max_purchase_amount NUMERIC,
  discount_percentage NUMERIC DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create customer interactions/history table
CREATE TABLE IF NOT EXISTS public.customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  interaction_type TEXT NOT NULL, -- call, email, visit, complaint, purchase
  interaction_date TIMESTAMPTZ DEFAULT now(),
  subject TEXT,
  description TEXT,
  employee_id UUID REFERENCES public.employees(id),
  status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  follow_up_date DATE,
  resolution TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create customer complaints table
CREATE TABLE IF NOT EXISTS public.customer_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  complaint_number TEXT NOT NULL UNIQUE,
  complaint_date DATE DEFAULT CURRENT_DATE,
  complaint_type TEXT NOT NULL, -- product, service, delivery, staff, other
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  assigned_to UUID REFERENCES public.employees(id),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create marketing campaigns table
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  campaign_type TEXT NOT NULL, -- email, sms, promotion, loyalty, event
  target_segment TEXT, -- all, gold, silver, bronze, custom
  start_date DATE NOT NULL,
  end_date DATE,
  budget NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, active, paused, completed, cancelled
  discount_percentage NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  target_customers_count INTEGER DEFAULT 0,
  reached_customers_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create campaign customers (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.campaign_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, opened, clicked, converted
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, customer_id)
);

-- Create customer follow-ups table
CREATE TABLE IF NOT EXISTS public.customer_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  follow_up_type TEXT NOT NULL, -- call, email, visit, reminder
  subject TEXT NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMPTZ NOT NULL,
  assigned_to UUID REFERENCES public.employees(id),
  status TEXT DEFAULT 'pending', -- pending, completed, cancelled, rescheduled
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create customer events/occasions table
CREATE TABLE IF NOT EXISTS public.customer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- birthday, anniversary, custom
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  recurring BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 7,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create customer analytics summary table (for caching)
CREATE TABLE IF NOT EXISTS public.customer_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_purchases NUMERIC DEFAULT 0,
  total_purchase_count INTEGER DEFAULT 0,
  average_purchase_value NUMERIC DEFAULT 0,
  last_purchase_date DATE,
  last_interaction_date TIMESTAMPTZ,
  days_since_last_purchase INTEGER,
  purchase_frequency NUMERIC DEFAULT 0, -- purchases per month
  predicted_next_purchase_date DATE,
  lifetime_value NUMERIC DEFAULT 0,
  churn_risk_score NUMERIC DEFAULT 0, -- 0-100
  satisfaction_score NUMERIC DEFAULT 0, -- average rating
  preferred_products JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer ON public.customer_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_date ON public.customer_interactions(interaction_date);
CREATE INDEX IF NOT EXISTS idx_customer_complaints_customer ON public.customer_complaints(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_complaints_status ON public.customer_complaints(status);
CREATE INDEX IF NOT EXISTS idx_campaign_customers_campaign ON public.campaign_customers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_customers_customer ON public.campaign_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_follow_ups_customer ON public.customer_follow_ups(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_follow_ups_date ON public.customer_follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_customer_events_customer ON public.customer_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_events_date ON public.customer_events(event_date);

-- Create function to generate complaint numbers
CREATE OR REPLACE FUNCTION public.generate_complaint_number()
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
    new_number := 'CMP-' || LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(complaint_number FROM 5) AS INTEGER)), 0) + 1 FROM public.customer_complaints WHERE complaint_number LIKE 'CMP-%')::TEXT, 6, '0');
    
    SELECT EXISTS(SELECT 1 FROM public.customer_complaints WHERE complaint_number = new_number) INTO number_exists;
    
    EXIT WHEN NOT number_exists;
  END LOOP;
  
  RETURN new_number;
END;
$$;

-- Create function to generate campaign numbers
CREATE OR REPLACE FUNCTION public.generate_campaign_number()
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
    new_number := 'CAM-' || LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(campaign_number FROM 5) AS INTEGER)), 0) + 1 FROM public.marketing_campaigns WHERE campaign_number LIKE 'CAM-%')::TEXT, 6, '0');
    
    SELECT EXISTS(SELECT 1 FROM public.marketing_campaigns WHERE campaign_number = new_number) INTO number_exists;
    
    EXIT WHEN NOT number_exists;
  END LOOP;
  
  RETURN new_number;
END;
$$;

-- Create triggers for updated_at columns
CREATE TRIGGER update_customer_segments_updated_at
  BEFORE UPDATE ON public.customer_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_interactions_updated_at
  BEFORE UPDATE ON public.customer_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_complaints_updated_at
  BEFORE UPDATE ON public.customer_complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_follow_ups_updated_at
  BEFORE UPDATE ON public.customer_follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_events_updated_at
  BEFORE UPDATE ON public.customer_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_analytics_updated_at
  BEFORE UPDATE ON public.customer_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer_segments
CREATE POLICY "Admin manage customer segments"
ON public.customer_segments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All staff read customer segments"
ON public.customer_segments FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));

-- Create RLS policies for customer_interactions
CREATE POLICY "Staff manage customer interactions"
ON public.customer_interactions FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

CREATE POLICY "Cashier read customer interactions"
ON public.customer_interactions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'cashier'::app_role));

-- Create RLS policies for customer_complaints
CREATE POLICY "Staff manage customer complaints"
ON public.customer_complaints FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Create RLS policies for marketing_campaigns
CREATE POLICY "Admin manage marketing campaigns"
ON public.marketing_campaigns FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read marketing campaigns"
ON public.marketing_campaigns FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Create RLS policies for campaign_customers
CREATE POLICY "Admin manage campaign customers"
ON public.campaign_customers FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read campaign customers"
ON public.campaign_customers FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Create RLS policies for customer_follow_ups
CREATE POLICY "Staff manage customer follow-ups"
ON public.customer_follow_ups FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Create RLS policies for customer_events
CREATE POLICY "Staff manage customer events"
ON public.customer_events FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Create RLS policies for customer_analytics
CREATE POLICY "Admin manage customer analytics"
ON public.customer_analytics FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read customer analytics"
ON public.customer_analytics FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));