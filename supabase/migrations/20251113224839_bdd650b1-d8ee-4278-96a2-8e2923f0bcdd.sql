-- Add warehouse_id to purchase_invoices table
ALTER TABLE purchase_invoices 
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_warehouse_id 
ON purchase_invoices(warehouse_id);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT NOT NULL UNIQUE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_id UUID REFERENCES suppliers(id),
  warehouse_id UUID REFERENCES warehouses(id),
  expense_type TEXT NOT NULL, -- 'operational', 'maintenance', 'utilities', 'salaries', 'other'
  category TEXT NOT NULL, -- 'rent', 'electricity', 'water', 'transport', 'office_supplies', etc.
  amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT, -- 'cash', 'bank_transfer', 'check', 'credit_card'
  payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'paid'
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  reference_number TEXT,
  description TEXT,
  notes TEXT,
  attachments JSONB,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'approved', 'posted', 'cancelled'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses
CREATE POLICY "Admin and managers can manage expenses"
ON expenses FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]));

CREATE POLICY "Staff can view expenses"
ON expenses FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role, 'cashier'::app_role]));

-- Create expense_items table for detailed expense breakdowns
CREATE TABLE IF NOT EXISTS expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax_code TEXT,
  tax_percentage NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  account_code TEXT, -- للربط مع الحسابات لاحقاً
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for expense_items
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_items
CREATE POLICY "Staff can manage expense items"
ON expense_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM expenses 
    WHERE expenses.id = expense_items.expense_id 
    AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role])
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_id ON expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_warehouse_id ON expenses(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_expense_id ON expense_items(expense_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_expenses_updated_at();

-- Add comment
COMMENT ON TABLE expenses IS 'نظام المصروفات - تسجيل جميع المصروفات التشغيلية والإدارية';
COMMENT ON TABLE expense_items IS 'تفاصيل بنود المصروفات';