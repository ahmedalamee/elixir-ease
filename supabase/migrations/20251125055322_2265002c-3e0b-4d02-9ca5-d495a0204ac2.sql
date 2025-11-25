-- ==========================================
-- المحور الثاني: تكامل المحاسبة الشامل
-- ==========================================

-- دالة لتوليد الميزانية العمومية (Balance Sheet)
CREATE OR REPLACE FUNCTION get_balance_sheet(p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_assets JSON;
  v_liabilities JSON;
  v_equity JSON;
BEGIN
  -- حساب الأصول (Assets)
  SELECT json_build_object(
    'current_assets', (
      SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.entry_id
      JOIN gl_accounts ga ON ga.id = jel.account_id
      WHERE je.status = 'posted'
        AND je.entry_date <= p_as_of_date
        AND ga.account_type = 'asset'
        AND ga.account_code LIKE '1-1%'
    ),
    'fixed_assets', (
      SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.entry_id
      JOIN gl_accounts ga ON ga.id = jel.account_id
      WHERE je.status = 'posted'
        AND je.entry_date <= p_as_of_date
        AND ga.account_type = 'asset'
        AND ga.account_code LIKE '1-2%'
    ),
    'total_assets', (
      SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.entry_id
      JOIN gl_accounts ga ON ga.id = jel.account_id
      WHERE je.status = 'posted'
        AND je.entry_date <= p_as_of_date
        AND ga.account_type = 'asset'
    )
  ) INTO v_assets;

  -- حساب الخصوم (Liabilities)
  SELECT json_build_object(
    'current_liabilities', (
      SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.entry_id
      JOIN gl_accounts ga ON ga.id = jel.account_id
      WHERE je.status = 'posted'
        AND je.entry_date <= p_as_of_date
        AND ga.account_type = 'liability'
        AND ga.account_code LIKE '2-1%'
    ),
    'long_term_liabilities', (
      SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.entry_id
      JOIN gl_accounts ga ON ga.id = jel.account_id
      WHERE je.status = 'posted'
        AND je.entry_date <= p_as_of_date
        AND ga.account_type = 'liability'
        AND ga.account_code LIKE '2-2%'
    ),
    'total_liabilities', (
      SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.entry_id
      JOIN gl_accounts ga ON ga.id = jel.account_id
      WHERE je.status = 'posted'
        AND je.entry_date <= p_as_of_date
        AND ga.account_type = 'liability'
    )
  ) INTO v_liabilities;

  -- حساب حقوق الملكية (Equity)
  SELECT json_build_object(
    'capital', (
      SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.entry_id
      JOIN gl_accounts ga ON ga.id = jel.account_id
      WHERE je.status = 'posted'
        AND je.entry_date <= p_as_of_date
        AND ga.account_type = 'equity'
        AND ga.account_code LIKE '3-1%'
    ),
    'retained_earnings', (
      SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.entry_id
      JOIN gl_accounts ga ON ga.id = jel.account_id
      WHERE je.status = 'posted'
        AND je.entry_date <= p_as_of_date
        AND ga.account_type IN ('revenue', 'expense')
    ),
    'total_equity', (
      SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.entry_id
      JOIN gl_accounts ga ON ga.id = jel.account_id
      WHERE je.status = 'posted'
        AND je.entry_date <= p_as_of_date
        AND ga.account_type = 'equity'
    )
  ) INTO v_equity;

  -- تجميع النتيجة النهائية
  v_result := json_build_object(
    'as_of_date', p_as_of_date,
    'assets', v_assets,
    'liabilities', v_liabilities,
    'equity', v_equity,
    'total_liabilities_and_equity', 
      (v_liabilities->>'total_liabilities')::NUMERIC + 
      (v_equity->>'total_equity')::NUMERIC
  );

  RETURN v_result;
END;
$$;

-- دالة للحصول على قائمة الدخل الشاملة
CREATE OR REPLACE FUNCTION get_comprehensive_income_statement(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_revenue NUMERIC;
  v_cogs NUMERIC;
  v_gross_profit NUMERIC;
  v_operating_expenses NUMERIC;
  v_operating_profit NUMERIC;
  v_other_income NUMERIC;
  v_other_expenses NUMERIC;
  v_net_profit NUMERIC;
BEGIN
  -- إجمالي الإيرادات
  SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
  INTO v_revenue
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.entry_id
  JOIN gl_accounts ga ON ga.id = jel.account_id
  WHERE je.status = 'posted'
    AND je.entry_date BETWEEN p_start_date AND p_end_date
    AND ga.account_type = 'revenue'
    AND ga.account_code LIKE '4-1%';

  -- تكلفة البضاعة المباعة
  SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
  INTO v_cogs
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.entry_id
  JOIN gl_accounts ga ON ga.id = jel.account_id
  WHERE je.status = 'posted'
    AND je.entry_date BETWEEN p_start_date AND p_end_date
    AND ga.account_code LIKE '5-1%';

  -- مجمل الربح
  v_gross_profit := v_revenue - v_cogs;

  -- المصروفات التشغيلية
  SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
  INTO v_operating_expenses
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.entry_id
  JOIN gl_accounts ga ON ga.id = jel.account_id
  WHERE je.status = 'posted'
    AND je.entry_date BETWEEN p_start_date AND p_end_date
    AND ga.account_type = 'expense'
    AND ga.account_code LIKE '5-2%';

  -- الربح التشغيلي
  v_operating_profit := v_gross_profit - v_operating_expenses;

  -- الإيرادات الأخرى
  SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
  INTO v_other_income
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.entry_id
  JOIN gl_accounts ga ON ga.id = jel.account_id
  WHERE je.status = 'posted'
    AND je.entry_date BETWEEN p_start_date AND p_end_date
    AND ga.account_code LIKE '4-2%';

  -- المصروفات الأخرى
  SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
  INTO v_other_expenses
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.entry_id
  JOIN gl_accounts ga ON ga.id = jel.account_id
  WHERE je.status = 'posted'
    AND je.entry_date BETWEEN p_start_date AND p_end_date
    AND ga.account_code LIKE '5-3%';

  -- صافي الربح
  v_net_profit := v_operating_profit + v_other_income - v_other_expenses;

  -- تجميع النتيجة
  v_result := json_build_object(
    'period', json_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'revenue', v_revenue,
    'cost_of_goods_sold', v_cogs,
    'gross_profit', v_gross_profit,
    'gross_profit_margin', 
      CASE WHEN v_revenue > 0 THEN ROUND((v_gross_profit / v_revenue) * 100, 2) ELSE 0 END,
    'operating_expenses', v_operating_expenses,
    'operating_profit', v_operating_profit,
    'operating_profit_margin',
      CASE WHEN v_revenue > 0 THEN ROUND((v_operating_profit / v_revenue) * 100, 2) ELSE 0 END,
    'other_income', v_other_income,
    'other_expenses', v_other_expenses,
    'net_profit', v_net_profit,
    'net_profit_margin',
      CASE WHEN v_revenue > 0 THEN ROUND((v_net_profit / v_revenue) * 100, 2) ELSE 0 END
  );

  RETURN v_result;
END;
$$;

-- ==========================================
-- المحور الثالث: نظام الأحداث المتقدم
-- ==========================================

-- دالة لمعالجة أحداث النظام تلقائياً
CREATE OR REPLACE FUNCTION process_system_events()
RETURNS TABLE(
  event_id UUID,
  event_type TEXT,
  processed BOOLEAN,
  result TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event RECORD;
BEGIN
  -- معالجة الأحداث غير المعالجة
  FOR v_event IN 
    SELECT * FROM system_events 
    WHERE processed = FALSE 
    ORDER BY triggered_at ASC
    LIMIT 100
  LOOP
    BEGIN
      -- معالجة الحدث بناءً على نوعه
      CASE v_event.event_type
        WHEN 'low_stock_alert' THEN
          -- إنشاء تنبيه للمخزون المنخفض
          INSERT INTO stock_integration_log (
            transaction_type,
            reference_type,
            status,
            message
          ) VALUES (
            'alert',
            'low_stock',
            'warning',
            'تنبيه: منتج ' || (v_event.event_data->>'product_name') || ' وصل لمستوى إعادة الطلب'
          );

        WHEN 'invoice_posted' THEN
          -- تسجيل حدث ترحيل الفاتورة
          INSERT INTO accounting_integration_log (
            document_type,
            document_id,
            document_number,
            total_debit,
            total_credit,
            status
          ) VALUES (
            v_event.event_data->>'document_type',
            (v_event.event_data->>'document_id')::UUID,
            v_event.event_data->>'document_number',
            (v_event.event_data->>'total_amount')::NUMERIC,
            (v_event.event_data->>'total_amount')::NUMERIC,
            'success'
          );

        WHEN 'batch_expiring_soon' THEN
          -- تنبيه لدفعة قريبة من انتهاء الصلاحية
          INSERT INTO stock_integration_log (
            transaction_type,
            reference_type,
            status,
            message
          ) VALUES (
            'alert',
            'batch_expiry',
            'warning',
            'تحذير: دفعة ' || (v_event.event_data->>'batch_number') || ' ستنتهي صلاحيتها في ' || (v_event.event_data->>'days_remaining') || ' يوم'
          );

        ELSE
          -- حدث غير معروف
          NULL;
      END CASE;

      -- تحديث حالة الحدث إلى "معالج"
      UPDATE system_events
      SET processed = TRUE,
          processed_at = NOW()
      WHERE id = v_event.id;

      -- إرجاع نتيجة المعالجة
      event_id := v_event.id;
      event_type := v_event.event_type;
      processed := TRUE;
      result := 'success';
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      -- تسجيل الخطأ
      UPDATE system_events
      SET error_message = SQLERRM
      WHERE id = v_event.id;

      event_id := v_event.id;
      event_type := v_event.event_type;
      processed := FALSE;
      result := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- ==========================================
-- المحور الرابع: نظام الصلاحيات المتقدم
-- ==========================================

-- دالة للحصول على صلاحيات المستخدم الشاملة
CREATE OR REPLACE FUNCTION get_user_comprehensive_permissions(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_roles JSON;
  v_permissions JSON;
  v_activity_summary JSON;
BEGIN
  -- الحصول على أدوار المستخدم
  SELECT json_agg(json_build_object(
    'role', ur.role,
    'assigned_at', ur.created_at
  ))
  INTO v_roles
  FROM user_roles ur
  WHERE ur.user_id = p_user_id;

  -- الحصول على صلاحيات المستخدم من الأدوار المخصصة
  SELECT json_agg(DISTINCT json_build_object(
    'permission_key', p.permission_key,
    'permission_name', p.name,
    'category', p.category,
    'description', p.description
  ))
  INTO v_permissions
  FROM user_custom_roles ucr
  JOIN role_permissions rp ON rp.role_id = ucr.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ucr.user_id = p_user_id
    AND p.is_active = TRUE;

  -- ملخص نشاط المستخدم
  SELECT json_build_object(
    'total_actions', COUNT(*),
    'last_activity', MAX(created_at),
    'actions_by_module', (
      SELECT json_object_agg(module, count)
      FROM (
        SELECT module, COUNT(*) as count
        FROM user_activity_log
        WHERE user_id = p_user_id
        GROUP BY module
      ) module_counts
    )
  )
  INTO v_activity_summary
  FROM user_activity_log
  WHERE user_id = p_user_id;

  -- تجميع النتيجة
  v_result := json_build_object(
    'user_id', p_user_id,
    'roles', COALESCE(v_roles, '[]'::JSON),
    'permissions', COALESCE(v_permissions, '[]'::JSON),
    'activity_summary', COALESCE(v_activity_summary, '{}'::JSON)
  );

  RETURN v_result;
END;
$$;

-- دالة لتسجيل نشاط المستخدم المحسنة
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_module TEXT DEFAULT 'general',
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO user_activity_log (
    user_id,
    action,
    resource_type,
    resource_id,
    module,
    details,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_module,
    p_details,
    p_ip_address,
    p_user_agent,
    NOW()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION get_balance_sheet IS 'دالة لتوليد الميزانية العمومية في تاريخ محدد';
COMMENT ON FUNCTION get_comprehensive_income_statement IS 'دالة لتوليد قائمة الدخل الشاملة لفترة محددة';
COMMENT ON FUNCTION process_system_events IS 'دالة لمعالجة أحداث النظام تلقائياً';
COMMENT ON FUNCTION get_user_comprehensive_permissions IS 'دالة للحصول على صلاحيات المستخدم الشاملة مع ملخص النشاط';