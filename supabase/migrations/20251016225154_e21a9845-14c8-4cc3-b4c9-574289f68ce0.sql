-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'pharmacist', 'cashier', 'inventory_manager');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create helper function for multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Admins manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Drop old policies and create new role-based policies for customers
DROP POLICY IF EXISTS "Allow authenticated users full access to customers" ON public.customers;

CREATE POLICY "Admin and pharmacist full access to customers"
ON public.customers FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'pharmacist')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'pharmacist')
);

CREATE POLICY "Cashier read customers"
ON public.customers FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'cashier'));

-- Drop old policies and create new role-based policies for suppliers
DROP POLICY IF EXISTS "Allow authenticated users full access to suppliers" ON public.suppliers;

CREATE POLICY "Admin and inventory manager full access to suppliers"
ON public.suppliers FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory_manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Pharmacist read suppliers"
ON public.suppliers FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'pharmacist'));

-- Drop old policies and create new role-based policies for sales
DROP POLICY IF EXISTS "Allow authenticated users full access to sales" ON public.sales;

CREATE POLICY "Admin and pharmacist view all sales"
ON public.sales FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'pharmacist')
);

CREATE POLICY "Admin and pharmacist manage sales"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'pharmacist') OR
  public.has_role(auth.uid(), 'cashier')
);

CREATE POLICY "Admin update sales"
ON public.sales FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete sales"
ON public.sales FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop old policies and create new role-based policies for sale_items
DROP POLICY IF EXISTS "Allow authenticated users full access to sale_items" ON public.sale_items;

CREATE POLICY "All staff read sale_items"
ON public.sale_items FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[])
);

CREATE POLICY "Staff create sale_items"
ON public.sale_items FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[])
);

CREATE POLICY "Admin manage sale_items"
ON public.sale_items FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete sale_items"
ON public.sale_items FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop old policies and create new role-based policies for products
DROP POLICY IF EXISTS "Allow authenticated users full access to products" ON public.products;

CREATE POLICY "All staff read products"
ON public.products FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier', 'inventory_manager']::app_role[])
);

CREATE POLICY "Admin and inventory manager manage products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Admin and inventory manager update products"
ON public.products FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory_manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Admin delete products"
ON public.products FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop old policies and create new role-based policies for categories
DROP POLICY IF EXISTS "Allow authenticated users full access to categories" ON public.categories;

CREATE POLICY "All staff read categories"
ON public.categories FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier', 'inventory_manager']::app_role[])
);

CREATE POLICY "Admin and inventory manager manage categories"
ON public.categories FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory_manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory_manager')
);

-- Add database-level constraints for data integrity
ALTER TABLE public.products 
  ADD CONSTRAINT price_positive CHECK (price > 0),
  ADD CONSTRAINT cost_price_positive CHECK (cost_price > 0),
  ADD CONSTRAINT quantity_non_negative CHECK (quantity >= 0),
  ADD CONSTRAINT min_quantity_positive CHECK (min_quantity > 0),
  ADD CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0);

ALTER TABLE public.customers
  ADD CONSTRAINT credit_limit_non_negative CHECK (credit_limit >= 0),
  ADD CONSTRAINT balance_reasonable CHECK (balance >= -1000000 AND balance <= 1000000);

ALTER TABLE public.sale_items
  ADD CONSTRAINT quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT unit_price_positive CHECK (unit_price > 0),
  ADD CONSTRAINT total_positive CHECK (total > 0);