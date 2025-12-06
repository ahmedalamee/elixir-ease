-- إنشاء حساب نقدية بالريال السعودي
INSERT INTO gl_accounts (
  account_code, account_name, account_name_en, account_type, 
  parent_account_id, is_active, is_header, currency, description
) VALUES (
  '1112', 'النقدية بالريال السعودي', 'Cash - SAR', 'asset',
  (SELECT id FROM gl_accounts WHERE account_code = '1110'),
  true, false, 'SAR', 'حساب النقدية بالريال السعودي'
) ON CONFLICT (account_code) DO NOTHING;

-- ربط صندوق SAR بالحساب الجديد
UPDATE cash_boxes 
SET gl_account_id = (SELECT id FROM gl_accounts WHERE account_code = '1112')
WHERE box_code = 'CB-SAR-001' AND gl_account_id IS NULL;