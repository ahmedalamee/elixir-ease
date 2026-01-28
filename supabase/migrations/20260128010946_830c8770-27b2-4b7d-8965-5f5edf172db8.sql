
-- =====================================================
-- HARDEN SALES INVOICE ENHANCEMENTS
-- Enterprise ERP Security & Data Integrity
-- =====================================================

-- Drop existing function that has conflicting return type
DROP FUNCTION IF EXISTS public.check_invoice_returnable(UUID);

-- 1. UPDATE validate_sales_return trigger with improved error message
CREATE OR REPLACE FUNCTION public.validate_sales_return()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prevent_return BOOLEAN;
    v_invoice_status TEXT;
BEGIN
    -- Check if the invoice exists and get status
    SELECT status, prevent_return INTO v_invoice_status, v_prevent_return
    FROM sales_invoices
    WHERE id = NEW.invoice_id;
    
    -- Check if invoice is found
    IF v_invoice_status IS NULL THEN
        RAISE EXCEPTION 'الفاتورة غير موجودة أو تم حذفها';
    END IF;
    
    -- Check if invoice is posted
    IF v_invoice_status != 'posted' THEN
        RAISE EXCEPTION 'لا يمكن إرجاع فاتورة غير مرحّلة';
    END IF;
    
    -- Check if return is prevented with clear Arabic message
    IF v_prevent_return = true THEN
        RAISE EXCEPTION 'لا يمكن إرجاع هذه الفاتورة لأنها محددة كغير قابلة للإرجاع';
    END IF;
    
    RETURN NEW;
END;
$$;

-- 2. Add validation trigger for representative IDs (ensure they exist and are active)
CREATE OR REPLACE FUNCTION public.validate_sales_invoice_representatives()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_active BOOLEAN;
BEGIN
    -- Validate customer_representative_id if provided
    IF NEW.customer_representative_id IS NOT NULL THEN
        SELECT is_active INTO v_is_active
        FROM customer_representatives
        WHERE id = NEW.customer_representative_id;
        
        IF v_is_active IS NULL THEN
            RAISE EXCEPTION 'مندوب العميل المحدد غير موجود';
        END IF;
        
        IF v_is_active = false THEN
            RAISE EXCEPTION 'مندوب العميل المحدد غير نشط';
        END IF;
    END IF;
    
    -- Validate sales_representative_id if provided
    IF NEW.sales_representative_id IS NOT NULL THEN
        SELECT is_active INTO v_is_active
        FROM sales_representatives
        WHERE id = NEW.sales_representative_id;
        
        IF v_is_active IS NULL THEN
            RAISE EXCEPTION 'مندوب المبيعات المحدد غير موجود';
        END IF;
        
        IF v_is_active = false THEN
            RAISE EXCEPTION 'مندوب المبيعات المحدد غير نشط';
        END IF;
    END IF;
    
    -- Validate delivery_agent_id if provided
    IF NEW.delivery_agent_id IS NOT NULL THEN
        SELECT is_active INTO v_is_active
        FROM delivery_agents
        WHERE id = NEW.delivery_agent_id;
        
        IF v_is_active IS NULL THEN
            RAISE EXCEPTION 'موزع الطلبية المحدد غير موجود';
        END IF;
        
        IF v_is_active = false THEN
            RAISE EXCEPTION 'موزع الطلبية المحدد غير نشط';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the validation trigger if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_validate_sales_invoice_representatives'
    ) THEN
        CREATE TRIGGER trg_validate_sales_invoice_representatives
            BEFORE INSERT OR UPDATE ON public.sales_invoices
            FOR EACH ROW
            EXECUTE FUNCTION public.validate_sales_invoice_representatives();
    END IF;
END;
$$;

-- 3. Add indexes for representative fields (reporting optimization)
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer_rep 
    ON public.sales_invoices(customer_representative_id) 
    WHERE customer_representative_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_invoices_sales_rep 
    ON public.sales_invoices(sales_representative_id) 
    WHERE sales_representative_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_invoices_delivery_agent 
    ON public.sales_invoices(delivery_agent_id) 
    WHERE delivery_agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_invoices_prevent_return 
    ON public.sales_invoices(prevent_return) 
    WHERE prevent_return = true;

-- 4. Add indexes on representative tables for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_representatives_active 
    ON public.customer_representatives(is_active) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sales_representatives_active 
    ON public.sales_representatives(is_active) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_delivery_agents_active 
    ON public.delivery_agents(is_active) 
    WHERE is_active = true;

-- 5. Create a secure function to check if invoice is returnable (for API-level enforcement)
CREATE OR REPLACE FUNCTION public.check_invoice_returnable(p_invoice_id UUID)
RETURNS TABLE(
    is_returnable BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status TEXT;
    v_prevent_return BOOLEAN;
BEGIN
    SELECT status, prevent_return INTO v_status, v_prevent_return
    FROM sales_invoices
    WHERE id = p_invoice_id;
    
    IF v_status IS NULL THEN
        RETURN QUERY SELECT false, 'الفاتورة غير موجودة'::TEXT;
        RETURN;
    END IF;
    
    IF v_status != 'posted' THEN
        RETURN QUERY SELECT false, 'لا يمكن إرجاع فاتورة غير مرحّلة'::TEXT;
        RETURN;
    END IF;
    
    IF v_prevent_return = true THEN
        RETURN QUERY SELECT false, 'لا يمكن إرجاع هذه الفاتورة لأنها محددة كغير قابلة للإرجاع'::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- 6. Update get_returnable_sales_invoices to ensure prevent_return is never bypassed
CREATE OR REPLACE FUNCTION public.get_returnable_sales_invoices(p_search TEXT DEFAULT NULL)
RETURNS TABLE(
    invoice_id UUID,
    invoice_number TEXT,
    invoice_date DATE,
    customer_name TEXT,
    total_amount NUMERIC,
    has_returns BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.id AS invoice_id,
        si.invoice_number,
        si.invoice_date::DATE,
        COALESCE(c.name, 'عميل نقدي') AS customer_name,
        si.total_amount,
        EXISTS (SELECT 1 FROM sales_returns sr WHERE sr.invoice_id = si.id) AS has_returns
    FROM sales_invoices si
    LEFT JOIN customers c ON si.customer_id = c.id
    WHERE si.status = 'posted'
      AND COALESCE(si.prevent_return, false) = false  -- STRICT: Exclude prevent_return invoices
      AND (
          p_search IS NULL 
          OR si.invoice_number ILIKE '%' || p_search || '%'
          OR c.name ILIKE '%' || p_search || '%'
      )
    ORDER BY si.invoice_date DESC, si.invoice_number DESC
    LIMIT 50;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_invoice_returnable(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_returnable_sales_invoices(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_sales_invoice_representatives() TO authenticated;
