-- Fix approve_approval_step function to handle type mismatch
CREATE OR REPLACE FUNCTION public.approve_approval_step(p_request_id UUID, p_comments TEXT DEFAULT NULL)
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
    
    -- Cast app_role enum to text for comparison
    SELECT role::text INTO v_user_role 
    FROM user_roles 
    WHERE user_id = auth.uid() AND role::text = v_step.approver_role;
    
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