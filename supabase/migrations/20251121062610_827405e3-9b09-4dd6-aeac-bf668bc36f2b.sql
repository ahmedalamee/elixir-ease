-- تحديث دالة توليد رقم فاتورة المبيعات لمعالجة الأرقام غير القياسية
CREATE OR REPLACE FUNCTION public.generate_si_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix TEXT;
  v_next_number INTEGER;
  v_number_length INTEGER;
  v_max_existing_number INTEGER;
  v_result TEXT;
  v_attempt INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  -- محاولة الحصول على القاعدة النشطة
  SELECT prefix, next_number, number_length 
  INTO v_prefix, v_next_number, v_number_length
  FROM document_numbering_rules
  WHERE document_type = 'sales_invoice' 
    AND is_active = true
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    -- إنشاء قاعدة افتراضية إذا لم توجد
    INSERT INTO document_numbering_rules (
      document_type,
      prefix,
      next_number,
      number_length,
      is_active,
      description
    ) VALUES (
      'sales_invoice',
      'SI-',
      1,
      6,
      true,
      'أرقام فواتير المبيعات'
    )
    RETURNING prefix, next_number, number_length 
    INTO v_prefix, v_next_number, v_number_length;
  END IF;

  -- البحث عن آخر رقم فاتورة موجود بالشكل الصحيح (أرقام فقط بعد البادئة)
  SELECT COALESCE(MAX(num), 0) INTO v_max_existing_number
  FROM (
    SELECT 
      CASE 
        WHEN invoice_number ~ ('^' || v_prefix || '[0-9]+$')
        THEN CAST(SUBSTRING(invoice_number FROM LENGTH(v_prefix) + 1) AS INTEGER)
        ELSE 0
      END as num
    FROM sales_invoices
    WHERE invoice_number LIKE v_prefix || '%'
  ) valid_numbers;

  -- استخدام الأكبر بين next_number والرقم الأخير الموجود + 1
  IF v_max_existing_number >= v_next_number THEN
    v_next_number := v_max_existing_number + 1;
  END IF;

  -- محاولة توليد رقم فريد (مع حلقة للتأكد)
  LOOP
    EXIT WHEN v_attempt > 100; -- حماية من حلقة لا نهائية
    
    -- توليد الرقم
    v_result := v_prefix || LPAD(v_next_number::TEXT, v_number_length, '0');
    
    -- التحقق من عدم وجود الرقم
    SELECT EXISTS (
      SELECT 1 FROM sales_invoices WHERE invoice_number = v_result
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists; -- إذا الرقم غير موجود، اخرج من الحلقة
    
    v_next_number := v_next_number + 1;
    v_attempt := v_attempt + 1;
  END LOOP;

  IF v_attempt > 100 THEN
    RAISE EXCEPTION 'فشل في توليد رقم فاتورة فريد بعد 100 محاولة';
  END IF;

  -- تحديث العداد بالرقم التالي
  UPDATE document_numbering_rules
  SET next_number = v_next_number + 1,
      updated_at = NOW()
  WHERE document_type = 'sales_invoice' 
    AND is_active = true;

  RETURN v_result;
END;
$function$;