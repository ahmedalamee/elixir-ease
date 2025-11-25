
-- ========================================
-- نظام إدارة الصلاحيات المتقدم
-- ========================================

-- 1. جدول الأدوار (Roles)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE,
  role_name_en TEXT,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false, -- الأدوار الافتراضية (admin, pharmacist, etc.)
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. جدول الصلاحيات (Permissions)
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL UNIQUE, -- مفتاح فريد مثل "sales.create_invoice"
  permission_name TEXT NOT NULL,
  permission_name_en TEXT,
  description TEXT,
  category TEXT NOT NULL, -- sales, customers, inventory, settings
  subcategory TEXT, -- للتقسيم الفرعي
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. جدول ربط الأدوار بالصلاحيات (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(role_id, permission_id)
);

-- 4. جدول ربط المستخدمين بالأدوار المخصصة
CREATE TABLE IF NOT EXISTS public.user_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, role_id)
);

-- ========================================
-- Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(role_name);
CREATE INDEX IF NOT EXISTS idx_roles_active ON public.roles(is_active);

CREATE INDEX IF NOT EXISTS idx_permissions_key ON public.permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON public.permissions(is_active);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_user_custom_roles_user ON public.user_custom_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_roles_role ON public.user_custom_roles(role_id);

-- ========================================
-- Triggers
-- ========================================

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- دالة للتحقق من وجود صلاحية لمستخدم
-- ========================================

CREATE OR REPLACE FUNCTION public.user_has_permission(
  _user_id UUID,
  _permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- التحقق من الصلاحية عبر user_roles (الأدوار القديمة)
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'::app_role
  ) THEN
    RETURN true; -- المدير لديه جميع الصلاحيات
  END IF;
  
  -- التحقق من الصلاحية عبر الأدوار المخصصة
  RETURN EXISTS (
    SELECT 1
    FROM public.user_custom_roles ucr
    JOIN public.role_permissions rp ON ucr.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ucr.user_id = _user_id
      AND p.permission_key = _permission_key
      AND p.is_active = true
  );
END;
$$;

-- ========================================
-- دالة لنسخ صلاحيات دور إلى دور آخر
-- ========================================

CREATE OR REPLACE FUNCTION public.copy_role_permissions(
  _source_role_id UUID,
  _target_role_id UUID,
  _copied_by UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  copied_count INTEGER;
BEGIN
  -- نسخ جميع صلاحيات الدور المصدر إلى الدور الهدف
  INSERT INTO public.role_permissions (role_id, permission_id, granted_by, granted_at)
  SELECT 
    _target_role_id,
    permission_id,
    _copied_by,
    now()
  FROM public.role_permissions
  WHERE role_id = _source_role_id
  ON CONFLICT (role_id, permission_id) DO NOTHING;
  
  GET DIAGNOSTICS copied_count = ROW_COUNT;
  
  RETURN copied_count;
END;
$$;

-- ========================================
-- دالة لحساب عدد الصلاحيات لدور معين
-- ========================================

CREATE OR REPLACE FUNCTION public.get_role_permissions_count(
  _role_id UUID,
  _category TEXT DEFAULT NULL
)
RETURNS TABLE(
  active_count INTEGER,
  total_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(CASE WHEN rp.permission_id IS NOT NULL THEN 1 END)::INTEGER as active_count,
    COUNT(p.id)::INTEGER as total_count
  FROM public.permissions p
  LEFT JOIN public.role_permissions rp ON p.id = rp.permission_id AND rp.role_id = _role_id
  WHERE (_category IS NULL OR p.category = _category)
    AND p.is_active = true;
END;
$$;

-- ========================================
-- إدخال الصلاحيات الافتراضية
-- ========================================

-- صلاحيات المبيعات
INSERT INTO public.permissions (permission_key, permission_name, permission_name_en, description, category, sort_order) VALUES
('sales.create_invoice', 'إضافة فواتير للعطاء الخاصة به', 'Create Own Invoices', 'إنشاء فواتير مبيعات خاصة بالموظف', 'sales', 1),
('sales.edit_own_invoice', 'تعديل وحذف الفواتير الخاصة به', 'Edit/Delete Own Invoices', 'تعديل وحذف الفواتير التي أنشأها الموظف', 'sales', 2),
('sales.view_all_invoices', 'عرض جميع الفواتير', 'View All Invoices', 'عرض جميع فواتير المبيعات في النظام', 'sales', 3),
('sales.manage_payments', 'إضافة عمليات دفع لكل الفواتير', 'Manage All Payments', 'إدارة المدفوعات لجميع الفواتير', 'sales', 4),
('sales.edit_payment_options', 'تعديل خيارات الدفع', 'Edit Payment Options', 'تعديل طرق وخيارات الدفع', 'sales', 5),
('sales.manage_own_payments', 'حذف وتعديل المدفوعات الخاصة به', 'Manage Own Payments', 'إدارة المدفوعات التي أنشأها فقط', 'sales', 6),
('sales.create_quotation', 'إضافة عرض سعر للعطاء الخاصة به', 'Create Quotation', 'إنشاء عروض أسعار', 'sales', 7),
('sales.discount_below_minimum', 'السماح بالبيع بأقل من السعر الأدنى', 'Sell Below Minimum Price', 'السماح بالبيع بسعر أقل من الحد الأدنى', 'sales', 8),
('sales.cancel_invoice', 'إلغاء الفواتير', 'Cancel Invoices', 'إلغاء فواتير المبيعات', 'sales', 9),
('sales.post_invoice', 'ترحيل الفواتير', 'Post Invoices', 'ترحيل فواتير المبيعات للمحاسبة', 'sales', 10)
ON CONFLICT (permission_key) DO NOTHING;

-- صلاحيات العملاء
INSERT INTO public.permissions (permission_key, permission_name, permission_name_en, description, category, sort_order) VALUES
('customers.view_all', 'عرض جميع العملاء', 'View All Customers', 'عرض قائمة جميع العملاء', 'customers', 1),
('customers.manage_all', 'تعديل وحذف جميع العملاء', 'Manage All Customers', 'تعديل وحذف أي عميل في النظام', 'customers', 2),
('customers.view_activities', 'عرض جميع سجلات الأنشطة', 'View All Activities', 'عرض سجل أنشطة جميع العملاء', 'customers', 3),
('customers.manage_settings', 'تعديل إعدادات العملاء', 'Manage Customer Settings', 'تعديل إعدادات وتصنيفات العملاء', 'customers', 4),
('customers.view_own_reports', 'عرض تقارير العملاء الخاصة به', 'View Own Customer Reports', 'عرض تقارير العملاء الخاصة بالموظف فقط', 'customers', 5),
('customers.create', 'إضافة عميل جديد', 'Create Customer', 'إضافة عملاء جدد للنظام', 'customers', 6),
('customers.view_own', 'عرض عملائه', 'View Own Customers', 'عرض العملاء المسندين للموظف فقط', 'customers', 7),
('customers.manage_own', 'تعديل وحذف عملائه', 'Manage Own Customers', 'إدارة العملاء الخاصين بالموظف', 'customers', 8),
('customers.manage_credit_limit', 'إدارة حدود الائتمان', 'Manage Credit Limits', 'تعديل حدود الائتمان للعملاء', 'customers', 9),
('customers.view_financial_data', 'عرض البيانات المالية', 'View Financial Data', 'عرض الأرصدة والمعاملات المالية للعملاء', 'customers', 10)
ON CONFLICT (permission_key) DO NOTHING;

-- صلاحيات المخزون والمشتريات
INSERT INTO public.permissions (permission_key, permission_name, permission_name_en, description, category, sort_order) VALUES
('inventory.create_adjustment', 'إضافة إذن مخزني', 'Create Stock Adjustment', 'إنشاء إذن تعديل مخزني', 'inventory', 1),
('inventory.view_adjustments', 'عرض الإذن المخزني', 'View Stock Adjustments', 'عرض أذونات التعديل المخزنية', 'inventory', 2),
('inventory.edit_movement_price', 'تعديل سعر حركة المخزون', 'Edit Movement Price', 'تعديل أسعار حركات المخزون', 'inventory', 3),
('inventory.manage_all_purchases', 'تعديل أو حذف كل فواتير الشراء', 'Manage All Purchase Invoices', 'إدارة جميع فواتير الشراء', 'inventory', 4),
('inventory.create_supplier', 'إضافة موردين جدد', 'Create Suppliers', 'إضافة موردين جدد للنظام', 'inventory', 5),
('inventory.view_all_suppliers', 'عرض كل الموردين', 'View All Suppliers', 'عرض قائمة جميع الموردين', 'inventory', 6),
('inventory.adjust_stock_quantity', 'تعديل عدد المنتجات بالمخزون', 'Adjust Stock Quantity', 'تعديل كميات المنتجات في المخزون', 'inventory', 7),
('inventory.transfer_stock', 'نقل المخزون بين المستودعات', 'Transfer Stock', 'نقل البضائع بين المستودعات', 'inventory', 8),
('inventory.view_stock_levels', 'عرض مستويات المخزون', 'View Stock Levels', 'عرض كميات وأرصدة المخزون', 'inventory', 9),
('inventory.manage_warehouses', 'إدارة المستودعات', 'Manage Warehouses', 'إضافة وتعديل المستودعات', 'inventory', 10)
ON CONFLICT (permission_key) DO NOTHING;

-- صلاحيات الإعدادات العامة
INSERT INTO public.permissions (permission_key, permission_name, permission_name_en, description, category, sort_order) VALUES
('settings.edit_general', 'تعديل الإعدادات العامة', 'Edit General Settings', 'تعديل إعدادات النظام العامة', 'settings', 1),
('settings.view_terms', 'عرض الشروط والأحكام', 'View Terms & Conditions', 'عرض الشروط والأحكام', 'settings', 2),
('settings.manage_documents', 'تعديل وحذف السلفات والوثائق', 'Manage Documents', 'إدارة المستندات والوثائق', 'settings', 3),
('settings.change_version', 'تغيير إصدار الموقع', 'Change System Version', 'تحديث إصدار النظام', 'settings', 4),
('settings.manage_users', 'إدارة المستخدمين', 'Manage Users', 'إضافة وتعديل المستخدمين', 'settings', 5),
('settings.manage_roles', 'إدارة الأدوار والصلاحيات', 'Manage Roles & Permissions', 'إدارة الأدوار وصلاحيات النظام', 'settings', 6),
('settings.view_audit_logs', 'عرض سجلات التدقيق', 'View Audit Logs', 'عرض سجلات أنشطة المستخدمين', 'settings', 7),
('settings.manage_taxes', 'إدارة الضرائب', 'Manage Taxes', 'إضافة وتعديل الضرائب', 'settings', 8),
('settings.manage_payment_methods', 'إدارة طرق الدفع', 'Manage Payment Methods', 'إدارة طرق الدفع المتاحة', 'settings', 9),
('settings.backup_restore', 'النسخ الاحتياطي والاستعادة', 'Backup & Restore', 'عمل نسخ احتياطية واستعادتها', 'settings', 10)
ON CONFLICT (permission_key) DO NOTHING;

-- صلاحيات التقارير
INSERT INTO public.permissions (permission_key, permission_name, permission_name_en, description, category, sort_order) VALUES
('reports.sales', 'تقارير المبيعات', 'Sales Reports', 'عرض وتصدير تقارير المبيعات', 'reports', 1),
('reports.inventory', 'تقارير المخزون', 'Inventory Reports', 'عرض تقارير المخزون والحركات', 'reports', 2),
('reports.financial', 'التقارير المالية', 'Financial Reports', 'عرض التقارير المالية والمحاسبية', 'reports', 3),
('reports.customers', 'تقارير العملاء', 'Customer Reports', 'عرض تقارير العملاء والمديونيات', 'reports', 4),
('reports.employees', 'تقارير الموظفين', 'Employee Reports', 'عرض تقارير أداء الموظفين', 'reports', 5)
ON CONFLICT (permission_key) DO NOTHING;

-- ========================================
-- إنشاء الأدوار الافتراضية وربطها بالصلاحيات
-- ========================================

-- دور المدير (جميع الصلاحيات)
INSERT INTO public.roles (role_name, role_name_en, description, is_system_role, is_active)
VALUES ('مدير النظام', 'System Administrator', 'يملك جميع الصلاحيات في النظام', true, true)
ON CONFLICT (role_name) DO NOTHING;

-- دور الصيدلي (معظم الصلاحيات)
INSERT INTO public.roles (role_name, role_name_en, description, is_system_role, is_active)
VALUES ('صيدلي', 'Pharmacist', 'صلاحيات إدارة الصيدلية والمبيعات', true, true)
ON CONFLICT (role_name) DO NOTHING;

-- دور الكاشير (صلاحيات محدودة)
INSERT INTO public.roles (role_name, role_name_en, description, is_system_role, is_active)
VALUES ('كاشير', 'Cashier', 'صلاحيات نقطة البيع والعمليات اليومية', true, true)
ON CONFLICT (role_name) DO NOTHING;

-- دور مدير المخزون
INSERT INTO public.roles (role_name, role_name_en, description, is_system_role, is_active)
VALUES ('مدير المخزون', 'Inventory Manager', 'صلاحيات إدارة المخزون والمشتريات', true, true)
ON CONFLICT (role_name) DO NOTHING;

-- ربط صلاحيات دور الصيدلي
DO $$
DECLARE
  pharmacist_role_id UUID;
BEGIN
  SELECT id INTO pharmacist_role_id FROM public.roles WHERE role_name = 'صيدلي';
  
  IF pharmacist_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT pharmacist_role_id, id
    FROM public.permissions
    WHERE permission_key IN (
      'sales.create_invoice',
      'sales.view_all_invoices',
      'sales.manage_payments',
      'sales.post_invoice',
      'customers.view_all',
      'customers.create',
      'customers.manage_own',
      'inventory.view_stock_levels',
      'reports.sales',
      'reports.customers'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- ربط صلاحيات دور الكاشير
DO $$
DECLARE
  cashier_role_id UUID;
BEGIN
  SELECT id INTO cashier_role_id FROM public.roles WHERE role_name = 'كاشير';
  
  IF cashier_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT cashier_role_id, id
    FROM public.permissions
    WHERE permission_key IN (
      'sales.create_invoice',
      'sales.edit_own_invoice',
      'sales.view_all_invoices',
      'customers.view_all',
      'customers.create'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- ربط صلاحيات دور مدير المخزون
DO $$
DECLARE
  inventory_role_id UUID;
BEGIN
  SELECT id INTO inventory_role_id FROM public.roles WHERE role_name = 'مدير المخزون';
  
  IF inventory_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT inventory_role_id, id
    FROM public.permissions
    WHERE category = 'inventory'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- ========================================
-- RLS Policies
-- ========================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

-- الأدوار
CREATE POLICY "Admin can manage roles"
  ON public.roles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All staff can view active roles"
  ON public.roles FOR SELECT
  USING (
    is_active = true AND
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role])
  );

-- الصلاحيات
CREATE POLICY "Admin can manage permissions"
  ON public.permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All staff can view active permissions"
  ON public.permissions FOR SELECT
  USING (
    is_active = true AND
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role])
  );

-- ربط الأدوار بالصلاحيات
CREATE POLICY "Admin can manage role permissions"
  ON public.role_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All staff can view role permissions"
  ON public.role_permissions FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role]));

-- ربط المستخدمين بالأدوار المخصصة
CREATE POLICY "Admin can manage user custom roles"
  ON public.user_custom_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own custom roles"
  ON public.user_custom_roles FOR SELECT
  USING (user_id = auth.uid());

COMMENT ON TABLE public.roles IS 'جدول الأدوار المخصصة في النظام';
COMMENT ON TABLE public.permissions IS 'جدول الصلاحيات المتاحة في النظام';
COMMENT ON TABLE public.role_permissions IS 'ربط الأدوار بالصلاحيات (Many-to-Many)';
COMMENT ON TABLE public.user_custom_roles IS 'ربط المستخدمين بالأدوار المخصصة';
