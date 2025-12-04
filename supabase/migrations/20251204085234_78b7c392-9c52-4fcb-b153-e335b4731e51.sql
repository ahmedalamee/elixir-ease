
-- إضافة ربط حسابات COGS إذا لم يكن موجوداً
INSERT INTO erp_account_mappings (module, operation, notes, debit_account_id, credit_account_id, is_active)
SELECT 'sales', 'cogs', 'تكلفة البضاعة المباعة', 
  (SELECT id FROM gl_accounts WHERE account_code = '5110' LIMIT 1),
  (SELECT id FROM gl_accounts WHERE account_code = '1310' LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM erp_account_mappings WHERE module = 'sales' AND operation = 'cogs'
);

INSERT INTO erp_account_mappings (module, operation, notes, debit_account_id, credit_account_id, is_active)
SELECT 'sales', 'accounts_receivable', 'الذمم المدينة', 
  (SELECT id FROM gl_accounts WHERE account_code = '1210' LIMIT 1),
  NULL,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM erp_account_mappings WHERE module = 'sales' AND operation = 'accounts_receivable'
);
