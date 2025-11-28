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
  Settings,
  Pill,
  Activity,
  ClipboardList,
  Warehouse,
  TrendingUp,
  Receipt,
  CreditCard,
  Calendar,
  BookOpen,
  UserCog,
  Building2,
} from "lucide-react";
import { TreeMenuItem } from "@/types/tree-menu";

export const menuTree: TreeMenuItem[] = [
  {
    id: "dashboard",
    label: "لوحة التحكم",
    icon: Home,
    route: "/executive-dashboard",
  },
  {
    id: "sales",
    label: "المبيعات",
    icon: FileText,
    children: [
      {
        id: "sales-invoices",
        label: "فواتير البيع",
        route: "/sales/invoices",
      },
      {
        id: "sales-new-invoice",
        label: "إنشاء فاتورة جديدة",
        route: "/sales/new-invoice",
      },
      {
        id: "sales-returns",
        label: "مرتجعات البيع",
        route: "/sales/returns",
      },
      {
        id: "sales-payments",
        label: "مدفوعات العملاء",
        route: "/sales/payments",
      },
      {
        id: "sales-reports",
        label: "تقارير المبيعات",
        route: "/sales/reports",
      },
    ],
  },
  {
    id: "crm",
    label: "إدارة العلاقات",
    icon: Users,
    children: [
      {
        id: "crm-dashboard",
        label: "لوحة CRM",
        route: "/crm-dashboard",
      },
      {
        id: "crm-customers",
        label: "العملاء",
        route: "/customers",
      },
      {
        id: "crm-suppliers",
        label: "الموردون",
        route: "/suppliers",
      },
      {
        id: "crm-campaigns",
        label: "الحملات التسويقية",
        route: "/marketing-campaigns",
      },
      {
        id: "crm-complaints",
        label: "شكاوى العملاء",
        route: "/crm/complaints",
      },
      {
        id: "crm-reports",
        label: "تقارير وتحليلات",
        route: "/crm-reports",
      },
    ],
  },
  {
    id: "insurance",
    label: "وكلاء التأمين",
    icon: Shield,
    children: [
      {
        id: "insurance-companies",
        label: "إدارة شركات التأمين",
        route: "/insurance-companies",
      },
    ],
  },
  {
    id: "pharmacy",
    label: "النظام الصيدلي",
    icon: Pill,
    children: [
      {
        id: "pharmacy-doctors",
        label: "الأطباء",
        route: "/doctors",
      },
      {
        id: "pharmacy-prescriptions",
        label: "الوصفات الطبية",
        route: "/prescriptions",
      },
      {
        id: "pharmacy-health-records",
        label: "السجلات الصحية",
        route: "/health-records",
      },
      {
        id: "pharmacy-interactions",
        label: "التفاعلات والتحذيرات",
        route: "/drug-interactions",
      },
      {
        id: "pharmacy-reports",
        label: "التقارير الصيدلانية",
        route: "/pharmacy-reports",
      },
    ],
  },
  {
    id: "pos",
    label: "نقطة البيع",
    icon: ShoppingCart,
    children: [
      {
        id: "pos-main",
        label: "البيع السريع",
        route: "/pos",
      },
      {
        id: "pos-reports",
        label: "تقارير POS",
        route: "/pos/reports",
      },
      {
        id: "pos-settings",
        label: "إعدادات POS",
        route: "/pos/settings",
      },
    ],
  },
  {
    id: "inventory",
    label: "المخزون",
    icon: Package,
    children: [
      {
        id: "inventory-products",
        label: "المنتجات والخدمات",
        route: "/inventory",
      },
      {
        id: "inventory-warehouse-stock",
        label: "إدارة المخزون بالمستودعات",
        route: "/warehouse-stock",
      },
      {
        id: "inventory-movements",
        label: "حركات المخزون",
        route: "/stock-movements",
      },
      {
        id: "inventory-transfers",
        label: "تحويلات المستودعات",
        route: "/warehouse-transfers",
      },
      {
        id: "inventory-adjustments",
        label: "تعديلات المخزون",
        route: "/stock-adjustments",
      },
      {
        id: "inventory-batch-tracking",
        label: "تتبع الدفعات",
        route: "/batch-tracking",
      },
      {
        id: "inventory-price-lists",
        label: "قوائم الأسعار",
        route: "/price-lists",
      },
      {
        id: "inventory-warehouses",
        label: "المستودعات",
        route: "/warehouses",
      },
      {
        id: "inventory-reports",
        label: "تقارير المخزون المتقدمة",
        route: "/inventory/reports",
      },
    ],
  },
  {
    id: "purchases",
    label: "المشتريات",
    icon: ShoppingBag,
    children: [
      {
        id: "purchases-orders",
        label: "أوامر الشراء",
        route: "/purchase-orders",
      },
      {
        id: "purchases-invoices",
        label: "فواتير الشراء",
        route: "/purchase-invoices",
      },
      {
        id: "purchases-returns",
        label: "مرتجعات الشراء",
        route: "/purchases/returns",
      },
      {
        id: "purchases-goods-receipts",
        label: "إيصالات استلام البضاعة",
        route: "/goods-receipts",
      },
    ],
  },
  {
    id: "finance",
    label: "المالية",
    icon: DollarSign,
    children: [
      {
        id: "finance-expenses",
        label: "المصروفات",
        route: "/finance/expenses",
      },
      {
        id: "finance-payment-methods",
        label: "طرق الدفع",
        route: "/settings/payment-methods",
      },
    ],
  },
  {
    id: "accounting",
    label: "الحسابات العامة",
    icon: FileStack,
    children: [
      {
        id: "accounting-journal-entries",
        label: "قيود اليومية",
        route: "/accounting",
      },
      {
        id: "accounting-general-ledger",
        label: "الأستاذ العام",
        route: "/general-ledger",
      },
      {
        id: "accounting-trial-balance",
        label: "ميزان المراجعة",
        route: "/trial-balance",
      },
      {
        id: "accounting-income-statement",
        label: "قائمة الدخل",
        route: "/income-statement",
      },
      {
        id: "accounting-balance-sheet",
        label: "الميزانية العمومية",
        route: "/balance-sheet",
      },
      {
        id: "accounting-cost-centers",
        label: "مراكز التكلفة",
        route: "/cost-centers",
      },
      {
        id: "accounting-bank-reconciliation",
        label: "تسوية البنوك",
        route: "/bank-reconciliation",
      },
      {
        id: "accounting-financial-ratios",
        label: "التحليل المالي",
        route: "/financial-ratios",
      },
      {
        id: "accounting-product-profitability",
        label: "ربحية المنتجات",
        route: "/product-profitability",
      },
      {
        id: "accounting-operational-performance",
        label: "الأداء التشغيلي",
        route: "/operational-performance",
      },
      {
        id: "accounting-inventory-turnover",
        label: "دوران المخزون",
        route: "/inventory-turnover",
      },
      {
        id: "accounting-revenue-by-category",
        label: "الإيرادات حسب الفئة",
        route: "/revenue-by-category",
      },
      {
        id: "accounting-integration",
        label: "التكامل المحاسبي",
        route: "/accounting-integration",
      },
    ],
  },
  {
    id: "tax",
    label: "الضرائب والتوافق",
    icon: Receipt,
    children: [
      {
        id: "tax-compliance",
        label: "لوحة التحكم الضريبية",
        route: "/tax/compliance",
      },
      {
        id: "tax-vat-returns",
        label: "الإقرارات الضريبية",
        route: "/tax/vat-returns",
      },
      {
        id: "tax-e-invoicing",
        label: "الفواتير الإلكترونية",
        route: "/tax/e-invoicing",
      },
      {
        id: "tax-reports",
        label: "التقارير الضريبية",
        route: "/tax/reports",
      },
    ],
  },
  {
    id: "reports",
    label: "التقارير",
    icon: BarChart3,
    children: [
      {
        id: "reports-dashboard",
        label: "لوحة التحكم التنفيذية",
        route: "/executive-dashboard",
      },
      {
        id: "reports-sales",
        label: "تقارير المبيعات",
        route: "/sales-reports",
      },
      {
        id: "reports-inventory",
        label: "تقارير المخزون",
        route: "/inventory/reports",
      },
      {
        id: "reports-pos",
        label: "تقارير POS",
        route: "/pos/reports",
      },
      {
        id: "reports-general",
        label: "تقارير عامة",
        route: "/reports",
      },
    ],
  },
  {
    id: "hr",
    label: "الموارد البشرية",
    icon: UserCog,
    children: [
      {
        id: "hr-employees",
        label: "إدارة الموظفين",
        route: "/hr/employees",
      },
      {
        id: "hr-attendance",
        label: "الحضور والانصراف",
        route: "/hr/attendance",
      },
      {
        id: "hr-leaves",
        label: "الإجازات والعطلات",
        route: "/hr/leaves",
      },
      {
        id: "hr-performance",
        label: "تقييم الأداء",
        route: "/hr/performance",
      },
      {
        id: "hr-tasks",
        label: "المهام",
        route: "/hr/tasks",
      },
      {
        id: "hr-reports",
        label: "تقارير الموظفين",
        route: "/hr/employee-reports",
      },
    ],
  },
  {
    id: "settings",
    label: "الإعدادات",
    icon: Settings,
    children: [
      {
        id: "settings-account",
        label: "إعدادات حسابي",
        route: "/account-settings",
      },
      {
        id: "settings-company",
        label: "الملف التعريفي للشركة",
        route: "/company-profile",
      },
      {
        id: "settings-branches",
        label: "الصيدلية والفروع",
        route: "/company-profile",
      },
      {
        id: "settings-users",
        label: "المستخدمون والصلاحيات",
        route: "/user-management",
      },
      {
        id: "settings-roles",
        label: "الأدوار والصلاحيات",
        route: "/roles-management",
      },
      {
        id: "settings-currencies",
        label: "إدارة العملات",
        route: "/settings/currencies",
      },
      {
        id: "settings-taxes",
        label: "إعدادات الضرائب",
        route: "/settings/taxes",
      },
      {
        id: "settings-general",
        label: "إعدادات عامة",
        route: "/settings",
      },
    ],
  },
];
