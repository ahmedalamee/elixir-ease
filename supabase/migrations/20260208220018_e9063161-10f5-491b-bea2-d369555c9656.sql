
-- =====================================================
-- PARTIAL COLLECTION SYSTEM FOR RECEIPT VOUCHERS
-- سند القبض مع دعم التحصيل الجزئي
-- =====================================================

-- 1. EXTEND cash_receipts TABLE FOR PARTIAL COLLECTION
-- =====================================================
ALTER TABLE public.cash_receipts
ADD COLUMN IF NOT EXISTS original_amount NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS collected_amount NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC GENERATED ALWAYS AS (original_amount - collected_amount) STORED,
ADD COLUMN IF NOT EXISTS collection_status TEXT NOT NULL DEFAULT 'OPEN' 
  CHECK (collection_status IN ('OPEN', 'PARTIALLY_COLLECTED', 'COLLECTED'));

-- Migrate existing data: set original_amount from amount
UPDATE public.cash_receipts 
SET original_amount = amount 
WHERE original_amount = 0 AND amount > 0;

-- 2. CREATE receipt_collections TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.receipt_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.cash_receipts(id) ON DELETE RESTRICT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  collected_by UUID REFERENCES auth.users(id),
  collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Audit fields
  collector_name TEXT,
  collector_phone TEXT
);

-- Enable RLS
ALTER TABLE public.receipt_collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for receipt_collections
CREATE POLICY "Staff can view collections"
ON public.receipt_collections FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[]));

CREATE POLICY "Staff can create collections"
ON public.receipt_collections FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[]));

CREATE POLICY "Admin can update collections"
ON public.receipt_collections FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin']::app_role[]));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_receipt_collections_receipt_id ON public.receipt_collections(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_collections_date ON public.receipt_collections(collection_date);

-- 3. CREATE receipt_attachments TABLE (Electronic Archiving)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.receipt_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.cash_receipts(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receipt_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for receipt_attachments
CREATE POLICY "Staff can view attachments"
ON public.receipt_attachments FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[]));

CREATE POLICY "Staff can upload attachments"
ON public.receipt_attachments FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[]));

CREATE POLICY "Admin can delete attachments"
ON public.receipt_attachments FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin']::app_role[]));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_receipt_attachments_receipt_id ON public.receipt_attachments(receipt_id);

-- 4. EXTEND customers TABLE
-- =====================================================
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS pending_receipts_limit NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.customers.pending_receipts_limit IS 'Maximum allowed balance of uncollected receipt vouchers';

-- 5. CREATE STORAGE BUCKET FOR RECEIPT ATTACHMENTS
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipt-attachments',
  'receipt-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Staff can view receipt attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipt-attachments' 
  AND has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[])
);

CREATE POLICY "Staff can upload receipt attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipt-attachments' 
  AND has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[])
);

CREATE POLICY "Admin can delete receipt attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'receipt-attachments' 
  AND has_any_role(auth.uid(), ARRAY['admin']::app_role[])
);

-- 6. TRIGGER: Update collection status automatically
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_receipt_collection_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_collected NUMERIC;
  v_original_amount NUMERIC;
  v_new_status TEXT;
BEGIN
  -- Get receipt info
  SELECT original_amount INTO v_original_amount
  FROM cash_receipts WHERE id = NEW.receipt_id;
  
  -- Calculate total collected
  SELECT COALESCE(SUM(amount), 0) INTO v_total_collected
  FROM receipt_collections WHERE receipt_id = NEW.receipt_id;
  
  -- Determine status
  IF v_total_collected >= v_original_amount THEN
    v_new_status := 'COLLECTED';
  ELSIF v_total_collected > 0 THEN
    v_new_status := 'PARTIALLY_COLLECTED';
  ELSE
    v_new_status := 'OPEN';
  END IF;
  
  -- Update receipt
  UPDATE cash_receipts
  SET collected_amount = v_total_collected,
      collection_status = v_new_status
  WHERE id = NEW.receipt_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_receipt_collection_status
AFTER INSERT ON public.receipt_collections
FOR EACH ROW
EXECUTE FUNCTION public.update_receipt_collection_status();

-- 7. TRIGGER: Validate collection amount
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_collection_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original_amount NUMERIC;
  v_current_collected NUMERIC;
  v_remaining NUMERIC;
BEGIN
  -- Get receipt info
  SELECT original_amount, collected_amount 
  INTO v_original_amount, v_current_collected
  FROM cash_receipts WHERE id = NEW.receipt_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'سند القبض غير موجود';
  END IF;
  
  v_remaining := v_original_amount - v_current_collected;
  
  -- Validate amount doesn't exceed remaining
  IF NEW.amount > v_remaining THEN
    RAISE EXCEPTION 'مبلغ التحصيل (%) يتجاوز المبلغ المتبقي (%)!', NEW.amount, v_remaining;
  END IF;
  
  -- Set collector info
  NEW.collected_by := COALESCE(NEW.collected_by, auth.uid());
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_collection_amount
BEFORE INSERT ON public.receipt_collections
FOR EACH ROW
EXECUTE FUNCTION public.validate_collection_amount();

-- 8. TRIGGER: Prevent deletion of receipts with collections
-- =====================================================
CREATE OR REPLACE FUNCTION public.prevent_receipt_deletion_with_collections()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM receipt_collections WHERE receipt_id = OLD.id) THEN
    RAISE EXCEPTION 'لا يمكن حذف سند القبض بعد تسجيل تحصيلات عليه!';
  END IF;
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_receipt_deletion
BEFORE DELETE ON public.cash_receipts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_receipt_deletion_with_collections();

-- 9. AUDIT LOG FOR COLLECTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION public.audit_receipt_collection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    changed_by,
    changed_at
  ) VALUES (
    'receipt_collections',
    NEW.id::text,
    'INSERT',
    NULL,
    jsonb_build_object(
      'receipt_id', NEW.receipt_id,
      'amount', NEW.amount,
      'collection_date', NEW.collection_date,
      'notes', NEW.notes
    ),
    auth.uid(),
    now()
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_receipt_collection
AFTER INSERT ON public.receipt_collections
FOR EACH ROW
EXECUTE FUNCTION public.audit_receipt_collection();

-- 10. VIEW: Customer Pending Receipts Summary
-- =====================================================
CREATE OR REPLACE VIEW public.v_customer_pending_receipts
WITH (security_invoker = true)
AS
SELECT 
  c.id AS customer_id,
  c.name AS customer_name,
  c.credit_limit,
  c.balance AS open_invoices_balance,
  c.pending_receipts_limit,
  COALESCE(SUM(cr.remaining_amount), 0) AS remaining_receipts_balance,
  COALESCE(c.balance, 0) + COALESCE(SUM(cr.remaining_amount), 0) AS total_exposure,
  CASE 
    WHEN COALESCE(SUM(cr.remaining_amount), 0) > c.pending_receipts_limit 
    THEN true 
    ELSE false 
  END AS exceeds_pending_limit,
  CASE 
    WHEN COALESCE(c.balance, 0) > c.credit_limit 
    THEN true 
    ELSE false 
  END AS exceeds_credit_limit
FROM customers c
LEFT JOIN cash_receipts cr ON cr.customer_id = c.id 
  AND cr.collection_status IN ('OPEN', 'PARTIALLY_COLLECTED')
  AND cr.status = 'posted'
GROUP BY c.id, c.name, c.credit_limit, c.balance, c.pending_receipts_limit;

-- Grant access to the view
REVOKE ALL ON public.v_customer_pending_receipts FROM anon, public;
GRANT SELECT ON public.v_customer_pending_receipts TO authenticated;

-- 11. FUNCTION: Check Customer Pending Receipts Warning
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_customer_pending_receipts_warning(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_pending_limit NUMERIC;
  v_remaining_balance NUMERIC;
  v_credit_limit NUMERIC;
  v_invoices_balance NUMERIC;
BEGIN
  -- Get customer limits
  SELECT 
    pending_receipts_limit,
    credit_limit,
    COALESCE(balance, 0)
  INTO v_pending_limit, v_credit_limit, v_invoices_balance
  FROM customers WHERE id = p_customer_id;
  
  -- Get remaining receipts balance
  SELECT COALESCE(SUM(remaining_amount), 0)
  INTO v_remaining_balance
  FROM cash_receipts
  WHERE customer_id = p_customer_id
    AND collection_status IN ('OPEN', 'PARTIALLY_COLLECTED')
    AND status = 'posted';
  
  v_result := jsonb_build_object(
    'customer_id', p_customer_id,
    'pending_receipts_limit', v_pending_limit,
    'remaining_receipts_balance', v_remaining_balance,
    'credit_limit', v_credit_limit,
    'invoices_balance', v_invoices_balance,
    'total_exposure', v_invoices_balance + v_remaining_balance,
    'exceeds_pending_limit', v_remaining_balance > v_pending_limit,
    'exceeds_credit_limit', v_invoices_balance > v_credit_limit,
    'warnings', ARRAY(
      SELECT warning FROM (
        SELECT 'تجاوز حد سندات القبض المعلقة' AS warning 
        WHERE v_remaining_balance > v_pending_limit
        UNION ALL
        SELECT 'تجاوز حد الائتمان' 
        WHERE v_invoices_balance > v_credit_limit
      ) w
    )
  );
  
  RETURN v_result;
END;
$$;

-- 12. FUNCTION: Record Collection (Main RPC)
-- =====================================================
CREATE OR REPLACE FUNCTION public.record_receipt_collection(
  p_receipt_id UUID,
  p_amount NUMERIC,
  p_notes TEXT DEFAULT NULL,
  p_collection_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt RECORD;
  v_collection_id UUID;
  v_new_collected NUMERIC;
  v_new_status TEXT;
BEGIN
  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'pharmacist', 'cashier']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات التحصيل';
  END IF;
  
  -- Get receipt info
  SELECT * INTO v_receipt
  FROM cash_receipts WHERE id = p_receipt_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'سند القبض غير موجود';
  END IF;
  
  IF v_receipt.status <> 'posted' THEN
    RAISE EXCEPTION 'لا يمكن التحصيل على سند غير مرحّل';
  END IF;
  
  IF v_receipt.collection_status = 'COLLECTED' THEN
    RAISE EXCEPTION 'سند القبض محصّل بالكامل';
  END IF;
  
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ التحصيل يجب أن يكون أكبر من صفر';
  END IF;
  
  IF p_amount > v_receipt.remaining_amount THEN
    RAISE EXCEPTION 'مبلغ التحصيل (%) يتجاوز المبلغ المتبقي (%)!', p_amount, v_receipt.remaining_amount;
  END IF;
  
  -- Insert collection record
  INSERT INTO receipt_collections (
    receipt_id, amount, collected_by, collection_date, notes
  ) VALUES (
    p_receipt_id, p_amount, auth.uid(), p_collection_date, p_notes
  ) RETURNING id INTO v_collection_id;
  
  -- Get updated values
  SELECT collected_amount, collection_status
  INTO v_new_collected, v_new_status
  FROM cash_receipts WHERE id = p_receipt_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'collection_id', v_collection_id,
    'receipt_id', p_receipt_id,
    'amount_collected', p_amount,
    'total_collected', v_new_collected,
    'remaining', v_receipt.original_amount - v_new_collected,
    'new_status', v_new_status,
    'message', CASE 
      WHEN v_new_status = 'COLLECTED' THEN 'تم تحصيل سند القبض بالكامل'
      ELSE 'تم تسجيل التحصيل بنجاح'
    END
  );
END;
$$;

-- 13. INDEX for performance on cash_receipts
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_cash_receipts_customer_status 
ON public.cash_receipts(customer_id, collection_status) 
WHERE status = 'posted';

CREATE INDEX IF NOT EXISTS idx_cash_receipts_collection_status 
ON public.cash_receipts(collection_status);
