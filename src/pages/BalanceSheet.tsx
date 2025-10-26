import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Building2, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";

interface AccountBalance {
  account_code: string;
  account_name: string;
  balance: number;
}

interface BalanceSheetData {
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  equity: AccountBalance[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  retainedEarnings: number;
}

const BalanceSheet = () => {
  const { toast } = useToast();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!asOfDate) {
      toast({ title: "تنبيه", description: "يرجى تحديد التاريخ", variant: "destructive" });
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
        .in("account_type", ["asset", "liability", "equity"])
        .order("account_code");

      if (accountsError) throw accountsError;

      // Get all posted journal entry lines up to the date
      const { data: linesData, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          journal_entries!inner(entry_date, status)
        `)
        .eq("journal_entries.status", "posted")
        .lte("journal_entries.entry_date", asOfDate);

      if (linesError) throw linesError;

      // Calculate balances for each account
      const accountBalances: Map<string, number> = new Map();

      linesData?.forEach((line: any) => {
        const accountId = line.account_id;
        const current = accountBalances.get(accountId) || 0;
        // Assets: debit increases, credit decreases
        // Liabilities and Equity: credit increases, debit decreases
        accountBalances.set(accountId, current + (line.debit_amount - line.credit_amount));
      });

      // Calculate retained earnings (net income for all periods)
      const { data: incomeData, error: incomeError } = await supabase
        .from("journal_entry_lines")
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          journal_entries!inner(entry_date, status),
          gl_accounts!inner(account_type)
        `)
        .eq("journal_entries.status", "posted")
        .lte("journal_entries.entry_date", asOfDate)
        .in("gl_accounts.account_type", ["revenue", "expense", "cogs"]);

      if (incomeError) throw incomeError;

      let retainedEarnings = 0;
      const revenueExpenseBalances: Map<string, { balance: number; type: string }> = new Map();

      incomeData?.forEach((line: any) => {
        const accountId = line.account_id;
        const type = line.gl_accounts.account_type;
        const current = revenueExpenseBalances.get(accountId) || { balance: 0, type };
        current.balance += line.credit_amount - line.debit_amount;
        revenueExpenseBalances.set(accountId, current);
      });

      revenueExpenseBalances.forEach((value) => {
        if (value.type === "revenue") {
          retainedEarnings += value.balance;
        } else {
          retainedEarnings -= Math.abs(value.balance);
        }
      });

      // Categorize accounts
      const assets: AccountBalance[] = [];
      const liabilities: AccountBalance[] = [];
      const equity: AccountBalance[] = [];
      let totalAssets = 0;
      let totalLiabilities = 0;
      let totalEquity = 0;

      accountsData?.forEach((account) => {
        const balance = accountBalances.get(account.id) || 0;
        if (balance !== 0) {
          const accountBalance = {
            account_code: account.account_code,
            account_name: account.account_name,
            balance: balance,
          };

          if (account.account_type === "asset") {
            assets.push(accountBalance);
            totalAssets += balance;
          } else if (account.account_type === "liability") {
            liabilities.push(accountBalance);
            totalLiabilities += Math.abs(balance);
          } else if (account.account_type === "equity") {
            equity.push(accountBalance);
            totalEquity += Math.abs(balance);
          }
        }
      });

      // Add retained earnings to equity
      totalEquity += retainedEarnings;

      setData({
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        retainedEarnings,
      });

      toast({ title: "تم بنجاح", description: "تم إنشاء الميزانية العمومية" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    let csvContent = `الميزانية العمومية كما في ${asOfDate}\n\n`;
    csvContent += "الأصول\n";
    csvContent += "رمز الحساب,اسم الحساب,المبلغ\n";
    data.assets.forEach((asset) => {
      csvContent += `${asset.account_code},${asset.account_name},${asset.balance.toFixed(2)}\n`;
    });
    csvContent += `,,${data.totalAssets.toFixed(2)}\n\n`;

    csvContent += "الخصوم\n";
    csvContent += "رمز الحساب,اسم الحساب,المبلغ\n";
    data.liabilities.forEach((liability) => {
      csvContent += `${liability.account_code},${liability.account_name},${Math.abs(liability.balance).toFixed(2)}\n`;
    });
    csvContent += `,,${data.totalLiabilities.toFixed(2)}\n\n`;

    csvContent += "حقوق الملكية\n";
    csvContent += "رمز الحساب,اسم الحساب,المبلغ\n";
    data.equity.forEach((eq) => {
      csvContent += `${eq.account_code},${eq.account_name},${Math.abs(eq.balance).toFixed(2)}\n`;
    });
    csvContent += `,الأرباح المحتجزة,${data.retainedEarnings.toFixed(2)}\n`;
    csvContent += `,,${data.totalEquity.toFixed(2)}\n\n`;

    csvContent += `إجمالي الخصوم وحقوق الملكية,,${(data.totalLiabilities + data.totalEquity).toFixed(2)}\n`;

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `الميزانية_العمومية_${asOfDate}.csv`);
    link.click();
  };

  const isBalanced = data && Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            الميزانية العمومية
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>إعدادات التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>التاريخ</Label>
                <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
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
              <CardTitle>الميزانية العمومية كما في {new Date(asOfDate).toLocaleDateString("ar-SA")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* الأصول */}
              <div>
                <h3 className="text-lg font-bold mb-2 text-primary">الأصول</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رمز الحساب</TableHead>
                      <TableHead>اسم الحساب</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.assets.map((asset, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{asset.account_code}</TableCell>
                        <TableCell>{asset.account_name}</TableCell>
                        <TableCell className="text-right font-mono">{asset.balance.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={2}>إجمالي الأصول</TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        {data.totalAssets.toFixed(2)} ر.س
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* الخصوم */}
              <div>
                <h3 className="text-lg font-bold mb-2 text-destructive">الخصوم</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رمز الحساب</TableHead>
                      <TableHead>اسم الحساب</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.liabilities.map((liability, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{liability.account_code}</TableCell>
                        <TableCell>{liability.account_name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {Math.abs(liability.balance).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={2}>إجمالي الخصوم</TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        {data.totalLiabilities.toFixed(2)} ر.س
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* حقوق الملكية */}
              <div>
                <h3 className="text-lg font-bold mb-2 text-primary">حقوق الملكية</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رمز الحساب</TableHead>
                      <TableHead>اسم الحساب</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.equity.map((eq, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{eq.account_code}</TableCell>
                        <TableCell>{eq.account_name}</TableCell>
                        <TableCell className="text-right font-mono">{Math.abs(eq.balance).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-mono">-</TableCell>
                      <TableCell>الأرباح المحتجزة</TableCell>
                      <TableCell className="text-right font-mono">{data.retainedEarnings.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={2}>إجمالي حقوق الملكية</TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        {data.totalEquity.toFixed(2)} ر.س
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* الإجمالي */}
              <div className="flex justify-between items-center p-6 bg-primary/10 rounded-lg">
                <span className="font-bold text-2xl">إجمالي الخصوم وحقوق الملكية</span>
                <span className="text-3xl font-bold">
                  {(data.totalLiabilities + data.totalEquity).toFixed(2)} ر.س
                </span>
              </div>

              {/* التحقق من التوازن */}
              <div
                className={`flex justify-between items-center p-4 rounded-lg ${
                  isBalanced ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <span className="font-bold text-lg">
                  {isBalanced ? "✓ الميزانية متوازنة" : "✗ الميزانية غير متوازنة"}
                </span>
                {!isBalanced && (
                  <span className="font-bold text-red-600">
                    الفرق: {Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)).toFixed(2)} ر.س
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BalanceSheet;
