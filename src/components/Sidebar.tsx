import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  FileText,
  Shield,
  Users,
  ShoppingCart,
  Package,
  ShoppingBag,
  DollarSign,
  BarChart3,
  FileStack,
  UserCog,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface MenuItem {
  title: string;
  icon: any;
  path?: string;
  children?: {
    title: string;
    path: string;
  }[];
}

const menuItems: MenuItem[] = [
  {
    title: "لوحة التحكم",
    icon: Home,
    path: "/executive-dashboard",
  },
  {
    title: "المبيعات",
    icon: FileText,
    children: [
      { title: "إدارة الفواتير", path: "/sales/invoices" },
      { title: "إنشاء فاتورة", path: "/sales/new-invoice" },
      { title: "مدفوعات العملاء", path: "/sales/payments" },
      { title: "مرتجعات المبيعات", path: "/sales/returns" },
      { title: "تقارير المبيعات", path: "/sales/reports" },
    ],
  },
  {
    title: "إدارة العلاقات",
    icon: Users,
    children: [
      { title: "لوحة CRM", path: "/crm-dashboard" },
      { title: "الحملات التسويقية", path: "/marketing-campaigns" },
      { title: "شكاوى العملاء", path: "/crm/complaints" },
      { title: "تقارير الشكاوى", path: "/crm/complaints-reports" },
      { title: "تقارير وتحليلات", path: "/crm-reports" },
    ],
  },
  {
    title: "وكلاء التأمين",
    icon: Shield,
    children: [
      { title: "إدارة شركات التأمين", path: "/insurance-companies" },
    ],
  },
  {
    title: "العملاء",
    icon: Users,
    children: [
      { title: "إدارة العملاء", path: "/customers" },
    ],
  },
  {
    title: "النظام الصيدلي",
    icon: FileText,
    children: [
      { title: "الأطباء", path: "/doctors" },
      { title: "الوصفات الطبية", path: "/prescriptions" },
      { title: "السجلات الصحية", path: "/health-records" },
      { title: "التفاعلات والتحذيرات", path: "/drug-interactions" },
      { title: "التقارير الصيدلانية", path: "/pharmacy-reports" },
    ],
  },
  {
    title: "نقطة البيع",
    icon: ShoppingCart,
    children: [
      { title: "البيع السريع", path: "/pos" },
      { title: "تقارير POS", path: "/pos/reports" },
    ],
  },
    {
      title: "المخزون",
      icon: Package,
      children: [
        { title: "المنتجات والخدمات", path: "/inventory" },
        { title: "إدارة المخزون بالمستودعات", path: "/warehouse-stock" },
        { title: "الحركات المخزنية", path: "/stock-movements" },
        { title: "تحويلات المستودعات", path: "/warehouse-transfers" },
        { title: "تعديلات المخزون", path: "/stock-adjustments" },
        { title: "تتبع الدفعات", path: "/batch-tracking" },
        { title: "قوائم الأسعار", path: "/price-lists" },
        { title: "المستودعات", path: "/warehouses" },
        { title: "وحدات القياس", path: "/unit-of-measures" },
        { title: "تقارير المخزون المتقدمة", path: "/inventory/reports" },
        { title: "إعدادات المخزون", path: "/inventory/settings" },
        { title: "إعدادات المنتجات", path: "/product-settings" },
      ],
    },
  {
    title: "المشتريات",
    icon: ShoppingBag,
    children: [
      { title: "طلبات الشراء", path: "/purchase-orders" },
      { title: "فواتير الشراء", path: "/purchase-invoices" },
      { title: "مرتجعات المشتريات", path: "/purchases/returns" },
      { title: "إدارة الموردين", path: "/suppliers" },
    ],
  },
  {
    title: "المالية",
    icon: DollarSign,
    children: [
      { title: "المصروفات", path: "/finance/expenses" },
      { title: "طرق الدفع", path: "/settings/payment-methods" },
    ],
  },
  {
    title: "الحسابات العامة",
    icon: FileStack,
    children: [
      { title: "قيود اليومية", path: "/accounting" },
      { title: "الأستاذ العام", path: "/general-ledger" },
      { title: "ميزان المراجعة", path: "/trial-balance" },
      { title: "قائمة الدخل", path: "/income-statement" },
      { title: "الميزانية العمومية", path: "/balance-sheet" },
      { title: "مراكز التكلفة", path: "/cost-centers" },
      { title: "تسوية البنوك", path: "/bank-reconciliation" },
      { title: "التحليل المالي", path: "/financial-ratios" },
      { title: "التكامل المحاسبي", path: "/accounting-integration" },
    ],
  },
  {
    title: "الضرائب والتوافق",
    icon: Shield,
    children: [
      { title: "لوحة التحكم الضريبية", path: "/tax/compliance" },
      { title: "الإقرارات الضريبية", path: "/tax/vat-returns" },
      { title: "الفواتير الإلكترونية", path: "/tax/e-invoicing" },
      { title: "التقارير الضريبية", path: "/tax/reports" },
    ],
  },
  {
    title: "التقارير",
    icon: BarChart3,
    children: [
      { title: "لوحة التحكم التنفيذية", path: "/executive-dashboard" },
      { title: "تقارير المبيعات", path: "/sales-reports" },
      { title: "تقارير المخزون", path: "/inventory/reports" },
      { title: "تقارير POS", path: "/pos/reports" },
      { title: "تقارير عامة", path: "/reports" },
    ],
  },
  {
    title: "الموارد البشرية",
    icon: Users,
    children: [
      { title: "إدارة الموظفين", path: "/hr/employees" },
      { title: "الحضور والانصراف", path: "/hr/attendance" },
      { title: "الإجازات والعطلات", path: "/hr/leaves" },
      { title: "تقييم الأداء", path: "/hr/performance" },
      { title: "المهام", path: "/hr/tasks" },
      { title: "تقارير الموظفين", path: "/hr/employee-reports" },
    ],
  },
  {
    title: "الموظفين",
    icon: UserCog,
    children: [
      { title: "عرض الموظفين", path: "/user-management" },
      { title: "إدارة الموظفين", path: "/user-management" },
      { title: "الأدوار والصلاحيات", path: "/roles-management" },
      { title: "إدارة الصلاحيات المتقدمة", path: "/roles-permissions" },
    ],
  },
  {
    title: "الإعدادات",
    icon: Settings,
    children: [
      { title: "إعدادات حسابي", path: "/account-settings" },
      { title: "الملف التعريفي للشركة", path: "/company-profile" },
      { title: "إدارة العملات", path: "/settings/currencies" },
      { title: "إعدادات الضرائب", path: "/settings/taxes" },
      { title: "طرق الدفع", path: "/settings/payment-methods" },
      { title: "إعدادات عامة", path: "/settings" },
    ],
  },
];

const Sidebar = () => {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const isParentActive = (children?: { path: string }[]) => {
    if (!children) return false;
    return children.some((child) => location.pathname === child.path);
  };

  return (
    <div className="w-64 h-screen bg-card border-l border-border overflow-y-auto sticky top-0">
      <div className="p-6">
        <div className="flex items-center justify-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Package className="w-8 h-8 text-primary" />
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <div key={item.title}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.title)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                      isParentActive(item.children)
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </div>
                    {openMenus.includes(item.title) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {openMenus.includes(item.title) && (
                    <div className="mt-1 space-y-1 pr-4">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={cn(
                            "block px-4 py-2 text-sm rounded-lg transition-colors",
                            isActive(child.path)
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path!}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.title}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;