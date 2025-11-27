import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { PieChart, FileText } from "lucide-react";

interface CategoryRevenue {
  category_name: string;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  profit_margin: number;
  quantity_sold: number;
  invoice_count: number;
  revenue_percentage: number;
}

const RevenueByCategory = () => {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<CategoryRevenue[]>([]);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast({ title: "تنبيه", description: "يرجى تحديد الفترة الزمنية", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data: result, error } = await supabase.rpc("analyze_revenue_by_category", {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;

      setData(result as CategoryRevenue[]);
      toast({ title: "تم بنجاح", description: "تم إنشاء تقرير الإيرادات حسب الفئة" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data.length) return;

    let csvContent = `تقرير الإيرادات حسب الفئة من ${startDate} إلى ${endDate}\n\n`;
    csvContent +=
      "الفئة,الإيرادات,التكلفة,الربح الإجمالي,هامش الربح %,الكمية المباعة,عدد الفواتير,نسبة الإيرادات %\n";

    data.forEach((item) => {
      csvContent += `${item.category_name},${item.total_revenue.toFixed(2)},${item.total_cost.toFixed(2)},${item.gross_profit.toFixed(2)},${item.profit_margin}%,${item.quantity_sold},${item.invoice_count},${item.revenue_percentage}%\n`;
    });

    const totalRevenue = data.reduce((s, i) => s + Number(i.total_revenue), 0);
    const totalCost = data.reduce((s, i) => s + Number(i.total_cost), 0);
    const totalProfit = totalRevenue - totalCost;

    csvContent += `\nالإجمالي,${totalRevenue.toFixed(2)},${totalCost.toFixed(2)},${totalProfit.toFixed(2)},${((totalProfit / totalRevenue) * 100).toFixed(2)}%,,, 100%\n`;

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `الإيرادات_حسب_الفئة_${startDate}_${endDate}.csv`);
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PieChart className="h-8 w-8 text-primary" />
            تحليل الإيرادات حسب الفئة
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
            {/* المخطط البياني للنسب */}
            <Card>
              <CardHeader>
                <CardTitle>توزيع الإيرادات حسب الفئة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.category_name}</span>
                        <span className="text-muted-foreground">
                          {item.revenue_percentage.toFixed(1)}% ({item.total_revenue.toFixed(2)} ر.س)
                        </span>
                      </div>
                      <div className="h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                          style={{ width: `${item.revenue_percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* جدول التفاصيل */}
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل الإيرادات والربحية حسب الفئة</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الفئة</TableHead>
                      <TableHead className="text-right">الإيرادات</TableHead>
                      <TableHead className="text-right">التكلفة</TableHead>
                      <TableHead className="text-right">الربح</TableHead>
                      <TableHead className="text-right">هامش الربح</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">الفواتير</TableHead>
                      <TableHead className="text-right">نسبة الإيرادات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.category_name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {item.total_revenue.toFixed(2)} ر.س
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.total_cost.toFixed(2)} ر.س
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-green-600">
                          {item.gross_profit.toFixed(2)} ر.س
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`px-2 py-1 rounded text-sm font-mono ${
                              item.profit_margin >= 30
                                ? "bg-green-100 text-green-700"
                                : item.profit_margin >= 15
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.profit_margin.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity_sold}</TableCell>
                        <TableCell className="text-right">{item.invoice_count}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {item.revenue_percentage.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell>الإجمالي</TableCell>
                      <TableCell className="text-right font-mono">
                        {data.reduce((s, i) => s + Number(i.total_revenue), 0).toFixed(2)} ر.س
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {data.reduce((s, i) => s + Number(i.total_cost), 0).toFixed(2)} ر.س
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {data.reduce((s, i) => s + Number(i.gross_profit), 0).toFixed(2)} ر.س
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {(
                          (data.reduce((s, i) => s + Number(i.gross_profit), 0) /
                            data.reduce((s, i) => s + Number(i.total_revenue), 0)) *
                          100
                        ).toFixed(1)}
                        %
                      </TableCell>
                      <TableCell className="text-right">
                        {data.reduce((s, i) => s + Number(i.quantity_sold), 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {data.reduce((s, i) => s + Number(i.invoice_count), 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">100%</TableCell>
                    </TableRow>
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

export default RevenueByCategory;
