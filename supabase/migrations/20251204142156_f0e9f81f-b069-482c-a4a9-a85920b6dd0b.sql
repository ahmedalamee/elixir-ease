-- Add accounting_period_id column to gl_journal_entries
ALTER TABLE gl_journal_entries
ADD COLUMN IF NOT EXISTS accounting_period_id UUID REFERENCES accounting_periods(id);

-- Create strict period validation function
CREATE OR REPLACE FUNCTION validate_posting_period_strict(p_date DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_period_id UUID;
  v_any_periods_exist BOOLEAN;
BEGIN
  -- Check if any periods are defined
  SELECT EXISTS(SELECT 1 FROM accounting_periods) INTO v_any_periods_exist;
  
  -- If no periods defined, allow posting (initial setup phase) - return NULL
  IF NOT v_any_periods_exist THEN
    RETURN NULL;
  END IF;
  
  -- Find open period for the given date
  SELECT id INTO v_period_id
  FROM accounting_periods
  WHERE p_date BETWEEN start_date AND end_date
    AND is_closed = false
  LIMIT 1;

  IF v_period_id IS NULL THEN
    -- Check if period exists but is closed
    IF EXISTS (
      SELECT 1 FROM accounting_periods 
      WHERE p_date BETWEEN start_date AND end_date
    ) THEN
      RAISE EXCEPTION 'INVALID_PERIOD: الفترة المحاسبية مغلقة للتاريخ %', p_date;
    ELSE
      RAISE EXCEPTION 'INVALID_PERIOD: لا توجد فترة محاسبية معرّفة للتاريخ %', p_date;
    END IF;
  END IF;

  RETURN v_period_id;
END;
$$;

-- Create trigger function for period enforcement
CREATE OR REPLACE FUNCTION trg_validate_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only validate if entry is being posted
  IF NEW.is_posted = true THEN
    NEW.accounting_period_id := validate_posting_period_strict(NEW.entry_date);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS enforce_period_trigger ON gl_journal_entries;

CREATE TRIGGER enforce_period_trigger
BEFORE INSERT OR UPDATE ON gl_journal_entries
FOR EACH ROW
EXECUTE FUNCTION trg_validate_period();

-- Function to close accounting period with validation
CREATE OR REPLACE FUNCTION close_accounting_period(p_period_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_period RECORD;
  v_draft_count INTEGER;
  v_result JSONB;
BEGIN
  -- Check admin permission
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: مطلوب صلاحيات المسؤول لإغلاق الفترة';
  END IF;

  -- Get period details
  SELECT * INTO v_period FROM accounting_periods WHERE id = p_period_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PERIOD_NOT_FOUND: الفترة المحاسبية غير موجودة';
  END IF;
  
  IF v_period.is_closed THEN
    RAISE EXCEPTION 'ALREADY_CLOSED: الفترة مغلقة بالفعل';
  END IF;

  -- Check for draft journal entries in this period
  SELECT COUNT(*) INTO v_draft_count
  FROM gl_journal_entries
  WHERE entry_date BETWEEN v_period.start_date AND v_period.end_date
    AND is_posted = false;

  IF v_draft_count > 0 THEN
    RAISE EXCEPTION 'DRAFT_ENTRIES_EXIST: يوجد % قيد محاسبي غير مرحّل في هذه الفترة', v_draft_count;
  END IF;

  -- Close the period
  UPDATE accounting_periods
  SET is_closed = true,
      closed_at = NOW(),
      closed_by = auth.uid()
  WHERE id = p_period_id;

  v_result := jsonb_build_object(
    'success', true,
    'period_id', p_period_id,
    'period_name', v_period.period_name,
    'message', 'تم إغلاق الفترة المحاسبية بنجاح'
  );

  RETURN v_result;
END;
$$;

-- Function to reopen accounting period
CREATE OR REPLACE FUNCTION reopen_accounting_period(p_period_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_period RECORD;
  v_result JSONB;
BEGIN
  -- Check admin permission
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: مطلوب صلاحيات المسؤول لإعادة فتح الفترة';
  END IF;

  -- Get period details
  SELECT * INTO v_period FROM accounting_periods WHERE id = p_period_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PERIOD_NOT_FOUND: الفترة المحاسبية غير موجودة';
  END IF;
  
  IF NOT v_period.is_closed THEN
    RAISE EXCEPTION 'ALREADY_OPEN: الفترة مفتوحة بالفعل';
  END IF;

  -- Reopen the period
  UPDATE accounting_periods
  SET is_closed = false,
      closed_at = NULL,
      closed_by = NULL
  WHERE id = p_period_id;

  v_result := jsonb_build_object(
    'success', true,
    'period_id', p_period_id,
    'period_name', v_period.period_name,
    'message', 'تم إعادة فتح الفترة المحاسبية بنجاح'
  );

  RETURN v_result;
END;
$$;

-- Function to get period statistics
CREATE OR REPLACE FUNCTION get_period_statistics(p_period_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_period RECORD;
  v_stats JSONB;
BEGIN
  SELECT * INTO v_period FROM accounting_periods WHERE id = p_period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'الفترة غير موجودة');
  END IF;

  SELECT jsonb_build_object(
    'total_entries', COUNT(*),
    'posted_entries', COUNT(*) FILTER (WHERE is_posted = true),
    'draft_entries', COUNT(*) FILTER (WHERE is_posted = false),
    'total_debit', COALESCE(SUM(
      (SELECT SUM(debit) FROM gl_journal_lines WHERE journal_id = je.id)
    ), 0),
    'total_credit', COALESCE(SUM(
      (SELECT SUM(credit) FROM gl_journal_lines WHERE journal_id = je.id)
    ), 0)
  ) INTO v_stats
  FROM gl_journal_entries je
  WHERE entry_date BETWEEN v_period.start_date AND v_period.end_date;

  RETURN v_stats;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_posting_period_strict(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION close_accounting_period(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reopen_accounting_period(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_period_statistics(UUID) TO authenticated;