import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Package, Users } from "lucide-react";

const SalesReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  // Stats
  const [totalSales, setTotalSales] = useState(0);
  const [salesGrowth, setSalesGrowth] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);

  // Charts data
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  useEffect(() => {
    checkAuth();
    fetchReports();
  }, [dateFrom, dateTo, period]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSalesStats(),
        fetchSalesTrend(),
        fetchSalesByCategory(),
        fetchTopProducts(),
        fetchTopCustomers(),
      ]);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل التقارير",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesStats = async () => {
    try {
      const { data: currentPeriod } = await (supabase as any)
        .from("sales_invoices")
        .select("total_amount")
        .gte("invoice_date", dateFrom)
        .lte("invoice_date", dateTo)
        .eq("status", "posted");

      const total = currentPeriod?.reduce((sum: number, inv: any) => sum + inv.total_amount, 0) || 0;
      const orders = currentPeriod?.length || 0;

      // Previous period for comparison
      const daysDiff = Math.ceil(
        (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24)
      );
      const prevDateFrom = new Date(new Date(dateFrom).getTime() - daysDiff * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const { data: previousPeriod } = await (supabase as any)
        .from("sales_invoices")
        .select("total_amount")
        .gte("invoice_date", prevDateFrom)
        .lt("invoice_date", dateFrom)
        .eq("status", "posted");

      const prevTotal = previousPeriod?.reduce((sum: number, inv: any) => sum + inv.total_amount, 0) || 1;
      const growth = ((total - prevTotal) / prevTotal) * 100;

      setTotalSales(total);
      setTotalOrders(orders);
      setAvgOrderValue(orders > 0 ? total / orders : 0);
      setSalesGrowth(growth);
    } catch (error) {
      console.error("Error fetching sales stats:", error);
    }
  };

  const fetchSalesTrend = async () => {
    try {
      const { data } = await (supabase as any)
        .from("sales_invoices")
        .select("invoice_date, total_amount")
        .gte("invoice_date", dateFrom)
        .lte("invoice_date", dateTo)
        .eq("status", "posted")
        .order("invoice_date");

      // Group by date
      const grouped = data?.reduce((acc: any, inv: any) => {
        const date = new Date(inv.invoice_date).toLocaleDateString("ar-SA");
        if (!acc[date]) {
          acc[date] = { date, amount: 0, count: 0 };
        }
        acc[date].amount += inv.total_amount;
        acc[date].count += 1;
        return acc;
      }, {});

      setSalesTrend(Object.values(grouped || {}));
    } catch (error) {
      console.error("Error fetching sales trend:", error);
    }
  };

  const fetchSalesByCategory = async () => {
    try {
      const { data } = await (supabase as any)
        .from("si_items")
        .select(`
          line_total,
          item:products(category:categories(name))
        `);

      const categoryMap = new Map();
      data?.forEach((item: any) => {
        const categoryName = item.item?.category?.name || "غير مصنف";
        if (categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, categoryMap.get(categoryName) + item.line_total);
        } else {
          categoryMap.set(categoryName, item.line_total);
        }
      });

      const result = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
      }));

      setSalesByCategory(result);
    } catch (error) {
      console.error("Error fetching sales by category:", error);
    }
  };

  const fetchTopProducts = async () => {
    try {
      const { data } = await (supabase as any)
        .from("si_items")
        .select(`
          qty,
          line_total,
          item:products(name)
        `);

      const productMap = new Map();
      data?.forEach((item: any) => {
        const productName = item.item?.name || "غير معروف";
        if (productMap.has(productName)) {
          const existing = productMap.get(productName);
          productMap.set(productName, {
            name: productName,
            qty: existing.qty + item.qty,
            revenue: existing.revenue + item.line_total,
          });
        } else {
          productMap.set(productName, {
            name: productName,
            qty: item.qty,
            revenue: item.line_total,
          });
        }
      });

      const result = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setTopProducts(result);
    } catch (error) {
      console.error("Error fetching top products:", error);
    }
  };

  const fetchTopCustomers = async () => {
    try {
      const { data } = await (supabase as any)
        .from("sales_invoices")
        .select(`
          total_amount,
          customer:customers(name)
        `)
        .gte("invoice_date", dateFrom)
        .lte("invoice_date", dateTo)
        .eq("status", "posted");

      const customerMap = new Map();
      data?.forEach((inv: any) => {
        const customerName = inv.customer?.name || "عميل نقدي";
        if (customerMap.has(customerName)) {
          const existing = customerMap.get(customerName);
          customerMap.set(customerName, {
            name: customerName,
            total: existing.total + inv.total_amount,
            orders: existing.orders + 1,
          });
        } else {
          customerMap.set(customerName, {
            name: customerName,
            total: inv.total_amount,
            orders: 1,
          });
        }
      });

      const result = Array.from(customerMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setTopCustomers(result);
    } catch (error) {
      console.error("Error fetching top customers:", error);
    }
  };

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
          <h1 className="text-3xl font-bold mb-2">تقارير المبيعات الشاملة</h1>
          <p className="text-muted-foreground">
            تحليل شامل لأداء المبيعات والاتجاهات
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div>
                <Label>الفترة</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">يومي</SelectItem>
                    <SelectItem value="week">أسبوعي</SelectItem>
                    <SelectItem value="month">شهري</SelectItem>
                    <SelectItem value="year">سنوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchReports} className="w-full">
                  تطبيق
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSales.toFixed(2)} ر.س</div>
              <div
                className={`text-xs flex items-center gap-1 ${
                  salesGrowth >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {salesGrowth >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(salesGrowth).toFixed(1)}% عن الفترة السابقة
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">عدد الطلبات</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">متوسط قيمة الطلب</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgOrderValue.toFixed(2)} ر.س</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">عملاء نشطين</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topCustomers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables */}
        <Tabs defaultValue="trend" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trend">اتجاه المبيعات</TabsTrigger>
            <TabsTrigger value="category">حسب الفئة</TabsTrigger>
            <TabsTrigger value="products">أفضل المنتجات</TabsTrigger>
            <TabsTrigger value="customers">أفضل العملاء</TabsTrigger>
          </TabsList>

          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>اتجاه المبيعات</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#8884d8"
                      name="المبيعات (ر.س)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="category">
            <Card>
              <CardHeader>
                <CardTitle>المبيعات حسب الفئة</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={salesByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {salesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>أفضل 10 منتجات</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">الكمية المباعة</TableHead>
                      <TableHead className="text-right">الإيرادات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.qty}</TableCell>
                        <TableCell>{product.revenue.toFixed(2)} ر.س</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>أفضل 10 عملاء</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">عدد الطلبات</TableHead>
                      <TableHead className="text-right">إجمالي المشتريات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((customer, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.orders}</TableCell>
                        <TableCell>{customer.total.toFixed(2)} ر.س</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SalesReports;
