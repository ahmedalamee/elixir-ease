import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Warehouse, 
  TrendingUp, 
  AlertTriangle, 
  Layers,
  Tag,
  Store,
  RefreshCcw,
  Calendar,
  BarChart3,
  ArrowRightLeft,
  Settings,
  FileText,
  ShoppingCart,
  PackageCheck,
  PackageX,
  Target
} from "lucide-react";

interface Stats {
  totalProducts: number;
  lowStockProducts: number;
  expiringProducts: number;
  totalWarehouses: number;
  pendingTransfers: number;
  totalCategories: number;
  totalBrands: number;
  totalBatches: number;
}

const InventoryDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    lowStockProducts: 0,
    expiringProducts: 0,
    totalWarehouses: 0,
    pendingTransfers: 0,
    totalCategories: 0,
    totalBrands: 0,
    totalBatches: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchStats();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchStats = async () => {
    try {
      const [
        productsRes,
        warehousesRes,
        transfersRes,
        categoriesRes,
        brandsRes,
        batchesRes,
      ] = await Promise.all([
        supabase.from("products").select("quantity, min_quantity, expiry_date", { count: 'exact' }),
        supabase.from("warehouses").select("*", { count: 'exact' }),
        (supabase as any).from("warehouse_transfers").select("*", { count: 'exact' }).eq("status", "pending"),
        supabase.from("categories").select("*", { count: 'exact' }),
        (supabase as any).from("manufacturers").select("*", { count: 'exact' }),
        (supabase as any).from("product_batches").select("*", { count: 'exact' }),
      ]);

      let lowStock = 0;
      let expiring = 0;
      
      if (productsRes.data) {
        const today = new Date();
        const threeMonthsFromNow = new Date(today.setMonth(today.getMonth() + 3));
        
        productsRes.data.forEach((product) => {
          if (product.quantity <= product.min_quantity) {
            lowStock++;
          }
          if (product.expiry_date) {
            const expiryDate = new Date(product.expiry_date);
            if (expiryDate <= threeMonthsFromNow) {
              expiring++;
            }
          }
        });
      }

      setStats({
        totalProducts: productsRes.count || 0,
        lowStockProducts: lowStock,
        expiringProducts: expiring,
        totalWarehouses: warehousesRes.count || 0,
        pendingTransfers: transfersRes.count || 0,
        totalCategories: categoriesRes.count || 0,
        totalBrands: brandsRes.count || 0,
        totalBatches: batchesRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: "المنتجات",
      description: "إدارة جميع المنتجات والأصناف",
      icon: Package,
      color: "bg-blue-500",
      path: "/products",
      count: stats.totalProducts,
    },
    {
      title: "المخازن",
      description: "إدارة المستودعات والفروع",
      icon: Warehouse,
      color: "bg-green-500",
      path: "/warehouses",
      count: stats.totalWarehouses,
    },
    {
      title: "الفئات",
      description: "تصنيفات وفئات المنتجات",
      icon: Tag,
      color: "bg-purple-500",
      path: "/categories",
      count: stats.totalCategories,
    },
    {
      title: "العلامات التجارية",
      description: "إدارة الماركات والمصنعين",
      icon: Store,
      color: "bg-orange-500",
      path: "/product-settings/brands",
      count: stats.totalBrands,
    },
  ];

  const inventoryOperations = [
    {
      title: "تنبيهات المخزون",
      description: "منتجات أقل من الحد الأدنى",
      icon: AlertTriangle,
      color: "text-red-500",
      path: "/stock-alerts",
      count: stats.lowStockProducts,
    },
    {
      title: "تتبع الدفعات",
      description: "إدارة الدفعات وتواريخ الصلاحية",
      icon: Calendar,
      color: "text-yellow-500",
      path: "/batch-tracking",
      count: stats.totalBatches,
    },
    {
      title: "حركات المخزون",
      description: "سجل جميع حركات المخزون",
      icon: TrendingUp,
      color: "text-indigo-500",
      path: "/stock-movements",
    },
    {
      title: "تعديلات المخزون",
      description: "جرد وتعديل الكميات",
      icon: RefreshCcw,
      color: "text-cyan-500",
      path: "/stock-adjustments",
    },
    {
      title: "التحويلات بين المخازن",
      description: "نقل البضائع بين المستودعات",
      icon: ArrowRightLeft,
      color: "text-pink-500",
      path: "/warehouse-transfers",
      count: stats.pendingTransfers,
    },
    {
      title: "مخزون المستودعات",
      description: "عرض المخزون لكل مستودع",
      icon: Layers,
      color: "text-teal-500",
      path: "/warehouse-stock",
    },
  ];

  const reports = [
    {
      title: "تقارير المخزون",
      description: "تقارير تفصيلية وتحليلات",
      icon: BarChart3,
      path: "/inventory-reports",
    },
    {
      title: "تقارير الصيدلة",
      description: "تقارير خاصة بالصيدليات",
      icon: FileText,
      path: "/pharmacy-reports",
    },
  ];

  const purchasing = [
    {
      title: "أوامر الشراء",
      description: "إدارة أوامر الشراء",
      icon: ShoppingCart,
      path: "/purchase-orders",
    },
    {
      title: "استلام البضاعة",
      description: "تسجيل استلام المشتريات",
      icon: PackageCheck,
      path: "/goods-receipts",
    },
    {
      title: "مرتجعات المشتريات",
      description: "إدارة مرتجعات الموردين",
      icon: PackageX,
      path: "/purchase-returns",
    },
  ];

  const settings = [
    {
      title: "إعدادات المنتجات",
      description: "قوالب الوحدات، الباركود، والمزيد",
      icon: Settings,
      path: "/product-settings",
    },
    {
      title: "إعدادات المخزون",
      description: "تكوين خيارات المخزون",
      icon: Target,
      path: "/inventory-settings",
    },
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
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">لوحة تحكم المخزون والمنتجات</h1>
          <p className="text-muted-foreground">إدارة شاملة للمخزون والمنتجات والمستودعات</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>
                  <p className="text-3xl font-bold">{stats.totalProducts}</p>
                </div>
                <Package className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">منخفض المخزون</p>
                  <p className="text-3xl font-bold text-red-500">{stats.lowStockProducts}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">منتهي الصلاحية قريبًا</p>
                  <p className="text-3xl font-bold text-yellow-500">{stats.expiringProducts}</p>
                </div>
                <Calendar className="h-10 w-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المستودعات</p>
                  <p className="text-3xl font-bold">{stats.totalWarehouses}</p>
                </div>
                <Warehouse className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">إدارة أساسية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(action.path)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${action.color}`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      {action.count !== undefined && (
                        <p className="text-2xl font-bold">{action.count}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{action.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Inventory Operations */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">عمليات المخزون</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventoryOperations.map((operation, index) => (
              <Card 
                key={index}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(operation.path)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <operation.icon className={`h-8 w-8 ${operation.color}`} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{operation.title}</h3>
                      <p className="text-sm text-muted-foreground">{operation.description}</p>
                      {operation.count !== undefined && operation.count > 0 && (
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            operation.count > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {operation.count} عنصر
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Purchasing */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">المشتريات</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {purchasing.map((item, index) => (
              <Card 
                key={index}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(item.path)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <item.icon className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Reports & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reports */}
          <div>
            <h2 className="text-2xl font-bold mb-4">التقارير</h2>
            <div className="space-y-4">
              {reports.map((report, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(report.path)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <report.icon className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold text-lg">{report.title}</h3>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div>
            <h2 className="text-2xl font-bold mb-4">الإعدادات</h2>
            <div className="space-y-4">
              {settings.map((setting, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(setting.path)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <setting.icon className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold text-lg">{setting.title}</h3>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;
