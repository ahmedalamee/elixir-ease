import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getIncomeStatement, type IncomeStatementData } from "@/lib/accounting";

const IncomeStatement = () => {
  const { toast } = useToast();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!fromDate || !toDate) {
      toast({ title: "تنبيه", description: "يرجى تحديد الفترة الزمنية", variant: "destructive" });
      return;
    }

    if (fromDate > toDate) {
      toast({ title: "خطأ", description: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const result = await getIncomeStatement({ fromDate, toDate, branchId: undefined });
      setData(result);
      toast({ title: "تم بنجاح", description: "تم إنشاء قائمة الدخل" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    let csvContent = `قائمة الدخل من ${fromDate} إلى ${toDate}\n\n`;
    csvContent += "الإيرادات\n";
    csvContent += "رمز الحساب,اسم الحساب,المبلغ\n";
    data.revenue.forEach((rev) => {
      csvContent += `${rev.accountCode},${rev.accountName},${rev.amount.toFixed(2)}\n`;
    });
    csvContent += `,,${data.totalRevenue.toFixed(2)}\n\n`;

    csvContent += "تكلفة البضاعة المباعة\n";
    csvContent += "رمز الحساب,اسم الحساب,المبلغ\n";
    data.cogs.forEach((cog) => {
      csvContent += `${cog.accountCode},${cog.accountName},${cog.amount.toFixed(2)}\n`;
    });
    csvContent += `,,${data.totalCogs.toFixed(2)}\n\n`;

    csvContent += `مجمل الربح,,${data.grossProfit.toFixed(2)}\n\n`;

    csvContent += "المصروفات\n";
    csvContent += "رمز الحساب,اسم الحساب,المبلغ\n";
    data.expenses.forEach((exp) => {
      csvContent += `${exp.accountCode},${exp.accountName},${exp.amount.toFixed(2)}\n`;
    });
    csvContent += `,,${data.totalExpenses.toFixed(2)}\n\n`;

    csvContent += `صافي الربح,,${data.netProfit.toFixed(2)}\n`;

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `قائمة_الدخل_${fromDate}_${toDate}.csv`);
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            قائمة الدخل
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
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label>إلى تاريخ</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={generateReport} disabled={loading}>
                  <FileText className="ml-2 h-4 w-4" />
                  {loading ? "جاري الإنشاء..." : "إنشاء التقرير"}
                </Button>
                {data && (
                  <Button onClick={exportToCSV} variant="outline">
                    تصدير CSV
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {data && (
          <Card>
            <CardHeader>
              <CardTitle>
                قائمة الدخل للفترة من {new Date(fromDate).toLocaleDateString("ar-SA")} إلى{" "}
                {new Date(toDate).toLocaleDateString("ar-SA")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* الإيرادات */}
              <div>
                <h3 className="text-lg font-bold mb-2 text-primary">الإيرادات</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رمز الحساب</TableHead>
                      <TableHead>اسم الحساب</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.revenue.map((rev, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{rev.accountCode}</TableCell>
                        <TableCell>{rev.accountName}</TableCell>
                        <TableCell className="text-right font-mono">{rev.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={2}>إجمالي الإيرادات</TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        {data.totalRevenue.toFixed(2)} ر.س
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* تكلفة البضاعة المباعة */}
              {data.cogs.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-2 text-destructive">تكلفة البضاعة المباعة</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رمز الحساب</TableHead>
                        <TableHead>اسم الحساب</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.cogs.map((cog, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{cog.accountCode}</TableCell>
                          <TableCell>{cog.accountName}</TableCell>
                          <TableCell className="text-right font-mono">
                            {cog.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted">
                        <TableCell colSpan={2}>إجمالي تكلفة البضاعة المباعة</TableCell>
                        <TableCell className="text-right font-mono text-lg">
                          {data.totalCogs.toFixed(2)} ر.س
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* مجمل الربح */}
              <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                <span className="font-bold text-lg">مجمل الربح</span>
                <span className="text-xl font-bold">{data.grossProfit.toFixed(2)} ر.س</span>
              </div>

              {/* المصروفات */}
              <div>
                <h3 className="text-lg font-bold mb-2 text-destructive">المصروفات التشغيلية</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رمز الحساب</TableHead>
                      <TableHead>اسم الحساب</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expenses.map((exp, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{exp.accountCode}</TableCell>
                        <TableCell>{exp.accountName}</TableCell>
                        <TableCell className="text-right font-mono">
                          {exp.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={2}>إجمالي المصروفات</TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        {data.totalExpenses.toFixed(2)} ر.س
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* صافي الربح */}
              <div
                className={`flex justify-between items-center p-6 rounded-lg ${
                  data.netProfit >= 0 ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <span className="font-bold text-2xl">صافي الربح (الخسارة)</span>
                <span className={`text-3xl font-bold ${data.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {data.netProfit.toFixed(2)} ر.س
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default IncomeStatement;
