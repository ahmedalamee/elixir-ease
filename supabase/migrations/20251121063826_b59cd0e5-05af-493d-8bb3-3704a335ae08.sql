-- إنشاء حسابات محاسبية افتراضية للنظام

-- 1. حساب الذمم المدينة (Accounts Receivable)
INSERT INTO gl_accounts (account_code, account_name, account_name_en, account_type, is_active, is_header)
VALUES ('1210', 'الذمم المدينة - العملاء', 'Accounts Receivable - Customers', 'asset', true, false)
ON CONFLICT (account_code) DO NOTHING;

-- 2. حساب إيرادات المبيعات (Sales Revenue)
INSERT INTO gl_accounts (account_code, account_name, account_name_en, account_type, is_active, is_header)
VALUES ('4010', 'إيرادات المبيعات', 'Sales Revenue', 'revenue', true, false)
ON CONFLICT (account_code) DO NOTHING;

-- 3. حساب ضريبة القيمة المضافة المستحقة (VAT Payable)
INSERT INTO gl_accounts (account_code, account_name, account_name_en, account_type, is_active, is_header)
VALUES ('2310', 'ضريبة القيمة المضافة المستحقة', 'VAT Payable', 'liability', true, false)
ON CONFLICT (account_code) DO NOTHING;

-- 4. حساب تكلفة البضاعة المباعة (Cost of Goods Sold)
INSERT INTO gl_accounts (account_code, account_name, account_name_en, account_type, is_active, is_header)
VALUES ('5010', 'تكلفة البضاعة المباعة', 'Cost of Goods Sold', 'expense', true, false)
ON CONFLICT (account_code) DO NOTHING;

-- 5. حساب المخزون (Inventory)
INSERT INTO gl_accounts (account_code, account_name, account_name_en, account_type, is_active, is_header)
VALUES ('1310', 'المخزون', 'Inventory', 'asset', true, false)
ON CONFLICT (account_code) DO NOTHING;

-- 6. حساب النقدية (Cash)
INSERT INTO gl_accounts (account_code, account_name, account_name_en, account_type, is_active, is_header)
VALUES ('1110', 'النقدية بالصندوق', 'Cash on Hand', 'asset', true, false)
ON CONFLICT (account_code) DO NOTHING;

-- 7. حساب الذمم الدائنة (Accounts Payable)
INSERT INTO gl_accounts (account_code, account_name, account_name_en, account_type, is_active, is_header)
VALUES ('2110', 'الذمم الدائنة - الموردين', 'Accounts Payable - Suppliers', 'liability', true, false)
ON CONFLICT (account_code) DO NOTHING;

-- 8. حساب المشتريات (Purchases)
INSERT INTO gl_accounts (account_code, account_name, account_name_en, account_type, is_active, is_header)
VALUES ('5020', 'المشتريات', 'Purchases', 'expense', true, false)
ON CONFLICT (account_code) DO NOTHING;