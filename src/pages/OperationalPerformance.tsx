import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Activity, FileText, ShoppingCart, Users, Package, TrendingUp } from "lucide-react";

interface OperationalData {
  period: {
    start_date: string;
    end_date: string;
  };
  sales_metrics: {
    total_invoices: number;
    total_revenue: number;
    average_invoice_value: number;
    total_items_sold: number;
  };
  top_selling_products: Array<{
    product_name: string;
    quantity_sold: number;
    revenue: number;
  }>;
  customer_metrics: {
    total_customers: number;
    repeat_customers: number;
    average_purchase_per_customer: number;
  };
  inventory_metrics: {
    total_stock_value: number;
    low_stock_items: number;
    out_of_stock_items: number;
  };
}

const OperationalPerformance = () => {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<OperationalData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast({ title: "تنبيه", description: "يرجى تحديد الفترة الزمنية", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data: result, error } = await supabase.rpc("get_operational_performance", {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;

      setData(result as unknown as OperationalData);
      toast({ title: "تم بنجاح", description: "تم إنشاء تقرير الأداء التشغيلي" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            تقرير الأداء التشغيلي
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>إعدادات التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>من تاريخ</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label>إلى تاريخ</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={generateReport} disabled={loading}>
                  <FileText className="ml-2 h-4 w-4" />
                  {loading ? "جاري الإنشاء..." : "إنشاء التقرير"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {data && (
          <>
            {/* مقاييس المبيعات */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  مقاييس المبيعات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">عدد الفواتير</div>
                    <div className="text-2xl font-bold">{data.sales_metrics.total_invoices}</div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">إجمالي الإيرادات</div>
                    <div className="text-2xl font-bold">
                      {Number(data.sales_metrics.total_revenue).toFixed(2)} ر.س
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">متوسط قيمة الفاتورة</div>
                    <div className="text-2xl font-bold">
                      {Number(data.sales_metrics.average_invoice_value).toFixed(2)} ر.س
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">إجمالي المنتجات المباعة</div>
                    <div className="text-2xl font-bold">{data.sales_metrics.total_items_sold}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* المنتجات الأكثر مبيعاً */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  أفضل 10 منتجات مبيعاً
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>اسم المنتج</TableHead>
                      <TableHead className="text-right">الكمية المباعة</TableHead>
                      <TableHead className="text-right">الإيرادات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.top_selling_products?.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-bold">{index + 1}</TableCell>
                        <TableCell>{product.product_name}</TableCell>
                        <TableCell className="text-right">{product.quantity_sold}</TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(product.revenue).toFixed(2)} ر.س
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* مقاييس العملاء */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    مقاييس العملاء
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>إجمالي العملاء</span>
                    <span className="text-xl font-bold">{data.customer_metrics.total_customers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>العملاء المتكررين</span>
                    <span className="text-xl font-bold">{data.customer_metrics.repeat_customers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>متوسط الشراء للعميل</span>
                    <span className="text-xl font-bold">
                      {Number(data.customer_metrics.average_purchase_per_customer).toFixed(2)} ر.س
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">نسبة العملاء المتكررين</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {data.customer_metrics.total_customers > 0
                        ? (
                            (data.customer_metrics.repeat_customers / data.customer_metrics.total_customers) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* مقاييس المخزون */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    مقاييس المخزون
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>قيمة المخزون الإجمالية</span>
                    <span className="text-xl font-bold">
                      {Number(data.inventory_metrics.total_stock_value).toFixed(2)} ر.س
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <span>منتجات بمخزون منخفض</span>
                    <span className="text-xl font-bold text-orange-600">
                      {data.inventory_metrics.low_stock_items}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <span>منتجات نفذت من المخزون</span>
                    <span className="text-xl font-bold text-red-600">
                      {data.inventory_metrics.out_of_stock_items}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OperationalPerformance;
