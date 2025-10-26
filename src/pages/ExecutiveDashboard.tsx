import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ExecutiveDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // KPIs
  const [revenue, setRevenue] = useState({ current: 0, growth: 0 });
  const [profit, setProfit] = useState({ current: 0, margin: 0 });
  const [orders, setOrders] = useState({ current: 0, growth: 0 });
  const [customers, setCustomers] = useState({ current: 0, growth: 0 });

  // Charts
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<any[]>([]);
  const [cashFlowChart, setCashFlowChart] = useState<any[]>([]);

  // Alerts
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
    fetchDashboardData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchKPIs(),
        fetchRevenueChart(),
        fetchCategoryPerformance(),
        fetchCashFlow(),
        fetchAlerts(),
      ]);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIs = async () => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Revenue
      const { data: currentRevenue } = await (supabase as any)
        .from("sales_invoices")
        .select("total_amount, subtotal, tax_amount")
        .gte("invoice_date", thirtyDaysAgo.toISOString())
        .eq("status", "posted");

      const { data: previousRevenue } = await (supabase as any)
        .from("sales_invoices")
        .select("total_amount")
        .gte("invoice_date", sixtyDaysAgo.toISOString())
        .lt("invoice_date", thirtyDaysAgo.toISOString())
        .eq("status", "posted");

      const currentRev = currentRevenue?.reduce((sum: number, inv: any) => sum + inv.total_amount, 0) || 0;
      const previousRev = previousRevenue?.reduce((sum: number, inv: any) => sum + inv.total_amount, 0) || 1;
      const revenueGrowth = ((currentRev - previousRev) / previousRev) * 100;

      // Profit estimation (revenue - costs)
      const costs = currentRevenue?.reduce((sum: number, inv: any) => sum + (inv.subtotal * 0.6), 0) || 0; // Assume 60% COGS
      const profitAmount = currentRev - costs;
      const profitMargin = (profitAmount / currentRev) * 100;

      setRevenue({ current: currentRev, growth: revenueGrowth });
      setProfit({ current: profitAmount, margin: profitMargin });

      // Orders
      const currentOrderCount = currentRevenue?.length || 0;
      const previousOrderCount = previousRevenue?.length || 1;
      const orderGrowth = ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100;

      setOrders({ current: currentOrderCount, growth: orderGrowth });

      // Customers
      const { data: currentCustomers } = await supabase
        .from("customers")
        .select("id")
        .gte("created_at", thirtyDaysAgo.toISOString());

      const { data: previousCustomers } = await supabase
        .from("customers")
        .select("id")
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString());

      const currentCustCount = currentCustomers?.length || 0;
      const previousCustCount = previousCustomers?.length || 1;
      const customerGrowth = ((currentCustCount - previousCustCount) / previousCustCount) * 100;

      setCustomers({ current: currentCustCount, growth: customerGrowth });
    } catch (error) {
      console.error("Error fetching KPIs:", error);
    }
  };

  const fetchRevenueChart = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const { data } = await (supabase as any)
        .from("sales_invoices")
        .select("invoice_date, total_amount, subtotal")
        .gte("invoice_date", thirtyDaysAgo.toISOString())
        .eq("status", "posted")
        .order("invoice_date");

      const grouped = data?.reduce((acc: any, inv: any) => {
        const date = new Date(inv.invoice_date).toLocaleDateString("ar-SA", {
          month: "short",
          day: "numeric",
        });
        if (!acc[date]) {
          acc[date] = { date, revenue: 0, cost: 0 };
        }
        acc[date].revenue += inv.total_amount;
        acc[date].cost += inv.subtotal * 0.6; // Estimate
        return acc;
      }, {});

      const chartData = Object.values(grouped || {}).map((item: any) => ({
        ...item,
        profit: item.revenue - item.cost,
      }));

      setRevenueChart(chartData);
    } catch (error) {
      console.error("Error fetching revenue chart:", error);
    }
  };

  const fetchCategoryPerformance = async () => {
    try {
      const { data } = await (supabase as any)
        .from("si_items")
        .select(`
          line_total,
          qty,
          item:products(category:categories(name))
        `);

      const categoryMap = new Map();
      data?.forEach((item: any) => {
        const categoryName = item.item?.category?.name || "غير مصنف";
        if (categoryMap.has(categoryName)) {
          const existing = categoryMap.get(categoryName);
          categoryMap.set(categoryName, {
            name: categoryName,
            revenue: existing.revenue + item.line_total,
            quantity: existing.quantity + item.qty,
          });
        } else {
          categoryMap.set(categoryName, {
            name: categoryName,
            revenue: item.line_total,
            quantity: item.qty,
          });
        }
      });

      const result = Array.from(categoryMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setCategoryPerformance(result);
    } catch (error) {
      console.error("Error fetching category performance:", error);
    }
  };

  const fetchCashFlow = async () => {
    try {
      // Simplified cash flow (income - expenses)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const { data: income } = await (supabase as any)
        .from("sales_invoices")
        .select("invoice_date, total_amount")
        .gte("invoice_date", thirtyDaysAgo.toISOString())
        .eq("payment_status", "paid")
        .order("invoice_date");

      const grouped = income?.reduce((acc: any, inv: any) => {
        const date = new Date(inv.invoice_date).toLocaleDateString("ar-SA", {
          month: "short",
          day: "numeric",
        });
        if (!acc[date]) {
          acc[date] = { date, inflow: 0, outflow: 0 };
        }
        acc[date].inflow += inv.total_amount;
        return acc;
      }, {});

      // Add mock outflows
      Object.values(grouped || {}).forEach((item: any) => {
        item.outflow = item.inflow * 0.7; // Mock
        item.net = item.inflow - item.outflow;
      });

      setCashFlowChart(Object.values(grouped || {}));
    } catch (error) {
      console.error("Error fetching cash flow:", error);
    }
  };

  const fetchAlerts = async () => {
    const alertsList: any[] = [];

    try {
      // Low stock alerts
      const { data: lowStock } = await supabase
        .from("products")
        .select("name, quantity, reorder_level")
        .eq("is_active", true)
        .not("reorder_level", "is", null);

      lowStock?.forEach((product) => {
        if (product.quantity <= product.reorder_level) {
          alertsList.push({
            type: "warning",
            message: `المنتج "${product.name}" تحت حد الطلب (${product.quantity} متوفر)`,
          });
        }
      });

      // Expired batches
      const { data: expired } = await supabase
        .from("product_batches")
        .select("batch_number, product:products(name)")
        .lt("expiry_date", new Date().toISOString());

      if (expired && expired.length > 0) {
        alertsList.push({
          type: "error",
          message: `${expired.length} دفعة منتهية الصلاحية تحتاج معالجة`,
        });
      }

      // Pending transfers
      const { data: pendingTransfers } = await (supabase as any)
        .from("warehouse_transfers")
        .select("id")
        .eq("status", "pending");

      if (pendingTransfers && pendingTransfers.length > 0) {
        alertsList.push({
          type: "info",
          message: `${pendingTransfers.length} تحويل معلق بحاجة للمراجعة`,
        });
      }

      setAlerts(alertsList.slice(0, 5)); // Top 5 alerts
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  const KPICard = ({ title, value, growth, icon: Icon, format = "number" }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {format === "currency" ? `${value.toFixed(2)} ر.س` : value.toLocaleString()}
        </div>
        <div className="flex items-center gap-1 text-xs">
          {growth >= 0 ? (
            <>
              <ArrowUp className="w-3 h-3 text-green-600" />
              <span className="text-green-600">+{growth.toFixed(1)}%</span>
            </>
          ) : (
            <>
              <ArrowDown className="w-3 h-3 text-red-600" />
              <span className="text-red-600">{growth.toFixed(1)}%</span>
            </>
          )}
          <span className="text-muted-foreground">عن الفترة السابقة</span>
        </div>
      </CardContent>
    </Card>
  );

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">لوحة التحكم التنفيذية</h1>
          <p className="text-muted-foreground">
            نظرة شاملة على مؤشرات الأداء الرئيسية
          </p>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert, index) => (
              <Alert
                key={index}
                variant={alert.type === "error" ? "destructive" : "default"}
                className={
                  alert.type === "warning"
                    ? "bg-orange-50 border-orange-200"
                    : alert.type === "info"
                    ? "bg-blue-50 border-blue-200"
                    : ""
                }
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <KPICard
            title="الإيرادات (30 يوم)"
            value={revenue.current}
            growth={revenue.growth}
            icon={DollarSign}
            format="currency"
          />
          <KPICard
            title="الربح (30 يوم)"
            value={profit.current}
            growth={profit.margin}
            icon={TrendingUp}
            format="currency"
          />
          <KPICard
            title="الطلبات"
            value={orders.current}
            growth={orders.growth}
            icon={ShoppingCart}
          />
          <KPICard
            title="عملاء جدد"
            value={customers.current}
            growth={customers.growth}
            icon={Users}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>الإيرادات والأرباح (30 يوم)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="الإيرادات"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="الربح"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>أداء الفئات</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8884d8" name="الإيرادات (ر.س)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>التدفق النقدي</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashFlowChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="inflow" stroke="#82ca9d" name="التدفق الداخل" />
                <Line type="monotone" dataKey="outflow" stroke="#ff7c7c" name="التدفق الخارج" />
                <Line type="monotone" dataKey="net" stroke="#8884d8" name="الصافي" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
