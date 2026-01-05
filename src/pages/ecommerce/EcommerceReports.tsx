import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingCart,
  Download,
  Calendar
} from "lucide-react";
import { subDays, startOfMonth, endOfMonth } from "date-fns";

const EcommerceReports = () => {
  const [dateRange, setDateRange] = useState("7days");

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { from: now.toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
      case "7days":
        return { from: subDays(now, 7).toISOString(), to: now.toISOString() };
      case "30days":
        return { from: subDays(now, 30).toISOString(), to: now.toISOString() };
      case "month":
        return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() };
      default:
        return { from: subDays(now, 7).toISOString(), to: now.toISOString() };
    }
  };

  // تقارير الطلبات
  const { data: orderStats } = useQuery({
    queryKey: ["ecommerce-order-report", dateRange],
    queryFn: async () => {
      const { from, to } = getDateRange();
      const { data, error } = await supabase
        .from("ecommerce_orders")
        .select("*")
        .gte("created_at", from)
        .lte("created_at", to);

      if (error) throw error;

      const orders = data || [];
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount_bc || 0), 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      const statusCounts = orders.reduce((acc, o) => {
        const status = o.status || "pending";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const orderTypeCounts = orders.reduce((acc, o) => {
        const type = o.order_type || "retail";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalOrders,
        totalRevenue,
        avgOrderValue,
        statusCounts,
        orderTypeCounts,
        orders,
      };
    },
  });

  // تقارير العملاء
  const { data: customerStats } = useQuery({
    queryKey: ["ecommerce-customer-report", dateRange],
    queryFn: async () => {
      const { from, to } = getDateRange();
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .gte("created_at", from)
        .lte("created_at", to);

      if (error) throw error;

      const customers = data || [];
      const newCustomers = customers.length;

      return {
        newCustomers,
        customers,
      };
    },
  });

  // تقارير المنتجات الأكثر مبيعاً
  const { data: topProducts } = useQuery({
    queryKey: ["ecommerce-top-products", dateRange],
    queryFn: async () => {
      const { from, to } = getDateRange();
      const { data, error } = await supabase
        .from("ecommerce_order_items")
        .select(`
          product_id,
          product_name,
          quantity,
          unit_price_bc,
          ecommerce_orders!inner(created_at)
        `)
        .gte("ecommerce_orders.created_at", from)
        .lte("ecommerce_orders.created_at", to);

      if (error) throw error;

      // تجميع حسب المنتج
      const productMap = new Map();
      (data || []).forEach((item: any) => {
        const existing = productMap.get(item.product_id) || {
          product_name: item.product_name,
          total_quantity: 0,
          total_revenue: 0,
        };
        existing.total_quantity += item.quantity;
        existing.total_revenue += item.quantity * item.unit_price_bc;
        productMap.set(item.product_id, existing);
      });

      return Array.from(productMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statusLabels: Record<string, string> = {
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    processing: "قيد المعالجة",
    shipped: "تم الشحن",
    delivered: "تم التسليم",
    cancelled: "ملغي",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <main className="flex-1 p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">تقارير المتجر الإلكتروني</h1>
              <p className="text-muted-foreground">تحليلات وإحصائيات الأداء</p>
            </div>
            <div className="flex gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <Calendar className="h-4 w-4 ml-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="7days">آخر 7 أيام</SelectItem>
                  <SelectItem value="30days">آخر 30 يوم</SelectItem>
                  <SelectItem value="month">هذا الشهر</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="h-4 w-4 ml-2" />
                تصدير
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orderStats?.totalOrders || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(orderStats?.totalRevenue || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">متوسط قيمة الطلب</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(orderStats?.avgOrderValue || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">عملاء جدد</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerStats?.newCustomers || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="orders" className="space-y-4">
            <TabsList>
              <TabsTrigger value="orders">تقارير الطلبات</TabsTrigger>
              <TabsTrigger value="products">المنتجات الأكثر مبيعاً</TabsTrigger>
              <TabsTrigger value="customers">تقارير العملاء</TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>حسب الحالة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(orderStats?.statusCounts || {}).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center">
                          <Badge variant="outline">{statusLabels[status] || status}</Badge>
                          <span className="font-bold">{count as number}</span>
                        </div>
                      ))}
                      {Object.keys(orderStats?.statusCounts || {}).length === 0 && (
                        <p className="text-muted-foreground text-center">لا توجد بيانات</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>حسب النوع</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(orderStats?.orderTypeCounts || {}).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center">
                          <Badge variant="outline">
                            {type === "retail" ? "تجزئة" : "جملة"}
                          </Badge>
                          <span className="font-bold">{count as number}</span>
                        </div>
                      ))}
                      {Object.keys(orderStats?.orderTypeCounts || {}).length === 0 && (
                        <p className="text-muted-foreground text-center">لا توجد بيانات</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>أكثر 10 منتجات مبيعاً</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>المنتج</TableHead>
                        <TableHead>الكمية المباعة</TableHead>
                        <TableHead>الإيرادات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts?.map((product: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{product.product_name}</TableCell>
                          <TableCell>{product.total_quantity}</TableCell>
                          <TableCell>{formatCurrency(product.total_revenue)}</TableCell>
                        </TableRow>
                      ))}
                      {(!topProducts || topProducts.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            لا توجد بيانات
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers">
              <Card>
                <CardHeader>
                  <CardTitle>إحصائيات العملاء</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-2xl font-bold">{customerStats?.newCustomers || 0}</p>
                    <p className="text-muted-foreground">عميل جديد في الفترة المحددة</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default EcommerceReports;
