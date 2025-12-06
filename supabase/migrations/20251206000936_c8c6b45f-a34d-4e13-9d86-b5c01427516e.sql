-- Fix remaining 3 functions with search_path

-- 1. Fix audit_trigger_func
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 2. Fix calculate_base_currency_purchase
CREATE OR REPLACE FUNCTION public.calculate_base_currency_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- حساب المبلغ بالعملة الأساسية (YER)
  NEW.base_currency_total := public.convert_currency(
    NEW.total_amount,
    NEW.currency_code,
    'YER',
    NEW.invoice_date
  );
  
  -- إذا لم يكن هناك سعر صرف محدد، احصل عليه
  IF NEW.exchange_rate IS NULL OR NEW.exchange_rate = 0 THEN
    NEW.exchange_rate := public.get_exchange_rate(
      NEW.currency_code,
      'YER',
      NEW.invoice_date
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Fix calculate_base_currency_sales
CREATE OR REPLACE FUNCTION public.calculate_base_currency_sales()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- حساب المبلغ بالعملة الأساسية (YER)
  NEW.base_currency_total := public.convert_currency(
    NEW.total_amount,
    NEW.currency_code,
    'YER',
    NEW.invoice_date
  );
  
  -- إذا لم يكن هناك سعر صرف محدد، احصل عليه
  IF NEW.exchange_rate IS NULL OR NEW.exchange_rate = 0 THEN
    NEW.exchange_rate := public.get_exchange_rate(
      NEW.currency_code,
      'YER',
      NEW.invoice_date
    );
  END IF;
  
  RETURN NEW;
END;
$$;