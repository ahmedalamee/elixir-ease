import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import {
  BarChart3,
  TrendingUp,
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  Building2,
  FileText,
  Download,
  Star,
  Clock,
  AlertCircle,
  PieChart,
  Activity,
} from "lucide-react";

const ReportsDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCustomers: 0,
    totalProducts: 0,
    lowStockCount: 0,
  });

  useEffect(() => {
    checkAuth();
    fetchQuickStats();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchQuickStats = async () => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [salesRes, customersRes, productsRes, lowStockRes] = await Promise.all([
        (supabase as any).from("sales_invoices")
          .select("total_amount", { count: "exact" })
          .gte("invoice_date", thirtyDaysAgo.toISOString())
          .eq("status", "posted"),
        supabase.from("customers").select("*", { count: "exact" }),
        supabase.from("products").select("*", { count: "exact" }).eq("is_active", true),
        supabase.from("products")
          .select("*", { count: "exact" })
          .eq("is_active", true)
          .not("reorder_level", "is", null),
      ]);

      const totalSales = salesRes.data?.reduce((sum: number, inv: any) => sum + inv.total_amount, 0) || 0;
      const lowStock = lowStockRes.data?.filter((p: any) => p.quantity <= p.reorder_level).length || 0;

      setStats({
        totalSales,
        totalCustomers: customersRes.count || 0,
        totalProducts: productsRes.count || 0,
        lowStockCount: lowStock,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const reportCategories = [
    {
      title: "تقارير المبيعات",
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      reports: [
        { name: "تقارير المبيعات التفصيلية", path: "/sales-reports", icon: BarChart3 },
        { name: "تقارير نقاط البيع", path: "/pos-reports", icon: Activity },
        { name: "تقارير أرباح نقاط البيع", path: "/pos-profit-reports", icon: TrendingUp },
        { name: "تقارير مبيعات نقاط البيع", path: "/pos-sales-reports", icon: DollarSign },
      ],
    },
    {
      title: "تقارير المخزون",
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-50",
      reports: [
        { name: "تقارير المخزون", path: "/inventory-reports", icon: Package },
        { name: "لوحة تحكم المخزون", path: "/inventory-dashboard", icon: Activity },
        { name: "تنبيهات المخزون", path: "/stock-alerts", icon: AlertCircle },
        { name: "حركات المخزون", path: "/stock-movements", icon: TrendingUp },
      ],
    },
    {
      title: "التقارير المالية",
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      reports: [
        { name: "قائمة الدخل", path: "/income-statement", icon: TrendingUp },
        { name: "الميزانية العمومية", path: "/balance-sheet", icon: Building2 },
        { name: "لوحة التحكم التنفيذية", path: "/executive-dashboard", icon: BarChart3 },
        { name: "النسب المالية", path: "/financial-ratios", icon: PieChart },
        { name: "ربحية المنتجات", path: "/product-profitability", icon: Package },
        { name: "الأداء التشغيلي", path: "/operational-performance", icon: Activity },
        { name: "دوران المخزون", path: "/inventory-turnover", icon: Activity },
        { name: "الإيرادات حسب الفئة", path: "/revenue-by-category", icon: PieChart },
      ],
    },
    {
      title: "تقارير العملاء والموردين",
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      reports: [
        { name: "تقارير CRM", path: "/crm-reports", icon: Users },
        { name: "تقارير الموردين", path: "/supplier-reports", icon: Building2 },
        { name: "تقارير الشكاوى", path: "/complaints-reports", icon: AlertCircle },
      ],
    },
    {
      title: "التقارير الضريبية والصيدلة",
      icon: FileText,
      color: "text-red-600",
      bgColor: "bg-red-50",
      reports: [
        { name: "التقارير الضريبية", path: "/tax-reports", icon: FileText },
        { name: "تقارير الصيدلة", path: "/pharmacy-reports", icon: Activity },
        { name: "التقارير العامة", path: "/reports", icon: BarChart3 },
      ],
    },
  ];

  const quickActions = [
    { name: "إنشاء تقرير مخصص", icon: FileText, action: () => navigate("/reports") },
    { name: "تصدير كل البيانات", icon: Download, action: () => toast({ title: "قريباً", description: "ميزة التصدير الشامل قيد التطوير" }) },
    { name: "جدولة تقرير", icon: Clock, action: () => toast({ title: "قريباً", description: "ميزة جدولة التقارير قيد التطوير" }) },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">جارٍ التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">مركز التقارير والتحليلات</h1>
          <p className="text-muted-foreground text-lg">
            نظرة شاملة على جميع التقارير والتحليلات المتاحة
          </p>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المبيعات (30 يوم)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSales.toFixed(2)} ر.س</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المنتجات النشطة</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-600">مخزون منخفض</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.lowStockCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* إجراءات سريعة */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              إجراءات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={action.action}
                  className="gap-2"
                >
                  <action.icon className="h-4 w-4" />
                  {action.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* فئات التقارير */}
        <div className="space-y-8">
          {reportCategories.map((category, categoryIndex) => (
            <Card key={categoryIndex} className="hover:shadow-lg transition-shadow">
              <CardHeader className={`${category.bgColor} rounded-t-lg`}>
                <div className="flex items-center gap-3">
                  <div className={`p-3 bg-white rounded-lg ${category.color}`}>
                    <category.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className={category.color}>{category.title}</CardTitle>
                    <CardDescription>
                      {category.reports.length} تقرير متاح
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {category.reports.map((report, reportIndex) => (
                    <Card
                      key={reportIndex}
                      className="hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => navigate(report.path)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${category.bgColor} ${category.color} group-hover:scale-110 transition-transform`}>
                          <report.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm group-hover:text-primary transition-colors">
                            {report.name}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ميزات إضافية */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>ميزات إضافية</CardTitle>
            <CardDescription>ميزات قيد التطوير لتحسين تجربة التقارير</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Clock className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium mb-1">جدولة التقارير</h4>
                  <p className="text-sm text-muted-foreground">
                    احصل على تقارير دورية تلقائياً عبر البريد الإلكتروني
                  </p>
                  <Badge variant="secondary" className="mt-2">قريباً</Badge>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Star className="h-5 w-5 text-yellow-600 mt-1" />
                <div>
                  <h4 className="font-medium mb-1">التقارير المفضلة</h4>
                  <p className="text-sm text-muted-foreground">
                    احفظ التقارير المفضلة للوصول السريع
                  </p>
                  <Badge variant="secondary" className="mt-2">قريباً</Badge>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Download className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <h4 className="font-medium mb-1">تصدير متقدم</h4>
                  <p className="text-sm text-muted-foreground">
                    تصدير إلى Excel، PDF، وصيغ أخرى
                  </p>
                  <Badge variant="secondary" className="mt-2">قريباً</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsDashboard;
