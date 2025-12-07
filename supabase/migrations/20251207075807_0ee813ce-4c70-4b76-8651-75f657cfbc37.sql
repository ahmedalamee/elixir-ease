-- ============================================================================
-- Fix Multi-Currency Logic in post_sales_invoice
-- Ensures YER (base currency) always uses exchange_rate = 1
-- ============================================================================

CREATE OR REPLACE FUNCTION public.post_sales_invoice(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice RECORD;
  v_line RECORD;
  v_je_id UUID;
  v_je_number TEXT;
  v_result JSONB;
  v_operation TEXT;
  v_mapping_sale RECORD;
  v_mapping_tax RECORD;
  v_mapping_cogs RECORD;
  v_mapping_discount RECORD;
  v_line_no INTEGER := 0;
  v_net_amount_fc NUMERIC;
  v_net_amount_bc NUMERIC;
  v_cogs_amount NUMERIC := 0;
  v_exchange_rate NUMERIC;
  v_currency_code VARCHAR(3);
  v_base_currency VARCHAR(3);
  v_total_fc NUMERIC;
  v_total_bc NUMERIC;
  v_tax_fc NUMERIC;
  v_tax_bc NUMERIC;
  v_discount_fc NUMERIC;
  v_discount_bc NUMERIC;
  v_paid_fc NUMERIC;
  v_paid_bc NUMERIC;
BEGIN
  -- Authorization check
  IF NOT has_any_role(auth.uid(), ARRAY['admin', 'pharmacist']::app_role[]) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحيات الترحيل';
  END IF;

  -- Get base currency from currencies table
  SELECT code INTO v_base_currency FROM currencies WHERE is_base = true LIMIT 1;
  IF v_base_currency IS NULL THEN
    v_base_currency := 'YER';
  END IF;

  -- Get invoice details
  SELECT si.*, c.name as customer_name 
  INTO v_invoice 
  FROM sales_invoices si
  LEFT JOIN customers c ON c.id = si.customer_id
  WHERE si.id = p_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الفاتورة غير موجودة';
  END IF;
  
  IF v_invoice.status = 'posted' THEN
    RAISE EXCEPTION 'الفاتورة مرحّلة مسبقاً';
  END IF;

  -- CRITICAL: Set currency values - base currency ALWAYS has rate=1
  v_currency_code := COALESCE(v_invoice.currency_code, v_base_currency);
  
  -- Force exchange_rate = 1 for base currency, regardless of stored value
  IF v_currency_code = v_base_currency THEN
    v_exchange_rate := 1.0;
  ELSE
    v_exchange_rate := COALESCE(v_invoice.exchange_rate, 1.0);
    -- Validate we have a proper exchange rate for non-base currency
    IF v_exchange_rate <= 0 THEN
      RAISE EXCEPTION 'سعر الصرف غير صالح للعملة %', v_currency_code;
    END IF;
  END IF;
  
  -- Calculate FC values (use stored FC values or fallback to legacy)
  v_total_fc := COALESCE(v_invoice.total_amount_fc, v_invoice.total_amount);
  v_tax_fc := COALESCE(v_invoice.tax_amount_fc, v_invoice.tax_amount, 0);
  v_discount_fc := COALESCE(v_invoice.discount_amount_fc, v_invoice.discount_amount, 0);
  v_paid_fc := COALESCE(v_invoice.paid_amount_fc, v_invoice.paid_amount, 0);
  
  -- Calculate BC values (for base currency: BC = FC, otherwise: BC = FC * rate)
  IF v_currency_code = v_base_currency THEN
    v_total_bc := v_total_fc;
    v_tax_bc := v_tax_fc;
    v_discount_bc := v_discount_fc;
    v_paid_bc := v_paid_fc;
  ELSE
    v_total_bc := COALESCE(v_invoice.total_amount_bc, v_total_fc * v_exchange_rate);
    v_tax_bc := COALESCE(v_invoice.tax_amount_bc, v_tax_fc * v_exchange_rate);
    v_discount_bc := COALESCE(v_invoice.discount_amount_bc, v_discount_fc * v_exchange_rate);
    v_paid_bc := COALESCE(v_invoice.paid_amount_bc, v_paid_fc * v_exchange_rate);
  END IF;

  -- Validate posting period
  PERFORM validate_posting_period(v_invoice.invoice_date);

  -- Check for existing GL entry
  IF EXISTS (SELECT 1 FROM gl_journal_entries WHERE source_document_id = p_invoice_id::text AND source_module = 'sales') THEN
    RAISE EXCEPTION 'تم إنشاء قيد محاسبي لهذه الفاتورة مسبقاً';
  END IF;

  -- Determine operation type
  IF v_paid_fc >= v_total_fc THEN
    v_operation := 'cash_sale';
  ELSE
    v_operation := 'credit_sale';
  END IF;

  -- Get account mappings
  SELECT * INTO v_mapping_sale FROM erp_account_mappings 
  WHERE module = 'sales' AND operation = v_operation AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_tax FROM erp_account_mappings 
  WHERE module = 'sales' AND operation = 'sales_tax' AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_cogs FROM erp_account_mappings 
  WHERE module = 'sales' AND operation = 'cost_of_goods_sold' AND is_active = true LIMIT 1;
  
  SELECT * INTO v_mapping_discount FROM erp_account_mappings 
  WHERE module = 'sales' AND operation = 'sales_discount' AND is_active = true LIMIT 1;

  IF v_mapping_sale.debit_account_id IS NULL OR v_mapping_sale.credit_account_id IS NULL THEN
    RAISE EXCEPTION 'ربط الحسابات غير مكوّن للعملية: %', v_operation;
  END IF;

  -- Calculate net amounts (total - tax) in both currencies
  v_net_amount_fc := v_total_fc - v_tax_fc;
  v_net_amount_bc := v_total_bc - v_tax_bc;

  -- Generate journal entry number
  v_je_number := (SELECT generate_journal_entry_number());

  -- Create journal entry header
  INSERT INTO gl_journal_entries (
    entry_no, entry_date, posting_date, description,
    source_module, source_document_id, is_posted, is_reversed, created_by
  ) VALUES (
    v_je_number,
    v_invoice.invoice_date,
    CURRENT_DATE,
    'فاتورة مبيعات رقم: ' || v_invoice.invoice_number || ' - ' || COALESCE(v_invoice.customer_name, 'عميل نقدي') || 
    CASE WHEN v_currency_code <> v_base_currency THEN ' (' || v_currency_code || ')' ELSE '' END,
    'sales',
    p_invoice_id::TEXT,
    true, false, auth.uid()
  ) RETURNING id INTO v_je_id;

  -- Journal lines with dual-currency support
  -- 1. Debit: Cash/Receivables (total amount)
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (
    journal_id, line_no, account_id, 
    debit, credit, 
    debit_fc, credit_fc, debit_bc, credit_bc,
    currency_code, exchange_rate,
    description
  ) VALUES (
    v_je_id, v_line_no, v_mapping_sale.debit_account_id, 
    v_total_bc, 0,
    v_total_fc, 0,
    v_total_bc, 0,
    v_currency_code, v_exchange_rate,
    CASE WHEN v_operation = 'cash_sale' THEN 'تحصيل نقدي' ELSE 'ذمم مدينة' END
  );

  -- 2. Credit: Sales Revenue (net without tax)
  v_line_no := v_line_no + 1;
  INSERT INTO gl_journal_lines (
    journal_id, line_no, account_id, 
    debit, credit,
    debit_fc, credit_fc, debit_bc, credit_bc,
    currency_code, exchange_rate,
    description
  ) VALUES (
    v_je_id, v_line_no, v_mapping_sale.credit_account_id, 
    0, v_net_amount_bc,
    0, v_net_amount_fc,
    0, v_net_amount_bc,
    v_currency_code, v_exchange_rate,
    'إيرادات مبيعات'
  );

  -- 3. Credit: VAT Payable (if any)
  IF v_tax_fc > 0 AND v_mapping_tax.credit_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (
      journal_id, line_no, account_id, 
      debit, credit,
      debit_fc, credit_fc, debit_bc, credit_bc,
      currency_code, exchange_rate,
      description
    ) VALUES (
      v_je_id, v_line_no, v_mapping_tax.credit_account_id, 
      0, v_tax_bc,
      0, v_tax_fc,
      0, v_tax_bc,
      v_currency_code, v_exchange_rate,
      'ضريبة مخرجات'
    );
  END IF;

  -- 4. Discount (if any)
  IF v_discount_fc > 0 AND v_mapping_discount.debit_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (
      journal_id, line_no, account_id, 
      debit, credit,
      debit_fc, credit_fc, debit_bc, credit_bc,
      currency_code, exchange_rate,
      description
    ) VALUES (
      v_je_id, v_line_no, v_mapping_discount.debit_account_id, 
      v_discount_bc, 0,
      v_discount_fc, 0,
      v_discount_bc, 0,
      v_currency_code, v_exchange_rate,
      'خصم مبيعات'
    );
  END IF;

  -- Update invoice status and ensure correct currency values
  UPDATE sales_invoices 
  SET 
    status = 'posted',
    posted_by = auth.uid(),
    posted_at = NOW(),
    -- Ensure currency fields are correctly set
    currency_code = v_currency_code,
    exchange_rate = v_exchange_rate,
    total_amount_bc = v_total_bc,
    total_amount_fc = v_total_fc
  WHERE id = p_invoice_id;

  -- Update customer balance (ALWAYS in base currency - YER)
  UPDATE customers 
  SET 
    balance = COALESCE(balance, 0) + (v_total_bc - v_paid_bc),
    last_transaction_date = v_invoice.invoice_date
  WHERE id = v_invoice.customer_id;

  -- Link document to GL entry
  INSERT INTO document_gl_entries (
    document_type, document_id, document_number, 
    document_amount, journal_entry_id, status
  ) VALUES (
    'sales_invoice', p_invoice_id, v_invoice.invoice_number,
    v_total_bc,
    v_je_id, 'posted'
  );

  -- Record stock movements and COGS
  FOR v_line IN (SELECT sii.*, p.cost, p.name as product_name
                 FROM sales_invoice_items sii
                 JOIN products p ON p.id = sii.item_id
                 WHERE sii.invoice_id = p_invoice_id)
  LOOP
    -- Update warehouse stock
    UPDATE warehouse_stock 
    SET qty_on_hand = qty_on_hand - v_line.quantity,
        updated_at = NOW()
    WHERE warehouse_id = v_invoice.warehouse_id 
      AND item_id = v_line.item_id;

    -- Record stock ledger entry
    INSERT INTO stock_ledger (
      warehouse_id, item_id, product_id, transaction_type, 
      reference_type, reference_id, qty_out, 
      unit_cost, balance_after, notes
    )
    SELECT 
      v_invoice.warehouse_id,
      v_line.item_id,
      v_line.item_id,
      'sale',
      'sales_invoice',
      p_invoice_id,
      v_line.quantity,
      v_line.cost,
      COALESCE(ws.qty_on_hand, 0),
      'فاتورة مبيعات: ' || v_invoice.invoice_number
    FROM warehouse_stock ws
    WHERE ws.warehouse_id = v_invoice.warehouse_id 
      AND ws.item_id = v_line.item_id;

    -- Accumulate COGS (always in base currency since inventory is in base currency)
    v_cogs_amount := v_cogs_amount + (v_line.quantity * COALESCE(v_line.cost, 0));
  END LOOP;

  -- Post COGS if any (always in base currency since inventory is in base currency)
  IF v_cogs_amount > 0 AND v_mapping_cogs.debit_account_id IS NOT NULL AND v_mapping_cogs.credit_account_id IS NOT NULL THEN
    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (
      journal_id, line_no, account_id, 
      debit, credit,
      debit_fc, credit_fc, debit_bc, credit_bc,
      currency_code, exchange_rate,
      description
    ) VALUES (
      v_je_id, v_line_no, v_mapping_cogs.debit_account_id, 
      v_cogs_amount, 0,
      v_cogs_amount, 0,
      v_cogs_amount, 0,
      v_base_currency, 1,
      'تكلفة البضاعة المباعة'
    );

    v_line_no := v_line_no + 1;
    INSERT INTO gl_journal_lines (
      journal_id, line_no, account_id, 
      debit, credit,
      debit_fc, credit_fc, debit_bc, credit_bc,
      currency_code, exchange_rate,
      description
    ) VALUES (
      v_je_id, v_line_no, v_mapping_cogs.credit_account_id, 
      0, v_cogs_amount,
      0, v_cogs_amount,
      0, v_cogs_amount,
      v_base_currency, 1,
      'مخزون'
    );
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'message', 'تم ترحيل الفاتورة بنجاح',
    'invoice_id', p_invoice_id,
    'journal_entry_id', v_je_id,
    'journal_entry_number', v_je_number,
    'currency_code', v_currency_code,
    'base_currency', v_base_currency,
    'exchange_rate', v_exchange_rate,
    'total_amount_fc', v_total_fc,
    'total_amount_bc', v_total_bc
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM,
      'invoice_id', p_invoice_id
    );
END;
$function$;

-- Add comment for documentation
COMMENT ON FUNCTION post_sales_invoice(uuid) IS 
'Posts a sales invoice with full multi-currency support. 
Base currency (YER) always uses exchange_rate = 1.
All GL entries store both FC (foreign currency) and BC (base currency YER) amounts.
Customer balance is always updated in base currency (YER).';