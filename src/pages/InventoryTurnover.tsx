import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { RotateCw, FileText, TrendingUp } from "lucide-react";

interface TurnoverData {
  product_id: string;
  product_name: string;
  category: string;
  beginning_inventory: number;
  purchases: number;
  sales: number;
  ending_inventory: number;
  cogs: number;
  average_inventory: number;
  turnover_ratio: number;
  days_to_sell: number;
  stock_status: string;
}

const InventoryTurnover = () => {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<TurnoverData[]>([]);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast({ title: "تنبيه", description: "يرجى تحديد الفترة الزمنية", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data: result, error } = await supabase.rpc("analyze_inventory_turnover", {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;

      setData(result as TurnoverData[]);
      toast({ title: "تم بنجاح", description: "تم إنشاء تقرير دوران المخزون" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      "نفذ من المخزون": { variant: "destructive", label: "نفذ من المخزون" },
      "مخزون منخفض": { variant: "outline", label: "مخزون منخفض" },
      "راكد": { variant: "secondary", label: "راكد" },
      "طبيعي": { variant: "default", label: "طبيعي" },
    };

    const config = statusConfig[status] || statusConfig["طبيعي"];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const exportToCSV = () => {
    if (!data.length) return;

    let csvContent = `تقرير دوران المخزون من ${startDate} إلى ${endDate}\n\n`;
    csvContent +=
      "المنتج,الفئة,مخزون بداية,مشتريات,مبيعات,مخزون نهاية,متوسط المخزون,معدل الدوران,أيام البيع,الحالة\n";

    data.forEach((item) => {
      csvContent += `${item.product_name},${item.category},${item.beginning_inventory},${item.purchases},${item.sales},${item.ending_inventory},${item.average_inventory.toFixed(2)},${item.turnover_ratio.toFixed(2)},${item.days_to_sell},${item.stock_status}\n`;
    });

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `دوران_المخزون_${startDate}_${endDate}.csv`);
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <RotateCw className="h-8 w-8 text-primary" />
            تحليل دوران المخزون
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
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">متوسط معدل الدوران</div>
                      <div className="text-2xl font-bold">
                        {(data.reduce((s, i) => s + Number(i.turnover_ratio), 0) / data.length).toFixed(2)}
                      </div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">منتجات نشطة</div>
                  <div className="text-2xl font-bold text-green-600">
                    {data.filter((i) => i.stock_status === "طبيعي").length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">منتجات راكدة</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {data.filter((i) => i.stock_status === "راكد").length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">منتجات نفذت</div>
                  <div className="text-2xl font-bold text-red-600">
                    {data.filter((i) => i.stock_status === "نفذ من المخزون").length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* جدول التفاصيل */}
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل دوران المخزون</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead className="text-right">مخزون البداية</TableHead>
                      <TableHead className="text-right">المبيعات</TableHead>
                      <TableHead className="text-right">مخزون النهاية</TableHead>
                      <TableHead className="text-right">معدل الدوران</TableHead>
                      <TableHead className="text-right">أيام البيع</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right">{item.beginning_inventory}</TableCell>
                        <TableCell className="text-right">{item.sales}</TableCell>
                        <TableCell className="text-right">{item.ending_inventory}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {item.turnover_ratio.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.days_to_sell >= 999 ? "∞" : item.days_to_sell.toFixed(0)}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.stock_status)}</TableCell>
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

export default InventoryTurnover;
