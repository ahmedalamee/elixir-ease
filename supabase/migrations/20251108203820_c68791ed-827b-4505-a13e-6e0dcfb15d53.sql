-- Add user_id to customers table to link with auth
ALTER TABLE public.customers 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_customers_user_id ON public.customers(user_id);

-- Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own data
CREATE POLICY "Customers can view own data"
ON public.customers
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Customers can update their own basic info
CREATE POLICY "Customers can update own info"
ON public.customers
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable RLS on sales_invoices for customer access
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own invoices
CREATE POLICY "Customers can view own invoices"
ON public.sales_invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customers
    WHERE customers.id = sales_invoices.customer_id
    AND customers.user_id = auth.uid()
  )
);

-- Policy: Staff can view all invoices (admin, pharmacist, cashier)
CREATE POLICY "Staff can view all invoices"
ON public.sales_invoices
FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[])
);

-- Policy: Staff can manage invoices
CREATE POLICY "Staff can manage invoices"
ON public.sales_invoices
FOR ALL
USING (
  has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[])
)
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[])
);