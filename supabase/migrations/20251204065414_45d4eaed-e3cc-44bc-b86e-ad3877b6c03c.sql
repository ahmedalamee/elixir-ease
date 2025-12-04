-- إضافة قيد فريد على جدول erp_account_mappings
-- لمنع تكرار نفس الوحدة والعملية والفرع

-- أولاً: حذف القيد إذا كان موجوداً مسبقاً
ALTER TABLE erp_account_mappings DROP CONSTRAINT IF EXISTS unique_module_operation_branch;

-- إضافة القيد الفريد
ALTER TABLE erp_account_mappings 
ADD CONSTRAINT unique_module_operation_branch 
UNIQUE (module, operation, branch_id);

-- إضافة تعليق توضيحي
COMMENT ON CONSTRAINT unique_module_operation_branch ON erp_account_mappings 
IS 'ضمان عدم تكرار ربط نفس الوحدة والعملية والفرع';