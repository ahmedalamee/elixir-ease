
-- Fix Security Definer View issue
DROP VIEW IF EXISTS vw_document_gl_links;

CREATE VIEW vw_document_gl_links 
WITH (security_invoker = true)
AS
SELECT 
  dge.id,
  dge.document_type,
  dge.document_id,
  dge.document_number,
  dge.document_amount,
  dge.status as link_status,
  dge.error_message,
  dge.created_at as linked_at,
  je.id as journal_entry_id,
  je.entry_no as journal_entry_number,
  je.entry_date,
  je.posting_date,
  je.description as journal_description,
  je.is_posted,
  je.is_reversed,
  je.source_module,
  COALESCE(
    (SELECT SUM(debit) FROM gl_journal_lines WHERE journal_id = je.id), 0
  ) as total_debit,
  COALESCE(
    (SELECT SUM(credit) FROM gl_journal_lines WHERE journal_id = je.id), 0
  ) as total_credit
FROM document_gl_entries dge
LEFT JOIN gl_journal_entries je ON je.id = dge.journal_entry_id
ORDER BY dge.created_at DESC;
