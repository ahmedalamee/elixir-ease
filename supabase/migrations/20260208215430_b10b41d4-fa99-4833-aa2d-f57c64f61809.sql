
-- Fix trg_protect_free_quantity to use correct column names
CREATE OR REPLACE FUNCTION public.trg_protect_free_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Allow system functions to update free_quantity
  IF current_setting('app.current_function', true) IN (
    'post_purchase_invoice',
    'post_purchase_return',
    'convert_free_stock',
    'post_stock_adjustment'
  ) THEN
    RETURN NEW;
  END IF;

  -- Check if free_quantity is being modified
  IF TG_OP = 'UPDATE' AND OLD.free_quantity IS DISTINCT FROM NEW.free_quantity THEN
    -- Log the violation with correct column names
    INSERT INTO erp_violation_log (
      violation_type,
      attempted_action,
      table_name,
      record_id,
      old_data,
      new_data,
      blocked_reason,
      user_id
    ) VALUES (
      'manual_free_stock_modification',
      'UPDATE',
      'warehouse_stock',
      NEW.item_id::text || ':' || NEW.warehouse_id::text,
      jsonb_build_object('free_quantity', OLD.free_quantity),
      jsonb_build_object('free_quantity', NEW.free_quantity),
      'محاولة تعديل المخزون المجاني يدوياً - مخالفة لقواعد ERP',
      auth.uid()
    );
    
    RAISE EXCEPTION 'لا يمكن تعديل الكمية المجانية يدوياً. استخدم فواتير الشراء أو التسويات المعتمدة.';
  END IF;

  RETURN NEW;
END;
$function$;
