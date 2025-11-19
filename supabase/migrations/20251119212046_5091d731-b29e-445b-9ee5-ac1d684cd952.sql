-- Fix 1: Add authorization to posting functions
-- Update post_purchase_invoice to check permissions
CREATE OR REPLACE FUNCTION public.post_purchase_invoice(p_invoice_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_invoice RECORD;
  v_item RECORD;
  v_journal_entry_id UUID;
  v_journal_entry_number TEXT;
  v_result JSON;
BEGIN
  -- Authorization check: Only admin or inventory_manager can post
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'inventory_manager']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات الترحيل';
  END IF;

  -- Get invoice details
  SELECT * INTO v_invoice FROM purchase_invoices WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  
  IF v_invoice.status = 'posted' THEN
    RAISE EXCEPTION 'Invoice already posted';
  END IF;
  
  -- Update invoice status
  UPDATE purchase_invoices 
  SET status = 'posted',
      posted_at = now(),
      posted_by = auth.uid()
  WHERE id = p_invoice_id;
  
  -- Generate journal entry number
  v_journal_entry_number := 'JE-' || LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1 FROM journal_entries WHERE entry_number LIKE 'JE-%')::TEXT, 6, '0');
  
  -- Create journal entry
  INSERT INTO journal_entries (
    entry_number,
    entry_date,
    description,
    reference_type,
    reference_id,
    status,
    created_by
  ) VALUES (
    v_journal_entry_number,
    v_invoice.invoice_date,
    'Purchase Invoice ' || v_invoice.pi_number,
    'purchase_invoice',
    p_invoice_id,
    'posted',
    auth.uid()
  ) RETURNING id INTO v_journal_entry_id;
  
  -- Debit: Inventory/Purchases
  INSERT INTO journal_entry_lines (
    entry_id,
    line_no,
    account_id,
    debit_amount,
    credit_amount,
    description
  ) SELECT
    v_journal_entry_id,
    1,
    (SELECT id FROM gl_accounts WHERE account_code = '1-1-001' LIMIT 1),
    v_invoice.total_amount,
    0,
    'Purchase Invoice ' || v_invoice.pi_number;
  
  -- Credit: Accounts Payable
  INSERT INTO journal_entry_lines (
    entry_id,
    line_no,
    account_id,
    debit_amount,
    credit_amount,
    description
  ) SELECT
    v_journal_entry_id,
    2,
    (SELECT id FROM gl_accounts WHERE account_code = '2-1-001' LIMIT 1),
    0,
    v_invoice.total_amount,
    'Purchase Invoice ' || v_invoice.pi_number;
  
  -- Update journal entry totals
  UPDATE journal_entries
  SET total_debit = v_invoice.total_amount,
      total_credit = v_invoice.total_amount,
      posted_at = now(),
      posted_by = auth.uid()
  WHERE id = v_journal_entry_id;
  
  -- Create document GL entry link
  INSERT INTO document_gl_entries (
    document_type,
    document_id,
    document_number,
    document_amount,
    journal_entry_id,
    status
  ) VALUES (
    'purchase_invoice',
    p_invoice_id,
    v_invoice.pi_number,
    v_invoice.total_amount,
    v_journal_entry_id,
    'posted'
  );
  
  -- Update supplier balance
  UPDATE suppliers
  SET balance = balance + v_invoice.total_amount
  WHERE id = v_invoice.supplier_id;
  
  -- Log the operation
  RAISE LOG 'User % posted purchase invoice % (amount: %)', auth.uid(), v_invoice.pi_number, v_invoice.total_amount;
  
  v_result := json_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'journal_entry_id', v_journal_entry_id,
    'journal_entry_number', v_journal_entry_number,
    'message', 'Invoice posted successfully'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error posting invoice: %', SQLERRM;
END;
$function$;

-- Update post_goods_receipt to check permissions
CREATE OR REPLACE FUNCTION public.post_goods_receipt(p_grn_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_grn RECORD;
  v_item RECORD;
  v_batch_id UUID;
  v_result JSON;
BEGIN
  -- Authorization check: Only admin or inventory_manager can post
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'inventory_manager']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات الترحيل';
  END IF;

  -- Get GRN details
  SELECT * INTO v_grn FROM goods_receipts WHERE id = p_grn_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GRN not found';
  END IF;
  
  IF v_grn.status = 'posted' THEN
    RAISE EXCEPTION 'GRN already posted';
  END IF;
  
  -- Update GRN status
  UPDATE goods_receipts 
  SET status = 'posted',
      posted_at = now(),
      posted_by = auth.uid()
  WHERE id = p_grn_id;
  
  -- Process each GRN item
  FOR v_item IN 
    SELECT gi.*, p.name as product_name
    FROM grn_items gi
    JOIN products p ON p.id = gi.item_id
    WHERE gi.grn_id = p_grn_id
  LOOP
    -- Create batch in product_batches
    INSERT INTO product_batches (
      product_id,
      batch_number,
      expiry_date,
      quantity,
      cost_price,
      created_at
    ) VALUES (
      v_item.item_id,
      v_item.lot_no,
      v_item.expiry_date,
      v_item.qty_received,
      v_item.unit_cost,
      now()
    ) RETURNING id INTO v_batch_id;
    
    -- Update warehouse stock
    INSERT INTO warehouse_stock (
      warehouse_id,
      item_id,
      uom_id,
      qty_on_hand,
      qty_reserved,
      qty_inbound,
      qty_outbound,
      last_updated
    ) VALUES (
      v_grn.warehouse_id,
      v_item.item_id,
      v_item.uom_id,
      v_item.qty_received,
      0,
      0,
      0,
      now()
    )
    ON CONFLICT (warehouse_id, item_id, uom_id) 
    DO UPDATE SET
      qty_on_hand = warehouse_stock.qty_on_hand + v_item.qty_received,
      last_updated = now();
    
    -- Create stock ledger entry
    INSERT INTO stock_ledger (
      warehouse_id,
      item_id,
      batch_id,
      ref_type,
      ref_id,
      qty_in,
      qty_out,
      unit_cost,
      created_by,
      created_at,
      note
    ) VALUES (
      v_grn.warehouse_id,
      v_item.item_id,
      v_batch_id,
      'grn',
      p_grn_id,
      v_item.qty_received,
      0,
      v_item.unit_cost,
      auth.uid(),
      now(),
      'Goods Receipt: ' || v_grn.grn_number
    );
    
    -- Update PO item received quantity
    IF v_item.po_item_id IS NOT NULL THEN
      UPDATE po_items
      SET qty_received = qty_received + v_item.qty_received
      WHERE id = v_item.po_item_id;
    END IF;
  END LOOP;
  
  -- Update PO status if all items received
  IF v_grn.po_id IS NOT NULL THEN
    UPDATE purchase_orders po
    SET status = CASE 
      WHEN (SELECT SUM(qty_ordered) FROM po_items WHERE po_id = po.id) = 
           (SELECT SUM(qty_received) FROM po_items WHERE po_id = po.id)
      THEN 'completed'
      ELSE 'partial'
    END
    WHERE po.id = v_grn.po_id;
  END IF;
  
  -- Log the operation
  RAISE LOG 'User % posted goods receipt % (warehouse: %)', auth.uid(), v_grn.grn_number, v_grn.warehouse_id;
  
  v_result := json_build_object(
    'success', true,
    'grn_id', p_grn_id,
    'message', 'GRN posted successfully and inventory updated'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error posting GRN: %', SQLERRM;
END;
$function$;

-- Fix 2: Update RLS policies for customer_health_records to implement need-to-know access
DROP POLICY IF EXISTS "Admin and pharmacist manage health records" ON customer_health_records;

-- Allow users to view their own health records
CREATE POLICY "Customers can view own health records"
ON customer_health_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customers
    WHERE customers.id = customer_health_records.customer_id
    AND customers.user_id = auth.uid()
  )
);

-- Admin can manage all health records
CREATE POLICY "Admin full access to health records"
ON customer_health_records FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Pharmacists can only view health records for customers with recent prescriptions
CREATE POLICY "Pharmacist access for active prescriptions"
ON customer_health_records FOR SELECT
USING (
  has_role(auth.uid(), 'pharmacist'::app_role)
  AND EXISTS (
    SELECT 1 FROM prescriptions
    WHERE prescriptions.customer_id = customer_health_records.customer_id
    AND prescriptions.created_at > NOW() - INTERVAL '7 days'
  )
);

-- Pharmacists can insert/update health records only during active consultations
CREATE POLICY "Pharmacist update for active prescriptions"
ON customer_health_records FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'pharmacist'::app_role)
  AND EXISTS (
    SELECT 1 FROM prescriptions
    WHERE prescriptions.customer_id = customer_health_records.customer_id
    AND prescriptions.created_at > NOW() - INTERVAL '7 days'
  )
);

CREATE POLICY "Pharmacist modify for active prescriptions"
ON customer_health_records FOR UPDATE
USING (
  has_role(auth.uid(), 'pharmacist'::app_role)
  AND EXISTS (
    SELECT 1 FROM prescriptions
    WHERE prescriptions.customer_id = customer_health_records.customer_id
    AND prescriptions.created_at > NOW() - INTERVAL '7 days'
  )
)
WITH CHECK (
  has_role(auth.uid(), 'pharmacist'::app_role)
  AND EXISTS (
    SELECT 1 FROM prescriptions
    WHERE prescriptions.customer_id = customer_health_records.customer_id
    AND prescriptions.created_at > NOW() - INTERVAL '7 days'
  )
);

-- Fix 3: Create audit log table for health record access
CREATE TABLE IF NOT EXISTS health_record_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'view', 'insert', 'update', 'delete'
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  prescription_id UUID REFERENCES prescriptions(id),
  reason TEXT,
  ip_address TEXT
);

ALTER TABLE health_record_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admin view audit logs"
ON health_record_audit FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_health_audit_customer ON health_record_audit(customer_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_audit_user ON health_record_audit(user_id, accessed_at DESC);

-- Fix 4: Create secure RPC function for employee creation
CREATE OR REPLACE FUNCTION public.create_employee_with_role(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_full_name_en TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_national_id TEXT DEFAULT NULL,
  p_job_title TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_salary NUMERIC DEFAULT NULL,
  p_role app_role DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_employee_code TEXT;
  v_employee_id UUID;
  v_result JSON;
BEGIN
  -- Authorization check: Only admin can create employees
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات المسؤول لإنشاء موظفين';
  END IF;

  -- Validate required fields
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'البريد الإلكتروني مطلوب';
  END IF;
  
  IF p_password IS NULL OR LENGTH(p_password) < 8 THEN
    RAISE EXCEPTION 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
  END IF;
  
  IF p_full_name IS NULL OR p_full_name = '' THEN
    RAISE EXCEPTION 'الاسم الكامل مطلوب';
  END IF;

  -- Note: User creation must be done from client side using supabase.auth.admin.createUser
  -- This function will be called after user is created
  
  -- Generate employee code
  v_employee_code := 'EMP-' || LPAD(
    (SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 5) AS INTEGER)), 0) + 1 
     FROM employees WHERE employee_code LIKE 'EMP-%')::TEXT, 
    6, '0'
  );
  
  -- For now, we'll return the employee code and let the client handle user creation
  -- A better approach would be to use Supabase admin API from an edge function
  
  v_result := json_build_object(
    'success', true,
    'employee_code', v_employee_code,
    'message', 'استخدم هذا الكود لإنشاء الموظف'
  );
  
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في إنشاء الموظف: %', SQLERRM;
END;
$function$;

-- Comment: The above function is a placeholder. For full security, employee creation
-- should be handled through an edge function that uses Supabase Admin API