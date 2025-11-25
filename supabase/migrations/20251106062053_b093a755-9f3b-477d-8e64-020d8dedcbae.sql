-- Create sales_invoices table
CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'posted', 'cancelled', 'returned')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sales_invoice_items table
CREATE TABLE IF NOT EXISTS public.sales_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
  discount_percentage NUMERIC(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  discount_amount NUMERIC(15,2) DEFAULT 0 CHECK (discount_amount >= 0),
  tax_percentage NUMERIC(5,2) DEFAULT 0 CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
  tax_amount NUMERIC(15,2) DEFAULT 0 CHECK (tax_amount >= 0),
  line_total NUMERIC(15,2) NOT NULL CHECK (line_total >= 0),
  batch_number TEXT,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create customer_payments table
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  reference_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create customer_payment_allocations table
CREATE TABLE IF NOT EXISTS public.customer_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.customer_payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id),
  allocated_amount NUMERIC(15,2) NOT NULL CHECK (allocated_amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payment_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_invoices
CREATE POLICY "Staff can select invoices" ON public.sales_invoices
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[]));

CREATE POLICY "Staff can insert invoices" ON public.sales_invoices
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[]));

CREATE POLICY "Prevent editing posted invoices" ON public.sales_invoices
  FOR UPDATE TO authenticated
  USING (
    status <> 'posted' AND 
    has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[])
  );

CREATE POLICY "Only admin can delete draft invoices" ON public.sales_invoices
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND status = 'draft');

-- RLS Policies for sales_invoice_items
CREATE POLICY "Staff can manage invoice items" ON public.sales_invoice_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales_invoices si
      WHERE si.id = sales_invoice_items.invoice_id
      AND has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[])
    )
  );

-- RLS Policies for customer_payments
CREATE POLICY "Staff can select payments" ON public.customer_payments
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[]));

CREATE POLICY "Staff can insert payments" ON public.customer_payments
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[]));

CREATE POLICY "Prevent editing posted payments" ON public.customer_payments
  FOR UPDATE TO authenticated
  USING (
    status <> 'posted' AND 
    has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[])
  );

CREATE POLICY "Only admin can delete draft payments" ON public.customer_payments
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND status = 'draft');

-- RLS Policies for customer_payment_allocations
CREATE POLICY "Staff can manage payment allocations" ON public.customer_payment_allocations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_payments cp
      WHERE cp.id = customer_payment_allocations.payment_id
      AND has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[])
    )
  );

-- Create indexes for performance
CREATE INDEX idx_sales_invoices_customer ON public.sales_invoices(customer_id);
CREATE INDEX idx_sales_invoices_date ON public.sales_invoices(invoice_date);
CREATE INDEX idx_sales_invoices_status ON public.sales_invoices(status);
CREATE INDEX idx_sales_invoices_payment_status ON public.sales_invoices(payment_status);
CREATE INDEX idx_sales_invoice_items_invoice ON public.sales_invoice_items(invoice_id);
CREATE INDEX idx_sales_invoice_items_product ON public.sales_invoice_items(product_id);
CREATE INDEX idx_customer_payments_customer ON public.customer_payments(customer_id);
CREATE INDEX idx_customer_payments_date ON public.customer_payments(payment_date);
CREATE INDEX idx_customer_payment_allocations_payment ON public.customer_payment_allocations(payment_id);
CREATE INDEX idx_customer_payment_allocations_invoice ON public.customer_payment_allocations(invoice_id);

-- Add triggers for updated_at
CREATE TRIGGER update_sales_invoices_updated_at
  BEFORE UPDATE ON public.sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_payments_updated_at
  BEFORE UPDATE ON public.customer_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to customers table for tracking
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_transaction_date TIMESTAMP WITH TIME ZONE;

-- Update existing customers to be active
UPDATE public.customers SET is_active = true WHERE is_active IS NULL;

-- Trigger to update customer balance and loyalty points on invoice posting
CREATE OR REPLACE FUNCTION update_customer_on_invoice_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'posted' AND OLD.status <> 'posted' THEN
    UPDATE public.customers
    SET 
      balance = balance + NEW.total_amount,
      loyalty_points = loyalty_points + FLOOR(NEW.total_amount / 10),
      last_transaction_date = NEW.invoice_date
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_customer_on_invoice_post
  AFTER INSERT OR UPDATE ON public.sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_on_invoice_post();

-- Trigger to update customer balance on payment posting
CREATE OR REPLACE FUNCTION update_customer_on_payment_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'posted' AND OLD.status <> 'posted' THEN
    UPDATE public.customers
    SET 
      balance = balance - NEW.amount,
      last_transaction_date = NEW.payment_date
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_customer_on_payment_post
  AFTER INSERT OR UPDATE ON public.customer_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_on_payment_post();

-- Trigger to update invoice payment status based on allocations
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  invoice_total NUMERIC;
  total_allocated NUMERIC;
BEGIN
  -- Get invoice total
  SELECT total_amount INTO invoice_total
  FROM public.sales_invoices
  WHERE id = NEW.invoice_id;
  
  -- Get total allocated amount for this invoice
  SELECT COALESCE(SUM(allocated_amount), 0) INTO total_allocated
  FROM public.customer_payment_allocations
  WHERE invoice_id = NEW.invoice_id;
  
  -- Update payment status
  UPDATE public.sales_invoices
  SET payment_status = CASE
    WHEN total_allocated = 0 THEN 'unpaid'
    WHEN total_allocated >= invoice_total THEN 'paid'
    ELSE 'partial'
  END
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_invoice_payment_status
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_payment_status();