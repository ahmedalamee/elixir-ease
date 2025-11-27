import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { TrendingUp, Package, FileText } from "lucide-react";

interface ProductProfitability {
  product_id: string;
  product_name: string;
  category: string;
  total_quantity_sold: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  profit_margin: number;
  avg_selling_price: number;
  inventory_turnover: number;
}

const ProductProfitability = () => {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<ProductProfitability[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    avgMargin: 0,
  });

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast({ title: "تنبيه", description: "يرجى تحديد الفترة الزمنية", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data: result, error } = await supabase.rpc("analyze_product_profitability", {
        p_start_date: startDate,
        p_end_date: endDate,
        p_product_category: null,
      });

      if (error) throw error;

      const products = result as ProductProfitability[];
      setData(products);

      const totalRevenue = products.reduce((sum, p) => sum + Number(p.total_revenue), 0);
      const totalCost = products.reduce((sum, p) => sum + Number(p.total_cost), 0);
      const totalProfit = totalRevenue - totalCost;
      const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      setSummary({
        totalRevenue,
        totalCost,
        totalProfit,
        avgMargin,
      });

      toast({ title: "تم بنجاح", description: "تم إنشاء تقرير ربحية المنتجات" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data.length) return;

    let csvContent = `تقرير ربحية المنتجات من ${startDate} إلى ${endDate}\n\n`;
    csvContent +=
      "اسم المنتج,الفئة,الكمية المباعة,الإيرادات,التكلفة,الربح الإجمالي,هامش الربح %,متوسط سعر البيع,معدل الدوران\n";

    data.forEach((item) => {
      csvContent += `${item.product_name},${item.category},${item.total_quantity_sold},${item.total_revenue.toFixed(2)},${item.total_cost.toFixed(2)},${item.gross_profit.toFixed(2)},${item.profit_margin}%,${item.avg_selling_price.toFixed(2)},${item.inventory_turnover}\n`;
    });

    csvContent += `\nالإجمالي,,${data.reduce((s, i) => s + i.total_quantity_sold, 0)},${summary.totalRevenue.toFixed(2)},${summary.totalCost.toFixed(2)},${summary.totalProfit.toFixed(2)},${summary.avgMargin.toFixed(2)}%,,\n`;

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ربحية_المنتجات_${startDate}_${endDate}.csv`);
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            تقرير ربحية المنتجات
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
              <div className="flex items-end gap-2">
                <Button onClick={generateReport} disabled={loading}>
                  <FileText className="ml-2 h-4 w-4" />
                  {loading ? "جاري الإنشاء..." : "إنشاء التقرير"}
                </Button>
                {data.length > 0 && (
                  <Button onClick={exportToCSV} variant="outline">
                    تصدير CSV
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {data.length > 0 && (
          <>
            {/* ملخص الأداء */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">إجمالي الإيرادات</div>
                  <div className="text-2xl font-bold">{summary.totalRevenue.toFixed(2)} ر.س</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">إجمالي التكلفة</div>
                  <div className="text-2xl font-bold">{summary.totalCost.toFixed(2)} ر.س</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">إجمالي الربح</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {summary.totalProfit.toFixed(2)} ر.س
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">متوسط هامش الربح</div>
                  <div className="text-2xl font-bold flex items-center gap-1">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    {summary.avgMargin.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* جدول المنتجات */}
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل ربحية المنتجات</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">الإيرادات</TableHead>
                      <TableHead className="text-right">التكلفة</TableHead>
                      <TableHead className="text-right">الربح</TableHead>
                      <TableHead className="text-right">هامش الربح</TableHead>
                      <TableHead className="text-right">معدل الدوران</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right">{item.total_quantity_sold}</TableCell>
                        <TableCell className="text-right font-mono">
                          {item.total_revenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">{item.total_cost.toFixed(2)}</TableCell>
                        <TableCell
                          className={`text-right font-mono font-semibold ${
                            item.gross_profit > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {item.gross_profit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span
                            className={`px-2 py-1 rounded text-sm ${
                              item.profit_margin >= 30
                                ? "bg-green-100 text-green-700"
                                : item.profit_margin >= 15
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.profit_margin}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.inventory_turnover.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductProfitability;
