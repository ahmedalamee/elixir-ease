-- ============================================================================
-- PHASE 4: General Ledger Journal Entries System
-- ============================================================================
-- Purpose: Create journal entry tables with balance validation and audit trails
-- Features:
--   - gl_journal_entries: Header table for journal entries
--   - gl_journal_lines: Detail lines for each journal entry
--   - Balance validation trigger (debit = credit)
--   - Auto-increment entry numbers
--   - Full audit trail with RLS policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE 1: gl_journal_entries (Journal Entry Header)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gl_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  source_module TEXT, -- 'sales', 'purchases', 'inventory', 'pos', 'manual', etc.
  source_document_id TEXT, -- Reference to source invoice/order/etc.
  branch_id UUID, -- For multi-branch support (if branches table exists)
  is_posted BOOLEAN NOT NULL DEFAULT TRUE,
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  reversed_by UUID, -- Link to reversing journal entry
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique index on entry_no for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_gl_journal_entries_entry_no 
  ON public.gl_journal_entries(entry_no);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_gl_journal_entries_entry_date 
  ON public.gl_journal_entries(entry_date);

CREATE INDEX IF NOT EXISTS idx_gl_journal_entries_posting_date 
  ON public.gl_journal_entries(posting_date);

CREATE INDEX IF NOT EXISTS idx_gl_journal_entries_source 
  ON public.gl_journal_entries(source_module, source_document_id);

CREATE INDEX IF NOT EXISTS idx_gl_journal_entries_created_by 
  ON public.gl_journal_entries(created_by);

-- Add comment for documentation
COMMENT ON TABLE public.gl_journal_entries IS 
  'Journal entry headers for General Ledger system. Each entry must have balanced debit/credit lines.';

-- ----------------------------------------------------------------------------
-- TABLE 2: gl_journal_lines (Journal Entry Lines/Details)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gl_journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.gl_journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.gl_accounts(id) ON DELETE RESTRICT,
  debit NUMERIC(18, 3) NOT NULL DEFAULT 0,
  credit NUMERIC(18, 3) NOT NULL DEFAULT 0,
  description TEXT,
  cost_center_id UUID, -- Future: link to cost_centers table
  branch_id UUID, -- For multi-branch allocation
  line_no INTEGER NOT NULL, -- For ordering lines within a journal
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Business rule constraints
  CONSTRAINT chk_debit_positive CHECK (debit >= 0),
  CONSTRAINT chk_credit_positive CHECK (credit >= 0),
  CONSTRAINT chk_not_both_zero CHECK (NOT (debit = 0 AND credit = 0)),
  CONSTRAINT chk_not_both_nonzero CHECK (NOT (debit > 0 AND credit > 0))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gl_journal_lines_journal_id 
  ON public.gl_journal_lines(journal_id);

CREATE INDEX IF NOT EXISTS idx_gl_journal_lines_account_id 
  ON public.gl_journal_lines(account_id);

CREATE INDEX IF NOT EXISTS idx_gl_journal_lines_branch 
  ON public.gl_journal_lines(branch_id);

CREATE INDEX IF NOT EXISTS idx_gl_journal_lines_cost_center 
  ON public.gl_journal_lines(cost_center_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_gl_journal_lines_account_journal 
  ON public.gl_journal_lines(account_id, journal_id);

-- Add comment
COMMENT ON TABLE public.gl_journal_lines IS 
  'Detail lines for journal entries. Each line is either a debit OR credit to a GL account.';

-- ----------------------------------------------------------------------------
-- FUNCTION: Generate next journal entry number
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  year_prefix TEXT;
  entry_number TEXT;
BEGIN
  -- Use current year as prefix (e.g., JE-2025-0001)
  year_prefix := 'JE-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-';
  
  -- Get the maximum entry number for current year
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN entry_no LIKE year_prefix || '%' 
        THEN SUBSTRING(entry_no FROM LENGTH(year_prefix) + 1)::INTEGER
        ELSE 0
      END
    ), 0
  ) + 1
  INTO next_number
  FROM gl_journal_entries;
  
  -- Format: JE-2025-0001, JE-2025-0002, etc.
  entry_number := year_prefix || LPAD(next_number::TEXT, 4, '0');
  
  RETURN entry_number;
END;
$$;

COMMENT ON FUNCTION public.generate_journal_entry_number() IS 
  'Generate sequential journal entry number with year prefix (JE-YYYY-NNNN)';

-- ----------------------------------------------------------------------------
-- FUNCTION: Validate journal entry balance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_journal_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_debit NUMERIC(18, 3);
  total_credit NUMERIC(18, 3);
  line_count INTEGER;
BEGIN
  -- Get totals for this journal entry
  SELECT 
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0),
    COUNT(*)
  INTO total_debit, total_credit, line_count
  FROM gl_journal_lines
  WHERE journal_id = NEW.id;
  
  -- Must have at least 2 lines (one debit, one credit minimum)
  IF line_count < 2 THEN
    RAISE EXCEPTION 'Journal entry must have at least 2 lines (debit and credit)';
  END IF;
  
  -- Totals must balance (allow tiny rounding differences)
  IF ABS(total_debit - total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry is not balanced: Debit = %, Credit = %', 
      total_debit, total_credit;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_journal_balance() IS 
  'Trigger function to validate that journal entry debits equal credits';

-- ----------------------------------------------------------------------------
-- TRIGGER: Validate balance before posting
-- ----------------------------------------------------------------------------
-- Note: This trigger runs on UPDATE only (when marking as posted)
-- The actual insertion of lines should happen first, then update is_posted
CREATE TRIGGER trg_validate_journal_balance
  BEFORE UPDATE OF is_posted ON public.gl_journal_entries
  FOR EACH ROW
  WHEN (NEW.is_posted = TRUE AND OLD.is_posted = FALSE)
  EXECUTE FUNCTION public.validate_journal_balance();

COMMENT ON TRIGGER trg_validate_journal_balance ON public.gl_journal_entries IS
  'Validates debit/credit balance when posting a journal entry';

-- ----------------------------------------------------------------------------
-- TRIGGER: Auto-update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_journal_entries_updated_at
  BEFORE UPDATE ON public.gl_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- RLS POLICIES: Row Level Security
-- ----------------------------------------------------------------------------

-- Enable RLS on both tables
ALTER TABLE public.gl_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gl_journal_lines ENABLE ROW LEVEL SECURITY;

-- gl_journal_entries policies
-- SELECT: All authenticated staff can read journal entries
CREATE POLICY "Staff can view journal entries"
  ON public.gl_journal_entries
  FOR SELECT
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role])
  );

-- INSERT: Admin and pharmacist can create journal entries
CREATE POLICY "Admin and accountants can create journal entries"
  ON public.gl_journal_entries
  FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
  );

-- UPDATE: Only admin can edit unposted entries
CREATE POLICY "Admin can edit unposted journal entries"
  ON public.gl_journal_entries
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND is_posted = FALSE
  );

-- DELETE: Only admin can delete unposted entries
CREATE POLICY "Admin can delete unposted journal entries"
  ON public.gl_journal_entries
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND is_posted = FALSE
  );

-- gl_journal_lines policies
-- SELECT: Inherit from journal entry access
CREATE POLICY "Staff can view journal lines"
  ON public.gl_journal_lines
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gl_journal_entries je
      WHERE je.id = gl_journal_lines.journal_id
      AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role])
    )
  );

-- INSERT: Admin and accountants can add lines
CREATE POLICY "Admin and accountants can create journal lines"
  ON public.gl_journal_lines
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gl_journal_entries je
      WHERE je.id = gl_journal_lines.journal_id
      AND je.is_posted = FALSE
      AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role])
    )
  );

-- UPDATE: Admin can edit lines of unposted entries
CREATE POLICY "Admin can edit journal lines of unposted entries"
  ON public.gl_journal_lines
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gl_journal_entries je
      WHERE je.id = gl_journal_lines.journal_id
      AND je.is_posted = FALSE
      AND has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- DELETE: Admin can delete lines from unposted entries
CREATE POLICY "Admin can delete journal lines from unposted entries"
  ON public.gl_journal_lines
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gl_journal_entries je
      WHERE je.id = gl_journal_lines.journal_id
      AND je.is_posted = FALSE
      AND has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- ----------------------------------------------------------------------------
-- GRANT PERMISSIONS
-- ----------------------------------------------------------------------------
-- Grant necessary permissions to authenticated users
GRANT SELECT ON public.gl_journal_entries TO authenticated;
GRANT SELECT ON public.gl_journal_lines TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gl_journal_entries TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gl_journal_lines TO authenticated;

-- Grant execute permission on helper functions
GRANT EXECUTE ON FUNCTION public.generate_journal_entry_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_journal_balance() TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================