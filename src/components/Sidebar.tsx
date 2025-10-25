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
    path: "/dashboard",
  },
  {
    title: "المبيعات",
    icon: FileText,
    children: [
      { title: "إدارة الفواتير", path: "/sales/invoices" },
      { title: "إنشاء فاتورة", path: "/sales/new-invoice" },
      { title: "إشعارات دائنة", path: "/sales/credit-notes" },
      { title: "الفواتير المرتجعة", path: "/sales/returns" },
      { title: "الفواتير الدورية", path: "/sales/recurring" },
      { title: "مدفوعات العملاء", path: "/sales/payments" },
      { title: "إعدادات المبيعات", path: "/sales/settings" },
    ],
  },
  {
    title: "وكلاء التأمين",
    icon: Shield,
    children: [
      { title: "إدارة وكلاء التأمين", path: "/insurance/agents" },
      { title: "أضف شركة تأمين", path: "/insurance/new" },
    ],
  },
  {
    title: "العملاء",
    icon: Users,
    children: [
      { title: "إدارة العملاء", path: "/customers" },
      { title: "إضافة عميل جديد", path: "/customers/new" },
      { title: "المواعيد", path: "/customers/appointments" },
      { title: "قائمة الاتصال", path: "/customers/contacts" },
      { title: "إدارة علاقات العملاء", path: "/customers/crm" },
      { title: "إعدادات العميل", path: "/customers/settings" },
    ],
  },
  {
    title: "نقاط البيع",
    icon: ShoppingCart,
    children: [
      { title: "بدأ البيع", path: "/pos" },
      { title: "الجلسات", path: "/pos/sessions" },
      { title: "تقرير نقاط البيع", path: "/pos/reports" },
      { title: "إعدادات نقاط البيع", path: "/pos/settings" },
    ],
  },
  {
    title: "المخزون",
    icon: Package,
    children: [
      { title: "المنتجات والخدمات الطبية", path: "/inventory" },
      { title: "إدارة المخزون بالمستودعات", path: "/warehouse-stock" },
      { title: "إدارة الأذون المخزنية", path: "/inventory/permissions" },
      { title: "الطلبات المخزنية", path: "/inventory/orders" },
      { title: "تتبع المنتجات", path: "/inventory/tracking" },
      { title: "قوائم الأسعار", path: "/inventory/price-lists" },
      { title: "المستودعات", path: "/warehouses" },
      { title: "إدارة الجرد", path: "/inventory/stock-count" },
      { title: "إعدادات المخزون", path: "/inventory/settings" },
      { title: "إعدادات المنتجات", path: "/product-settings" },
    ],
  },
  {
    title: "المشتريات",
    icon: ShoppingBag,
    children: [
      { title: "طلبات الشراء", path: "/purchase-orders" },
      { title: "طلبات عروض الأسعار", path: "/purchases/rfq" },
      { title: "عروض أسعار المشتريات", path: "/purchases/quotes" },
      { title: "أوامر الشراء", path: "/purchases/orders" },
      { title: "فواتير الشراء", path: "/purchases/invoices" },
      { title: "مرتجعات المشتريات", path: "/purchases/returns" },
      { title: "إشعارات مدينة", path: "/purchases/debit-notes" },
      { title: "إدارة الموردين", path: "/suppliers" },
      { title: "مدفوعات الموردين", path: "/purchases/payments" },
      { title: "إعدادات فواتير الشراء", path: "/purchases/invoice-settings" },
      { title: "إعدادات الموردين", path: "/purchases/supplier-settings" },
    ],
  },
  {
    title: "المالية",
    icon: DollarSign,
    children: [
      { title: "المصروفات", path: "/finance/expenses" },
      { title: "سندات القبض", path: "/finance/receipts" },
      { title: "خزائن وحسابات بنكية", path: "/finance/accounts" },
      { title: "إعدادات المالية", path: "/finance/settings" },
    ],
  },
  {
    title: "الحسابات العامة",
    icon: FileStack,
    children: [
      { title: "المحاسبة العامة", path: "/accounting" },
      { title: "دليل الحسابات", path: "/accounts/chart" },
      { title: "القيود اليومية", path: "/accounts/journal" },
      { title: "الأستاذ العام", path: "/accounts/ledger" },
      { title: "ميزان المراجعة", path: "/accounts/trial-balance" },
    ],
  },
  {
    title: "التقارير",
    icon: BarChart3,
    children: [
      { title: "تقارير المبيعات", path: "/reports" },
      { title: "تقارير المشتريات", path: "/reports/purchases" },
      { title: "تقارير الحسابات العامة", path: "/reports/accounts" },
      { title: "تقارير الـ SMS", path: "/reports/sms" },
      { title: "تقارير العملاء", path: "/reports/customers" },
      { title: "تقارير المخزون", path: "/reports/inventory" },
      { title: "سجل النشاطات للحساب", path: "/reports/activity-log" },
    ],
  },
  {
    title: "القوالب",
    icon: FileStack,
    children: [
      { title: "قوالب للطباعة", path: "/templates/print" },
      { title: "قوالب الفواتير الجاهزة", path: "/templates/invoices" },
      { title: "قوالب البريد الالكتروني", path: "/templates/email" },
      { title: "قوالب الـ SMS", path: "/templates/sms" },
      { title: "الشروط والأحكام", path: "/templates/terms" },
      { title: "إدارة الملفات والمستندات", path: "/templates/files" },
      { title: "قواعد الإرسال الآلي", path: "/templates/automation" },
    ],
  },
  {
    title: "الموظفين",
    icon: UserCog,
    path: "/user-management",
  },
  {
    title: "الإعدادات",
    icon: Settings,
    children: [
      { title: "معلومات الحساب", path: "/settings/account-info" },
      { title: "إعدادات الحساب", path: "/settings/account" },
      { title: "إعدادات الـ SMTP", path: "/settings/smtp" },
      { title: "طرق الدفع", path: "/settings/payment-methods" },
      { title: "إعدادات الـ SMS", path: "/settings/sms" },
      { title: "إعدادات الترقيم المتسلسل", path: "/settings/numbering" },
      { title: "إدارة العملات", path: "/settings/currencies" },
      { title: "إعدادات الضرائب", path: "/settings/taxes" },
      { title: "إعدادات الحسابات", path: "/settings/account" },
      { title: "إدارة التطبيقات", path: "/settings/apps" },
      { title: "شعار وألوان النظام", path: "/settings/branding" },
      { title: "API", path: "/settings/api" },
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