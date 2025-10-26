import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Scale, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";

interface AccountBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit_balance: number;
  credit_balance: number;
}

const TrialBalance = () => {
  const { toast } = useToast();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);

  const generateTrialBalance = async () => {
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
      const accountBalances: Map<string, { debit: number; credit: number }> = new Map();

      linesData?.forEach((line: any) => {
        const accountId = line.account_id;
        const current = accountBalances.get(accountId) || { debit: 0, credit: 0 };
        current.debit += line.debit_amount || 0;
        current.credit += line.credit_amount || 0;
        accountBalances.set(accountId, current);
      });

      // Prepare trial balance data
      const trialBalanceData: AccountBalance[] = [];
      let totalDebitSum = 0;
      let totalCreditSum = 0;

      accountsData?.forEach((account) => {
        const balance = accountBalances.get(account.id);
        if (balance) {
          const netBalance = balance.debit - balance.credit;
          const debitBalance = netBalance > 0 ? netBalance : 0;
          const creditBalance = netBalance < 0 ? Math.abs(netBalance) : 0;

          // Only include accounts with non-zero balances
          if (debitBalance !== 0 || creditBalance !== 0) {
            trialBalanceData.push({
              account_id: account.id,
              account_code: account.account_code,
              account_name: account.account_name,
              account_type: account.account_type,
              debit_balance: debitBalance,
              credit_balance: creditBalance,
            });

            totalDebitSum += debitBalance;
            totalCreditSum += creditBalance;
          }
        }
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
    let csvContent = "رمز الحساب,اسم الحساب,النوع,مدين,دائن\n";
    balances.forEach((account) => {
      csvContent += `${account.account_code},${account.account_name},${getAccountTypeLabel(account.account_type)},${account.debit_balance.toFixed(2)},${account.credit_balance.toFixed(2)}\n`;
    });
    csvContent += `,,الإجمالي,${totalDebit.toFixed(2)},${totalCredit.toFixed(2)}\n`;

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ميزان_المراجعة_${asOfDate}.csv`);
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
                <Label>التاريخ</Label>
                <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
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
            <CardTitle>ميزان المراجعة كما في {new Date(asOfDate).toLocaleDateString("ar-SA")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رمز الحساب</TableHead>
                  <TableHead>اسم الحساب</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead className="text-right">مدين</TableHead>
                  <TableHead className="text-right">دائن</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      لا توجد حسابات بأرصدة
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {balances.map((account) => (
                      <TableRow key={account.account_id}>
                        <TableCell className="font-mono">{account.account_code}</TableCell>
                        <TableCell>{account.account_name}</TableCell>
                        <TableCell>{getAccountTypeLabel(account.account_type)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {account.debit_balance > 0 ? account.debit_balance.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {account.credit_balance > 0 ? account.credit_balance.toFixed(2) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={3}>الإجمالي</TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        {totalDebit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        {totalCredit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    <TableRow className={isBalanced ? "bg-green-50" : "bg-red-50"}>
                      <TableCell colSpan={3} className="font-bold">
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
