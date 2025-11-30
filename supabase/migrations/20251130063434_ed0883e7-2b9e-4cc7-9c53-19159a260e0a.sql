-- ============================================================================
-- ERP Account Mappings Table (Phase 5)
-- Maps ERP modules/operations to GL accounts for automatic journal posting
-- ============================================================================

-- Create erp_account_mappings table
CREATE TABLE IF NOT EXISTS public.erp_account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Module and operation identification
  module TEXT NOT NULL,  -- 'sales', 'purchases', 'inventory', 'cash', 'pos', etc.
  operation TEXT NOT NULL,  -- 'invoice_cash', 'invoice_credit', 'purchase_invoice', etc.
  
  -- Optional branch-specific mapping
  branch_id UUID NULL,
  
  -- GL account references
  debit_account_id UUID NULL REFERENCES public.gl_accounts(id) ON DELETE SET NULL,
  credit_account_id UUID NULL REFERENCES public.gl_accounts(id) ON DELETE SET NULL,
  
  -- Metadata
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure unique mapping per module/operation/branch
  CONSTRAINT unique_module_operation_branch UNIQUE (module, operation, branch_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_erp_account_mappings_module ON public.erp_account_mappings(module);
CREATE INDEX IF NOT EXISTS idx_erp_account_mappings_operation ON public.erp_account_mappings(operation);
CREATE INDEX IF NOT EXISTS idx_erp_account_mappings_branch ON public.erp_account_mappings(branch_id);
CREATE INDEX IF NOT EXISTS idx_erp_account_mappings_debit_account ON public.erp_account_mappings(debit_account_id);
CREATE INDEX IF NOT EXISTS idx_erp_account_mappings_credit_account ON public.erp_account_mappings(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_erp_account_mappings_active ON public.erp_account_mappings(is_active) WHERE is_active = TRUE;

-- Add updated_at trigger
CREATE TRIGGER trg_erp_account_mappings_updated_at
  BEFORE UPDATE ON public.erp_account_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS Policies for erp_account_mappings
-- ============================================================================

ALTER TABLE public.erp_account_mappings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read account mappings
CREATE POLICY "erp_account_mappings_select_authenticated"
  ON public.erp_account_mappings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admin and accountants can insert/update/delete mappings
CREATE POLICY "erp_account_mappings_insert_by_role"
  ON public.erp_account_mappings
  FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "erp_account_mappings_update_by_role"
  ON public.erp_account_mappings
  FOR UPDATE
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  )
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

CREATE POLICY "erp_account_mappings_delete_by_role"
  ON public.erp_account_mappings
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================================
-- Helper function to get account mapping
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_account_mapping(
  p_module TEXT,
  p_operation TEXT,
  p_branch_id UUID DEFAULT NULL
)
RETURNS TABLE (
  debit_account_id UUID,
  credit_account_id UUID,
  notes TEXT
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Try to find branch-specific mapping first
  IF p_branch_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      m.debit_account_id,
      m.credit_account_id,
      m.notes
    FROM public.erp_account_mappings m
    WHERE m.module = p_module
      AND m.operation = p_operation
      AND m.branch_id = p_branch_id
      AND m.is_active = TRUE
    LIMIT 1;
    
    -- If found, return
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- Fall back to general mapping (branch_id IS NULL)
  RETURN QUERY
  SELECT 
    m.debit_account_id,
    m.credit_account_id,
    m.notes
  FROM public.erp_account_mappings m
  WHERE m.module = p_module
    AND m.operation = p_operation
    AND m.branch_id IS NULL
    AND m.is_active = TRUE
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_account_mapping(TEXT, TEXT, UUID) TO authenticated;

-- ============================================================================
-- Sample account mappings (commented out - to be configured per installation)
-- ============================================================================

/*
-- Sales Module Mappings
INSERT INTO public.erp_account_mappings (module, operation, debit_account_id, credit_account_id, notes)
VALUES 
  ('sales', 'invoice_cash', 
   (SELECT id FROM gl_accounts WHERE account_code = '1101'), -- Cash/Bank (Debit)
   (SELECT id FROM gl_accounts WHERE account_code = '4101'), -- Sales Revenue (Credit)
   'مبيعات نقدية - تحصيل فوري'),
  
  ('sales', 'invoice_credit', 
   (SELECT id FROM gl_accounts WHERE account_code = '1301'), -- Accounts Receivable (Debit)
   (SELECT id FROM gl_accounts WHERE account_code = '4101'), -- Sales Revenue (Credit)
   'مبيعات آجلة - حسابات مدينة'),
  
  ('sales', 'sales_tax', 
   (SELECT id FROM gl_accounts WHERE account_code = '1301'), -- AR or Cash (Debit)
   (SELECT id FROM gl_accounts WHERE account_code = '2201'), -- VAT Payable (Credit)
   'ضريبة القيمة المضافة على المبيعات');

-- Purchase Module Mappings
INSERT INTO public.erp_account_mappings (module, operation, debit_account_id, credit_account_id, notes)
VALUES 
  ('purchases', 'purchase_invoice', 
   (SELECT id FROM gl_accounts WHERE account_code = '1401'), -- Inventory (Debit)
   (SELECT id FROM gl_accounts WHERE account_code = '2101'), -- Accounts Payable (Credit)
   'فاتورة شراء - إضافة مخزون'),
  
  ('purchases', 'purchase_tax', 
   (SELECT id FROM gl_accounts WHERE account_code = '1501'), -- VAT Receivable (Debit)
   (SELECT id FROM gl_accounts WHERE account_code = '2101'), -- AP or Cash (Credit)
   'ضريبة القيمة المضافة على المشتريات');

-- Inventory Module Mappings
INSERT INTO public.erp_account_mappings (module, operation, debit_account_id, credit_account_id, notes)
VALUES 
  ('inventory', 'adjustment_gain', 
   (SELECT id FROM gl_accounts WHERE account_code = '1401'), -- Inventory (Debit)
   (SELECT id FROM gl_accounts WHERE account_code = '4901'), -- Other Income (Credit)
   'جرد فائض - زيادة مخزون'),
  
  ('inventory', 'adjustment_loss', 
   (SELECT id FROM gl_accounts WHERE account_code = '5901'), -- Other Expense (Debit)
   (SELECT id FROM gl_accounts WHERE account_code = '1401'), -- Inventory (Credit)
   'جرد عجز - نقص مخزون');
*/

COMMENT ON TABLE public.erp_account_mappings IS 'Maps ERP modules and operations to GL accounts for automatic journal entry posting';
COMMENT ON COLUMN public.erp_account_mappings.module IS 'ERP module name (sales, purchases, inventory, cash, pos, etc.)';
COMMENT ON COLUMN public.erp_account_mappings.operation IS 'Specific operation within module (invoice_cash, invoice_credit, etc.)';
COMMENT ON COLUMN public.erp_account_mappings.branch_id IS 'Optional branch-specific mapping, NULL for general mapping';
COMMENT ON COLUMN public.erp_account_mappings.debit_account_id IS 'GL account to be debited for this operation';
COMMENT ON COLUMN public.erp_account_mappings.credit_account_id IS 'GL account to be credited for this operation';