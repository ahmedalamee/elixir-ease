-- Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_data JSONB,
  new_data JSONB
);

-- Create indexes for performance
CREATE INDEX idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX idx_audit_log_record_id ON public.audit_log(record_id);
CREATE INDEX idx_audit_log_changed_by ON public.audit_log(changed_by);
CREATE INDEX idx_audit_log_changed_at ON public.audit_log(changed_at DESC);
CREATE INDEX idx_audit_log_operation ON public.audit_log(operation);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admin and pharmacist can view audit logs
CREATE POLICY "Admin and pharmacist can view audit logs"
  ON public.audit_log
  FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- System can insert audit logs (triggers use SECURITY DEFINER)
CREATE POLICY "System can insert audit logs"
  ON public.audit_log
  FOR INSERT
  WITH CHECK (true);

-- Create reusable audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_log (
      table_name,
      record_id,
      operation,
      changed_by,
      old_data
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id::TEXT,
      'DELETE',
      auth.uid(),
      row_to_json(OLD)
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_log (
      table_name,
      record_id,
      operation,
      changed_by,
      old_data,
      new_data
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id::TEXT,
      'UPDATE',
      auth.uid(),
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_log (
      table_name,
      record_id,
      operation,
      changed_by,
      new_data
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id::TEXT,
      'INSERT',
      auth.uid(),
      row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers for gl_accounts
CREATE TRIGGER audit_gl_accounts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.gl_accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Create triggers for gl_journal_entries
CREATE TRIGGER audit_gl_journal_entries_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.gl_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Create triggers for gl_journal_lines
CREATE TRIGGER audit_gl_journal_lines_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.gl_journal_lines
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();