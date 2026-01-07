import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Users, 
  Package, 
  TrendingUp, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Truck
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ar } from "date-fns/locale";

const EcommerceDashboard = () => {
  // إحصائيات الطلبات
  const { data: orderStats } = useQuery({
    queryKey: ["ecommerce-order-stats"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const today = new Date().toISOString().split('T')[0];
      
      const [allOrders, newOrders, todayOrders, pendingOrders] = await Promise.all([
        supabase.from("ecommerce_orders").select("id, status, total_amount_bc", { count: "exact" }),
        supabase.from("ecommerce_orders").select("id", { count: "exact" }).gte("created_at", sevenDaysAgo),
        supabase.from("ecommerce_orders").select("id", { count: "exact" }).gte("created_at", today),
        supabase.from("ecommerce_orders").select("id", { count: "exact" }).eq("status", "pending"),
      ]);

      const totalRevenue = allOrders.data?.reduce((sum, o) => sum + (o.total_amount_bc || 0), 0) || 0;

      return {
        total: allOrders.count || 0,
        newOrders: newOrders.count || 0,
        todayOrders: todayOrders.count || 0,
        pending: pendingOrders.count || 0,
        totalRevenue,
      };
    },
  });

  // إحصائيات العملاء
  const { data: customerStats } = useQuery({
    queryKey: ["ecommerce-customer-stats"],
    queryFn: async () => {
      const [allCustomers, wholesaleRequests] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact" }),
        supabase.from("wholesale_account_requests").select("id", { count: "exact" }).eq("status", "pending"),
      ]);

      return {
        total: allCustomers.count || 0,
        pendingWholesale: wholesaleRequests.count || 0,
      };
    },
  });

  // المنتجات
  const { data: productStats } = useQuery({
    queryKey: ["ecommerce-product-stats"],
    queryFn: async () => {
      const [activeProducts, lowStockProducts] = await Promise.all([
        supabase.from("ecommerce_products").select("id", { count: "exact", head: true }).eq("is_available", true),
        supabase.from("products").select("id", { count: "exact", head: true }).lt("stock_quantity", 10),
      ]);
      
      return { 
        total: activeProducts.count || 0, 
        lowStock: lowStockProducts.count || 0 
      };
    },
  });

  // آخر الطلبات
  const { data: recentOrders } = useQuery({
    queryKey: ["ecommerce-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ecommerce_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    pending: { label: "قيد الانتظار", variant: "secondary", icon: <Clock className="h-4 w-4" /> },
    confirmed: { label: "مؤكد", variant: "default", icon: <CheckCircle className="h-4 w-4" /> },
    processing: { label: "قيد المعالجة", variant: "default", icon: <Package className="h-4 w-4" /> },
    shipped: { label: "تم الشحن", variant: "default", icon: <Truck className="h-4 w-4" /> },
    delivered: { label: "تم التسليم", variant: "default", icon: <CheckCircle className="h-4 w-4" /> },
    cancelled: { label: "ملغي", variant: "destructive", icon: <XCircle className="h-4 w-4" /> },
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">لوحة تحكم المتجر الإلكتروني</h1>
            <p className="text-muted-foreground">نظرة عامة على أداء المتجر</p>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orderStats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{orderStats?.newOrders || 0} طلب جديد (7 أيام)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">طلبات اليوم</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orderStats?.todayOrders || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {orderStats?.pending || 0} قيد الانتظار
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">العملاء</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerStats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {customerStats?.pendingWholesale || 0} طلب جملة معلق
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(orderStats?.totalRevenue || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {productStats?.total || 0} منتج نشط
                </p>
              </CardContent>
            </Card>
          </div>

          {/* تنبيهات */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-sm font-medium">تنبيهات المخزون</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {productStats?.lowStock || 0} منتج بمخزون منخفض
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-sm font-medium">طلبات معلقة</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {orderStats?.pending || 0} طلب بحاجة للمراجعة
                </p>
              </CardContent>
            </Card>
          </div>

          {/* آخر الطلبات */}
          <Card>
            <CardHeader>
              <CardTitle>آخر الطلبات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders?.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.customer_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={statusConfig[order.status || "pending"]?.variant || "secondary"}>
                        {statusConfig[order.status || "pending"]?.label || order.status}
                      </Badge>
                      <span className="font-medium">
                        {formatCurrency(order.total_amount_bc || 0)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {order.created_at && format(new Date(order.created_at), "dd MMM", { locale: ar })}
                      </span>
                    </div>
                  </div>
                ))}
                {(!recentOrders || recentOrders.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد طلبات حتى الآن
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default EcommerceDashboard;
