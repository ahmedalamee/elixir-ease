
-- =============================================
-- PURCHASE REQUISITIONS (PR) TABLES
-- =============================================

-- Purchase Requisitions Header
CREATE TABLE public.purchase_requisitions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pr_number TEXT NOT NULL UNIQUE,
    requested_by UUID REFERENCES auth.users(id),
    warehouse_id UUID REFERENCES public.warehouses(id),
    department TEXT,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'converted_to_rfq', 'converted_to_po', 'cancelled')),
    notes TEXT,
    currency_code TEXT DEFAULT 'YER' REFERENCES public.currencies(code),
    exchange_rate NUMERIC(18,6) DEFAULT 1 CHECK (exchange_rate > 0),
    subtotal_fc NUMERIC(18,2) DEFAULT 0,
    discount_fc NUMERIC(18,2) DEFAULT 0,
    tax_fc NUMERIC(18,2) DEFAULT 0,
    total_fc NUMERIC(18,2) DEFAULT 0,
    subtotal_bc NUMERIC(18,2) DEFAULT 0,
    discount_bc NUMERIC(18,2) DEFAULT 0,
    tax_bc NUMERIC(18,2) DEFAULT 0,
    total_bc NUMERIC(18,2) DEFAULT 0,
    required_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id)
);

-- Purchase Requisition Items
CREATE TABLE public.pr_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pr_id UUID NOT NULL REFERENCES public.purchase_requisitions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    uom_id UUID REFERENCES public.uoms(id),
    requested_qty NUMERIC(18,3) NOT NULL CHECK (requested_qty > 0),
    estimated_unit_cost_fc NUMERIC(18,4) DEFAULT 0,
    estimated_unit_cost_bc NUMERIC(18,4) DEFAULT 0,
    line_total_fc NUMERIC(18,2) DEFAULT 0,
    line_total_bc NUMERIC(18,2) DEFAULT 0,
    notes TEXT,
    line_no INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RFQ (Request for Quotation) TABLES
-- =============================================

-- RFQ Requests Header
CREATE TABLE public.rfq_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rfq_number TEXT NOT NULL UNIQUE,
    pr_id UUID REFERENCES public.purchase_requisitions(id),
    warehouse_id UUID REFERENCES public.warehouses(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'quotes_received', 'evaluated', 'awarded', 'cancelled')),
    title TEXT,
    notes TEXT,
    currency_code TEXT DEFAULT 'YER' REFERENCES public.currencies(code),
    submission_deadline DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- RFQ Suppliers (many-to-many: which suppliers are invited)
CREATE TABLE public.rfq_suppliers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rfq_id UUID NOT NULL REFERENCES public.rfq_requests(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    invited_at TIMESTAMPTZ DEFAULT now(),
    response_status TEXT DEFAULT 'pending' CHECK (response_status IN ('pending', 'responded', 'declined', 'no_response')),
    UNIQUE(rfq_id, supplier_id)
);

-- RFQ Quotes (supplier responses)
CREATE TABLE public.rfq_quotes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rfq_id UUID NOT NULL REFERENCES public.rfq_requests(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    quote_number TEXT NOT NULL,
    currency_code TEXT DEFAULT 'YER' REFERENCES public.currencies(code),
    exchange_rate NUMERIC(18,6) DEFAULT 1 CHECK (exchange_rate > 0),
    subtotal_fc NUMERIC(18,2) DEFAULT 0,
    discount_fc NUMERIC(18,2) DEFAULT 0,
    tax_fc NUMERIC(18,2) DEFAULT 0,
    total_fc NUMERIC(18,2) DEFAULT 0,
    subtotal_bc NUMERIC(18,2) DEFAULT 0,
    discount_bc NUMERIC(18,2) DEFAULT 0,
    tax_bc NUMERIC(18,2) DEFAULT 0,
    total_bc NUMERIC(18,2) DEFAULT 0,
    payment_terms TEXT,
    delivery_days INTEGER,
    validity_days INTEGER DEFAULT 30,
    notes TEXT,
    is_winner BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'selected', 'rejected')),
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(rfq_id, supplier_id)
);

-- RFQ Quote Items
CREATE TABLE public.rfq_quote_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES public.rfq_quotes(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    uom_id UUID REFERENCES public.uoms(id),
    quantity NUMERIC(18,3) NOT NULL CHECK (quantity > 0),
    unit_price_fc NUMERIC(18,4) NOT NULL CHECK (unit_price_fc >= 0),
    unit_price_bc NUMERIC(18,4) DEFAULT 0,
    line_total_fc NUMERIC(18,2) DEFAULT 0,
    line_total_bc NUMERIC(18,2) DEFAULT 0,
    notes TEXT,
    line_no INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- APPROVAL WORKFLOW TABLES
-- =============================================

-- Approval Workflows (define workflow templates)
CREATE TABLE public.approval_workflows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_name TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('PR', 'PO', 'PI')),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Approval Steps (define steps within a workflow)
CREATE TABLE public.approval_steps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    approver_role TEXT NOT NULL,
    min_amount NUMERIC(18,2) DEFAULT 0,
    max_amount NUMERIC(18,2),
    warehouse_id UUID REFERENCES public.warehouses(id),
    department TEXT,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workflow_id, step_order)
);

-- Approval Requests (actual approval instances)
CREATE TABLE public.approval_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id),
    document_type TEXT NOT NULL CHECK (document_type IN ('PR', 'PO', 'PI')),
    document_id UUID NOT NULL,
    document_number TEXT,
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'cancelled')),
    requested_by UUID REFERENCES auth.users(id),
    requested_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Approval History (audit trail)
CREATE TABLE public.approval_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
    step_id UUID REFERENCES public.approval_steps(id),
    step_order INTEGER,
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'returned', 'delegated')),
    action_by UUID REFERENCES auth.users(id),
    action_at TIMESTAMPTZ DEFAULT now(),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ADD LINKING COLUMNS TO EXISTING TABLES
-- =============================================

ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS pr_id UUID REFERENCES public.purchase_requisitions(id),
ADD COLUMN IF NOT EXISTS rfq_id UUID REFERENCES public.rfq_requests(id),
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.rfq_quotes(id);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_pr_status ON public.purchase_requisitions(status);
CREATE INDEX idx_pr_requested_by ON public.purchase_requisitions(requested_by);
CREATE INDEX idx_pr_warehouse ON public.purchase_requisitions(warehouse_id);
CREATE INDEX idx_pr_items_pr_id ON public.pr_items(pr_id);
CREATE INDEX idx_rfq_status ON public.rfq_requests(status);
CREATE INDEX idx_rfq_pr_id ON public.rfq_requests(pr_id);
CREATE INDEX idx_rfq_quotes_rfq_id ON public.rfq_quotes(rfq_id);
CREATE INDEX idx_rfq_quotes_supplier ON public.rfq_quotes(supplier_id);
CREATE INDEX idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX idx_approval_requests_doc ON public.approval_requests(document_type, document_id);
CREATE INDEX idx_approval_history_request ON public.approval_history(request_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- PR policies
CREATE POLICY "Staff can view all PRs" ON public.purchase_requisitions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can create PRs" ON public.purchase_requisitions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update draft PRs" ON public.purchase_requisitions
    FOR UPDATE USING (auth.uid() IS NOT NULL AND status = 'draft');

CREATE POLICY "Admin can update any PR" ON public.purchase_requisitions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- PR Items policies
CREATE POLICY "Staff can view PR items" ON public.pr_items
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage PR items" ON public.pr_items
    FOR ALL USING (auth.uid() IS NOT NULL);

-- RFQ policies
CREATE POLICY "Staff can view RFQs" ON public.rfq_requests
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage RFQs" ON public.rfq_requests
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can view RFQ suppliers" ON public.rfq_suppliers
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage RFQ suppliers" ON public.rfq_suppliers
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can view quotes" ON public.rfq_quotes
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage quotes" ON public.rfq_quotes
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can view quote items" ON public.rfq_quote_items
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage quote items" ON public.rfq_quote_items
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Approval policies
CREATE POLICY "Staff can view workflows" ON public.approval_workflows
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage workflows" ON public.approval_workflows
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Staff can view steps" ON public.approval_steps
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage steps" ON public.approval_steps
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Staff can view approval requests" ON public.approval_requests
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage approval requests" ON public.approval_requests
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can view approval history" ON public.approval_history
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can add approval history" ON public.approval_history
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- BACKEND FUNCTIONS
-- =============================================

-- Generate PR Number
CREATE OR REPLACE FUNCTION public.generate_pr_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year TEXT;
    v_seq INTEGER;
    v_number TEXT;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(NULLIF(regexp_replace(pr_number, '[^0-9]', '', 'g'), '') AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM purchase_requisitions
    WHERE pr_number LIKE 'PR-' || v_year || '-%';
    
    v_number := 'PR-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
    RETURN v_number;
END;
$$;

-- Generate RFQ Number
CREATE OR REPLACE FUNCTION public.generate_rfq_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year TEXT;
    v_seq INTEGER;
    v_number TEXT;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(NULLIF(regexp_replace(rfq_number, '[^0-9]', '', 'g'), '') AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM rfq_requests
    WHERE rfq_number LIKE 'RFQ-' || v_year || '-%';
    
    v_number := 'RFQ-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
    RETURN v_number;
END;
$$;

-- Submit PR
CREATE OR REPLACE FUNCTION public.submit_pr(p_pr_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pr RECORD;
    v_workflow_id UUID;
    v_total_steps INTEGER;
BEGIN
    SELECT * INTO v_pr FROM purchase_requisitions WHERE id = p_pr_id;
    
    IF v_pr IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'PR not found');
    END IF;
    
    IF v_pr.status != 'draft' THEN
        RETURN jsonb_build_object('success', false, 'error', 'PR is not in draft status');
    END IF;
    
    SELECT id INTO v_workflow_id 
    FROM approval_workflows 
    WHERE document_type = 'PR' AND is_active = true
    LIMIT 1;
    
    IF v_workflow_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_total_steps FROM approval_steps WHERE workflow_id = v_workflow_id;
        
        INSERT INTO approval_requests (
            workflow_id, document_type, document_id, document_number,
            total_steps, status, requested_by
        ) VALUES (
            v_workflow_id, 'PR', p_pr_id, v_pr.pr_number,
            v_total_steps, 'pending', auth.uid()
        );
        
        UPDATE purchase_requisitions 
        SET status = 'submitted', updated_at = now()
        WHERE id = p_pr_id;
    ELSE
        UPDATE purchase_requisitions 
        SET status = 'approved', 
            approved_at = now(), 
            approved_by = auth.uid(),
            updated_at = now()
        WHERE id = p_pr_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'pr_id', p_pr_id);
END;
$$;

-- Convert PR to RFQ
CREATE OR REPLACE FUNCTION public.convert_pr_to_rfq(p_pr_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pr RECORD;
    v_rfq_id UUID;
    v_rfq_number TEXT;
BEGIN
    SELECT * INTO v_pr FROM purchase_requisitions WHERE id = p_pr_id;
    
    IF v_pr IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'PR not found');
    END IF;
    
    IF v_pr.status != 'approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'PR must be approved first');
    END IF;
    
    v_rfq_number := generate_rfq_number();
    
    INSERT INTO rfq_requests (
        rfq_number, pr_id, warehouse_id, currency_code, created_by
    ) VALUES (
        v_rfq_number, p_pr_id, v_pr.warehouse_id, v_pr.currency_code, auth.uid()
    ) RETURNING id INTO v_rfq_id;
    
    UPDATE purchase_requisitions 
    SET status = 'converted_to_rfq', updated_at = now()
    WHERE id = p_pr_id;
    
    RETURN jsonb_build_object('success', true, 'rfq_id', v_rfq_id, 'rfq_number', v_rfq_number);
END;
$$;

-- Convert PR directly to PO
CREATE OR REPLACE FUNCTION public.convert_pr_to_po(
    p_pr_id UUID,
    p_supplier_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pr RECORD;
    v_po_id UUID;
    v_po_number TEXT;
    v_item RECORD;
BEGIN
    SELECT * INTO v_pr FROM purchase_requisitions WHERE id = p_pr_id;
    
    IF v_pr IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'PR not found');
    END IF;
    
    IF v_pr.status NOT IN ('approved', 'converted_to_rfq') THEN
        RETURN jsonb_build_object('success', false, 'error', 'PR must be approved');
    END IF;
    
    v_po_number := generate_po_number();
    
    INSERT INTO purchase_orders (
        po_number, supplier_id, warehouse_id, currency_code, exchange_rate,
        subtotal_fc, discount_fc, tax_fc, total_fc,
        subtotal_bc, discount_bc, tax_bc, total_bc,
        pr_id, status, created_by
    ) VALUES (
        v_po_number, p_supplier_id, v_pr.warehouse_id, v_pr.currency_code, v_pr.exchange_rate,
        v_pr.subtotal_fc, v_pr.discount_fc, v_pr.tax_fc, v_pr.total_fc,
        v_pr.subtotal_bc, v_pr.discount_bc, v_pr.tax_bc, v_pr.total_bc,
        p_pr_id, 'draft', auth.uid()
    ) RETURNING id INTO v_po_id;
    
    FOR v_item IN SELECT * FROM pr_items WHERE pr_id = p_pr_id
    LOOP
        INSERT INTO po_items (
            po_id, item_id, uom_id, quantity, unit_price_fc, unit_price_bc,
            line_total_fc, line_total_bc, line_no
        ) VALUES (
            v_po_id, v_item.product_id, v_item.uom_id, v_item.requested_qty,
            v_item.estimated_unit_cost_fc, v_item.estimated_unit_cost_bc,
            v_item.line_total_fc, v_item.line_total_bc, v_item.line_no
        );
    END LOOP;
    
    UPDATE purchase_requisitions 
    SET status = 'converted_to_po', updated_at = now()
    WHERE id = p_pr_id;
    
    RETURN jsonb_build_object('success', true, 'po_id', v_po_id, 'po_number', v_po_number);
END;
$$;

-- Convert Quote to PO
CREATE OR REPLACE FUNCTION public.convert_quote_to_po(p_quote_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quote RECORD;
    v_rfq RECORD;
    v_po_id UUID;
    v_po_number TEXT;
    v_item RECORD;
BEGIN
    SELECT q.*, s.name as supplier_name 
    INTO v_quote 
    FROM rfq_quotes q
    JOIN suppliers s ON s.id = q.supplier_id
    WHERE q.id = p_quote_id;
    
    IF v_quote IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quote not found');
    END IF;
    
    SELECT * INTO v_rfq FROM rfq_requests WHERE id = v_quote.rfq_id;
    
    UPDATE rfq_quotes SET is_winner = false WHERE rfq_id = v_quote.rfq_id;
    UPDATE rfq_quotes SET is_winner = true, status = 'selected' WHERE id = p_quote_id;
    
    v_po_number := generate_po_number();
    
    INSERT INTO purchase_orders (
        po_number, supplier_id, warehouse_id, currency_code, exchange_rate,
        subtotal_fc, discount_fc, tax_fc, total_fc,
        subtotal_bc, discount_bc, tax_bc, total_bc,
        rfq_id, quote_id, status, created_by
    ) VALUES (
        v_po_number, v_quote.supplier_id, v_rfq.warehouse_id, 
        v_quote.currency_code, v_quote.exchange_rate,
        v_quote.subtotal_fc, v_quote.discount_fc, v_quote.tax_fc, v_quote.total_fc,
        v_quote.subtotal_bc, v_quote.discount_bc, v_quote.tax_bc, v_quote.total_bc,
        v_rfq.id, p_quote_id, 'draft', auth.uid()
    ) RETURNING id INTO v_po_id;
    
    FOR v_item IN SELECT * FROM rfq_quote_items WHERE quote_id = p_quote_id
    LOOP
        INSERT INTO po_items (
            po_id, item_id, uom_id, quantity, unit_price_fc, unit_price_bc,
            line_total_fc, line_total_bc, line_no
        ) VALUES (
            v_po_id, v_item.product_id, v_item.uom_id, v_item.quantity,
            v_item.unit_price_fc, v_item.unit_price_bc,
            v_item.line_total_fc, v_item.line_total_bc, v_item.line_no
        );
    END LOOP;
    
    UPDATE rfq_requests SET status = 'awarded', updated_at = now() WHERE id = v_quote.rfq_id;
    
    IF v_rfq.pr_id IS NOT NULL THEN
        UPDATE purchase_requisitions 
        SET status = 'converted_to_po', updated_at = now()
        WHERE id = v_rfq.pr_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'po_id', v_po_id, 'po_number', v_po_number);
END;
$$;

-- Approve Step
CREATE OR REPLACE FUNCTION public.approve_approval_step(
    p_request_id UUID,
    p_comments TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_step RECORD;
    v_user_role TEXT;
BEGIN
    SELECT * INTO v_request FROM approval_requests WHERE id = p_request_id;
    
    IF v_request IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;
    
    IF v_request.status NOT IN ('pending', 'in_progress') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request already completed');
    END IF;
    
    SELECT * INTO v_step 
    FROM approval_steps 
    WHERE workflow_id = v_request.workflow_id AND step_order = v_request.current_step;
    
    SELECT role INTO v_user_role 
    FROM user_roles 
    WHERE user_id = auth.uid() AND role = v_step.approver_role;
    
    IF v_user_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to approve this step');
    END IF;
    
    INSERT INTO approval_history (
        request_id, step_id, step_order, action, action_by, comments
    ) VALUES (
        p_request_id, v_step.id, v_step.step_order, 'approved', auth.uid(), p_comments
    );
    
    IF v_request.current_step < v_request.total_steps THEN
        UPDATE approval_requests 
        SET current_step = current_step + 1, status = 'in_progress', updated_at = now()
        WHERE id = p_request_id;
    ELSE
        UPDATE approval_requests 
        SET status = 'approved', completed_at = now(), updated_at = now()
        WHERE id = p_request_id;
        
        IF v_request.document_type = 'PR' THEN
            UPDATE purchase_requisitions 
            SET status = 'approved', approved_at = now(), approved_by = auth.uid()
            WHERE id = v_request.document_id;
        ELSIF v_request.document_type = 'PO' THEN
            UPDATE purchase_orders 
            SET status = 'approved', approved_at = now(), approved_by = auth.uid()
            WHERE id = v_request.document_id;
        END IF;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'step', v_request.current_step);
END;
$$;

-- Reject Approval Request
CREATE OR REPLACE FUNCTION public.reject_approval_request(
    p_request_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_step RECORD;
BEGIN
    SELECT * INTO v_request FROM approval_requests WHERE id = p_request_id;
    
    IF v_request IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;
    
    SELECT * INTO v_step 
    FROM approval_steps 
    WHERE workflow_id = v_request.workflow_id AND step_order = v_request.current_step;
    
    INSERT INTO approval_history (
        request_id, step_id, step_order, action, action_by, comments
    ) VALUES (
        p_request_id, v_step.id, v_step.step_order, 'rejected', auth.uid(), p_reason
    );
    
    UPDATE approval_requests 
    SET status = 'rejected', completed_at = now(), updated_at = now()
    WHERE id = p_request_id;
    
    IF v_request.document_type = 'PR' THEN
        UPDATE purchase_requisitions SET status = 'rejected' WHERE id = v_request.document_id;
    ELSIF v_request.document_type = 'PO' THEN
        UPDATE purchase_orders SET status = 'rejected' WHERE id = v_request.document_id;
    END IF;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_pr_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_requisitions_timestamp
    BEFORE UPDATE ON public.purchase_requisitions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pr_timestamp();

CREATE TRIGGER update_rfq_requests_timestamp
    BEFORE UPDATE ON public.rfq_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pr_timestamp();

CREATE TRIGGER update_rfq_quotes_timestamp
    BEFORE UPDATE ON public.rfq_quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pr_timestamp();
