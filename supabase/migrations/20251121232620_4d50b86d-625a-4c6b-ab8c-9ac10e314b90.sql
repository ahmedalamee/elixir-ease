-- إصلاح تحذير Security Definer View

DROP VIEW IF EXISTS public.posted_documents_audit;

CREATE VIEW public.posted_documents_audit 
WITH (security_invoker = on) AS
SELECT 
  'sales_invoice' as document_type,
  id,
  invoice_number as document_number,
  invoice_date as document_date,
  total_amount,
  status,
  posted_by,
  posted_at,
  customer_id as party_id,
  NULL::uuid as warehouse_id
FROM sales_invoices
WHERE status = 'posted'
UNION ALL
SELECT 
  'purchase_invoice' as document_type,
  id,
  pi_number as document_number,
  invoice_date as document_date,
  total_amount,
  status,
  posted_by,
  posted_at,
  supplier_id as party_id,
  warehouse_id
FROM purchase_invoices
WHERE status = 'posted'
UNION ALL
SELECT 
  'journal_entry' as document_type,
  id,
  entry_number as document_number,
  entry_date as document_date,
  total_debit as total_amount,
  status,
  posted_by,
  posted_at,
  NULL::uuid as party_id,
  NULL::uuid as warehouse_id
FROM journal_entries
WHERE status = 'posted'
ORDER BY document_date DESC, posted_at DESC;