import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";

interface AccountBalance {
  account_code: string;
  account_name: string;
  balance: number;
}

interface IncomeStatementData {
  revenues: AccountBalance[];
  expenses: AccountBalance[];
  cogs: AccountBalance[];
  totalRevenue: number;
  totalExpenses: number;
  totalCOGS: number;
  grossProfit: number;
  netProfit: number;
}

const IncomeStatement = () => {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast({ title: "تنبيه", description: "يرجى تحديد الفترة الزمنية", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Get all active accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("gl_accounts")
        .select("id, account_code, account_name, account_type, is_header")
        .eq("is_active", true)
        .eq("is_header", false)
        .in("account_type", ["revenue", "expense", "cogs"])
        .order("account_code");

      if (accountsError) throw accountsError;

      // Get journal entry lines for the period
      const { data: linesData, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          journal_entries!inner(entry_date, status)
        `)
        .eq("journal_entries.status", "posted")
        .gte("journal_entries.entry_date", startDate)
        .lte("journal_entries.entry_date", endDate);

      if (linesError) throw linesError;

      // Calculate balances for each account
      const accountBalances: Map<string, number> = new Map();

      linesData?.forEach((line: any) => {
        const accountId = line.account_id;
        const current = accountBalances.get(accountId) || 0;
        // Revenue accounts: credit increases, debit decreases
        // Expense/COGS accounts: debit increases, credit decreases
        accountBalances.set(accountId, current + (line.credit_amount - line.debit_amount));
      });

      // Categorize accounts
      const revenues: AccountBalance[] = [];
      const expenses: AccountBalance[] = [];
      const cogs: AccountBalance[] = [];
      let totalRevenue = 0;
      let totalExpenses = 0;
      let totalCOGS = 0;

      accountsData?.forEach((account) => {
        const balance = accountBalances.get(account.id) || 0;
        if (balance !== 0) {
          const accountBalance = {
            account_code: account.account_code,
            account_name: account.account_name,
            balance: balance,
          };

          if (account.account_type === "revenue") {
            revenues.push(accountBalance);
            totalRevenue += balance;
          } else if (account.account_type === "expense") {
            expenses.push(accountBalance);
            totalExpenses += Math.abs(balance);
          } else if (account.account_type === "cogs") {
            cogs.push(accountBalance);
            totalCOGS += Math.abs(balance);
          }
        }
      });

      const grossProfit = totalRevenue - totalCOGS;
      const netProfit = grossProfit - totalExpenses;

      setData({
        revenues,
        expenses,
        cogs,
        totalRevenue,
        totalExpenses,
        totalCOGS,
        grossProfit,
        netProfit,
      });

      toast({ title: "تم بنجاح", description: "تم إنشاء قائمة الدخل" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    let csvContent = `قائمة الدخل من ${startDate} إلى ${endDate}\n\n`;
    csvContent += "الإيرادات\n";
    csvContent += "رمز الحساب,اسم الحساب,المبلغ\n";
    data.revenues.forEach((rev) => {
      csvContent += `${rev.account_code},${rev.account_name},${rev.balance.toFixed(2)}\n`;
    });
    csvContent += `,,${data.totalRevenue.toFixed(2)}\n\n`;

    csvContent += "تكلفة البضاعة المباعة\n";
    csvContent += "رمز الحساب,اسم الحساب,المبلغ\n";
    data.cogs.forEach((cog) => {
      csvContent += `${cog.account_code},${cog.account_name},${Math.abs(cog.balance).toFixed(2)}\n`;
    });
    csvContent += `,,${data.totalCOGS.toFixed(2)}\n\n`;

    csvContent += `مجمل الربح,,${data.grossProfit.toFixed(2)}\n\n`;

    csvContent += "المصروفات\n";
    csvContent += "رمز الحساب,اسم الحساب,المبلغ\n";
    data.expenses.forEach((exp) => {
      csvContent += `${exp.account_code},${exp.account_name},${Math.abs(exp.balance).toFixed(2)}\n`;
    });
    csvContent += `,,${data.totalExpenses.toFixed(2)}\n\n`;

    csvContent += `صافي الربح,,${data.netProfit.toFixed(2)}\n`;

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `قائمة_الدخل_${startDate}_${endDate}.csv`);
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
                قائمة الدخل للفترة من {new Date(startDate).toLocaleDateString("ar-SA")} إلى{" "}
                {new Date(endDate).toLocaleDateString("ar-SA")}
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
                    {data.revenues.map((rev, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{rev.account_code}</TableCell>
                        <TableCell>{rev.account_name}</TableCell>
                        <TableCell className="text-right font-mono">{rev.balance.toFixed(2)}</TableCell>
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
                          <TableCell className="font-mono">{cog.account_code}</TableCell>
                          <TableCell>{cog.account_name}</TableCell>
                          <TableCell className="text-right font-mono">
                            {Math.abs(cog.balance).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted">
                        <TableCell colSpan={2}>إجمالي تكلفة البضاعة المباعة</TableCell>
                        <TableCell className="text-right font-mono text-lg">
                          {data.totalCOGS.toFixed(2)} ر.س
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
                        <TableCell className="font-mono">{exp.account_code}</TableCell>
                        <TableCell>{exp.account_name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {Math.abs(exp.balance).toFixed(2)}
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
