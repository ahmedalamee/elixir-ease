import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { ChartOfAccountsPanel } from "@/components/accounting/ChartOfAccountsPanel";
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  DollarSign,
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    totalSales: 0,
    totalCustomers: 0,
  });

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
      const [productsRes, salesRes, customersRes] = await Promise.all([
        supabase.from("products").select("*", { count: "exact" }),
        supabase.from("sales").select("final_amount"),
        supabase.from("customers").select("*", { count: "exact" }),
      ]);

      const lowStock = productsRes.data?.filter(
        (p) => p.quantity <= p.min_quantity
      ).length || 0;

      const totalSalesAmount = salesRes.data?.reduce(
        (sum, sale) => sum + Number(sale.final_amount),
        0
      ) || 0;

      setStats({
        totalProducts: productsRes.count || 0,
        lowStockProducts: lowStock,
        totalSales: totalSalesAmount,
        totalCustomers: customersRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };


  const statCards = [
    {
      title: "إجمالي المنتجات",
      value: stats.totalProducts,
      icon: Package,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "المنتجات منخفضة المخزون",
      value: stats.lowStockProducts,
      icon: AlertTriangle,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "إجمالي المبيعات",
      value: `${stats.totalSales.toFixed(2)} ر.س`,
      icon: DollarSign,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "إجمالي العملاء",
      value: stats.totalCustomers,
      icon: Users,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  const quickActions = [
    {
      title: "نقاط البيع",
      description: "بيع المنتجات وإصدار الفواتير",
      icon: ShoppingCart,
      color: "from-primary to-primary-hover",
      path: "/pos",
    },
    {
      title: "إدارة المنتجات",
      description: "عرض وتعديل المنتجات",
      icon: Package,
      color: "from-blue-500 to-blue-600",
      path: "/products",
    },
    {
      title: "المبيعات",
      description: "عرض سجل المبيعات والتقارير",
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
      path: "/sales",
    },
    {
      title: "العملاء",
      description: "إدارة بيانات العملاء",
      icon: Users,
      color: "from-purple-500 to-purple-600",
      path: "/customers",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="card-elegant overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">الإجراءات السريعة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Card
                  key={index}
                  className="card-elegant cursor-pointer group hover:scale-[1.02] transition-transform"
                  onClick={() => navigate(action.path)}
                >
                  <div className="space-y-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Chart of Accounts Panel */}
        <ChartOfAccountsPanel />
      </main>
    </div>
  );
};

export default Dashboard;
