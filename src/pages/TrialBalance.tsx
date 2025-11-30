import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Scale, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getTrialBalance, type TrialBalanceRow } from "@/lib/accounting";

const TrialBalance = () => {
  const { toast } = useToast();
  const [fromDate, setFromDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [balances, setBalances] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);

  const generateTrialBalance = async () => {
    if (!fromDate || !toDate) {
      toast({ title: "تنبيه", description: "يرجى تحديد الفترة الزمنية", variant: "destructive" });
      return;
    }

    if (fromDate > toDate) {
      toast({ title: "تنبيه", description: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // استخدام دالة getTrialBalance من النظام المحاسبي الجديد
      const trialBalanceData = await getTrialBalance({
        fromDate,
        toDate,
        branchId: null, // يمكن إضافة فلتر للفرع لاحقاً
      });

      // حساب الإجماليات من closing balances
      let totalDebitSum = 0;
      let totalCreditSum = 0;

      trialBalanceData.forEach((row) => {
        totalDebitSum += row.closingDebit;
        totalCreditSum += row.closingCredit;
      });

      setBalances(trialBalanceData);
      setTotalDebit(totalDebitSum);
      setTotalCredit(totalCreditSum);

      toast({ title: "تم بنجاح", description: "تم إنشاء ميزان المراجعة" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateTrialBalance();
  }, []);

  const getAccountTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      asset: "أصول",
      liability: "خصوم",
      equity: "حقوق ملكية",
      revenue: "إيرادات",
      expense: "مصروفات",
      cogs: "تكلفة البضاعة",
    };
    return types[type] || type;
  };

  const exportToCSV = () => {
    let csvContent = "رمز الحساب,اسم الحساب,النوع,رصيد افتتاحي مدين,رصيد افتتاحي دائن,حركة مدين,حركة دائن,رصيد ختامي مدين,رصيد ختامي دائن\n";
    balances.forEach((account) => {
      csvContent += `${account.accountCode},${account.accountName},${getAccountTypeLabel(account.accountType)},${account.openingDebit.toFixed(2)},${account.openingCredit.toFixed(2)},${account.periodDebit.toFixed(2)},${account.periodCredit.toFixed(2)},${account.closingDebit.toFixed(2)},${account.closingCredit.toFixed(2)}\n`;
    });
    csvContent += `,,الإجمالي,,,,,${totalDebit.toFixed(2)},${totalCredit.toFixed(2)}\n`;

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ميزان_المراجعة_${fromDate}_إلى_${toDate}.csv`);
    link.click();
  };

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Scale className="h-8 w-8" />
            ميزان المراجعة
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
                <Button onClick={generateTrialBalance} disabled={loading}>
                  <FileText className="ml-2 h-4 w-4" />
                  {loading ? "جاري الإنشاء..." : "إنشاء التقرير"}
                </Button>
                {balances.length > 0 && (
                  <Button onClick={exportToCSV} variant="outline">
                    تصدير CSV
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              ميزان المراجعة للفترة من {new Date(fromDate).toLocaleDateString("ar-SA")} إلى{" "}
              {new Date(toDate).toLocaleDateString("ar-SA")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رمز الحساب</TableHead>
                  <TableHead>اسم الحساب</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead className="text-right">رصيد افتتاحي مدين</TableHead>
                  <TableHead className="text-right">رصيد افتتاحي دائن</TableHead>
                  <TableHead className="text-right">حركة مدين</TableHead>
                  <TableHead className="text-right">حركة دائن</TableHead>
                  <TableHead className="text-right">رصيد ختامي مدين</TableHead>
                  <TableHead className="text-right">رصيد ختامي دائن</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      لا توجد حسابات بأرصدة
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {balances.map((account) => (
                      <TableRow key={account.accountId}>
                        <TableCell className="font-mono">{account.accountCode}</TableCell>
                        <TableCell>{account.accountName}</TableCell>
                        <TableCell>{getAccountTypeLabel(account.accountType)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {account.openingDebit > 0 ? account.openingDebit.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {account.openingCredit > 0 ? account.openingCredit.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {account.periodDebit > 0 ? account.periodDebit.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {account.periodCredit > 0 ? account.periodCredit.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {account.closingDebit > 0 ? account.closingDebit.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {account.closingCredit > 0 ? account.closingCredit.toFixed(2) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={7}>الإجمالي</TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        {totalDebit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        {totalCredit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    <TableRow className={isBalanced ? "bg-green-50" : "bg-red-50"}>
                      <TableCell colSpan={7} className="font-bold">
                        {isBalanced ? "✓ الميزان متوازن" : "✗ الميزان غير متوازن"}
                      </TableCell>
                      <TableCell colSpan={2} className="text-right font-bold">
                        الفرق: {Math.abs(totalDebit - totalCredit).toFixed(2)} ر.س
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrialBalance;
