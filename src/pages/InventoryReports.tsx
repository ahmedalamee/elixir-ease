import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertCircle,
  BarChart3,
} from "lucide-react";

const InventoryReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [inventoryValue, setInventoryValue] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [turnoverData, setTurnoverData] = useState<any[]>([]);
  const [slowMovingData, setSlowMovingData] = useState<any[]>([]);
  const [valueByCategory, setValueByCategory] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
    fetchReports();
  }, []);

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
        fetchInventoryStats(),
        fetchTurnoverAnalysis(),
        fetchSlowMoving(),
        fetchValueByCategory(),
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

  const fetchInventoryStats = async () => {
    try {
      const { data: products, error } = await supabase
        .from("products")
        .select("quantity, cost_price, reorder_level")
        .eq("is_active", true);

      if (error) throw error;

      const value = products?.reduce(
        (sum, p) => sum + p.quantity * p.cost_price,
        0
      ) || 0;
      const lowStock = products?.filter(
        (p) => p.reorder_level && p.quantity <= p.reorder_level
      ).length || 0;

      setInventoryValue(value);
      setTotalProducts(products?.length || 0);
      setLowStockCount(lowStock);
    } catch (error) {
      console.error("Error fetching inventory stats:", error);
    }
  };

  const fetchTurnoverAnalysis = async () => {
    try {
      // Simulate turnover calculation (would need sales data)
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, quantity, cost_price")
        .eq("is_active", true)
        .limit(10);

      if (error) throw error;

      // Add mock turnover rate (in real app, calculate from sales)
      const enriched = products?.map((p) => ({
        ...p,
        turnoverRate: Math.random() * 10, // Mock data
        salesLast30Days: Math.floor(Math.random() * 100),
      })) || [];

      enriched.sort((a, b) => b.turnoverRate - a.turnoverRate);
      setTurnoverData(enriched);
    } catch (error) {
      console.error("Error fetching turnover analysis:", error);
    }
  };

  const fetchSlowMoving = async () => {
    try {
      // Products with low movement (mock data - would need actual sales analysis)
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, quantity, cost_price")
        .eq("is_active", true)
        .gt("quantity", 0)
        .limit(10);

      if (error) throw error;

      const enriched = products?.map((p) => ({
        ...p,
        daysInStock: Math.floor(Math.random() * 180) + 60, // Mock
        lastSale: new Date(
          Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000
        ),
      })) || [];

      enriched.sort((a, b) => b.daysInStock - a.daysInStock);
      setSlowMovingData(enriched);
    } catch (error) {
      console.error("Error fetching slow moving:", error);
    }
  };

  const fetchValueByCategory = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          quantity,
          cost_price,
          category:categories(name)
        `)
        .eq("is_active", true);

      if (error) throw error;

      const categoryMap = new Map();

      data?.forEach((product) => {
        const categoryName = product.category?.name || "غير مصنف";
        const value = product.quantity * product.cost_price;

        if (categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, categoryMap.get(categoryName) + value);
        } else {
          categoryMap.set(categoryName, value);
        }
      });

      const result = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setValueByCategory(result);
    } catch (error) {
      console.error("Error fetching value by category:", error);
    }
  };

  const getTurnoverBadge = (rate: number) => {
    if (rate > 7) {
      return <Badge className="bg-green-500">ممتاز</Badge>;
    } else if (rate > 4) {
      return <Badge className="bg-blue-500">جيد</Badge>;
    } else if (rate > 2) {
      return <Badge className="bg-yellow-500">متوسط</Badge>;
    } else {
      return <Badge variant="destructive">ضعيف</Badge>;
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
          <h1 className="text-3xl font-bold mb-2">تقارير المخزون المتقدمة</h1>
          <p className="text-muted-foreground">
            تحليل شامل لأداء المخزون ومؤشرات الأداء الرئيسية
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                قيمة المخزون الإجمالية
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inventoryValue.toFixed(2)} ر.س
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المنتجات</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                منتجات تحت حد الطلب
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                متوسط معدل الدوران
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {turnoverData.length > 0
                  ? (
                      turnoverData.reduce((sum, p) => sum + p.turnoverRate, 0) /
                      turnoverData.length
                    ).toFixed(1)
                  : "0.0"}
                x
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="turnover" className="space-y-4">
          <TabsList>
            <TabsTrigger value="turnover">تحليل الدوران</TabsTrigger>
            <TabsTrigger value="slowmoving">البطيء والراكد</TabsTrigger>
            <TabsTrigger value="value">القيمة حسب التصنيف</TabsTrigger>
          </TabsList>

          <TabsContent value="turnover">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  تحليل معدل دوران المخزون
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">الكمية المتاحة</TableHead>
                      <TableHead className="text-right">
                        المبيعات (30 يوم)
                      </TableHead>
                      <TableHead className="text-right">معدل الدوران</TableHead>
                      <TableHead className="text-right">التقييم</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {turnoverData.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>{product.quantity}</TableCell>
                        <TableCell>{product.salesLast30Days}</TableCell>
                        <TableCell>{product.turnoverRate.toFixed(2)}x</TableCell>
                        <TableCell>
                          {getTurnoverBadge(product.turnoverRate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="slowmoving">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  المنتجات البطيئة والراكدة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">القيمة</TableHead>
                      <TableHead className="text-right">
                        أيام في المخزون
                      </TableHead>
                      <TableHead className="text-right">آخر بيع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowMovingData.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>{product.quantity}</TableCell>
                        <TableCell>
                          {(product.quantity * product.cost_price).toFixed(2)} ر.س
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.daysInStock > 120
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {product.daysInStock} يوم
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {product.lastSale.toLocaleDateString("ar-SA")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="value">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  قيمة المخزون حسب التصنيف
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التصنيف</TableHead>
                      <TableHead className="text-right">القيمة الإجمالية</TableHead>
                      <TableHead className="text-right">النسبة المئوية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {valueByCategory.map((category) => (
                      <TableRow key={category.name}>
                        <TableCell className="font-medium">
                          {category.name}
                        </TableCell>
                        <TableCell>{category.value.toFixed(2)} ر.س</TableCell>
                        <TableCell>
                          <Badge>
                            {((category.value / inventoryValue) * 100).toFixed(1)}%
                          </Badge>
                        </TableCell>
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

export default InventoryReports;
