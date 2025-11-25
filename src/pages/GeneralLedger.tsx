import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Search } from "lucide-react";
import Navbar from "@/components/Navbar";

interface GLAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface LedgerEntry {
  entry_date: string;
  entry_number: string;
  description: string;
  reference_type: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
}

const GeneralLedger = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [accountInfo, setAccountInfo] = useState<GLAccount | null>(null);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("gl_accounts")
      .select("id, account_code, account_name, account_type")
      .eq("is_header", false)
      .eq("is_active", true)
      .order("account_code");

    if (error) {
      toast({ title: "خطأ", description: "فشل تحميل الحسابات", variant: "destructive" });
      return;
    }

    setAccounts(data || []);
  };

  const generateLedger = async () => {
    if (!selectedAccount) {
      toast({ title: "تنبيه", description: "يرجى اختيار حساب", variant: "destructive" });
      return;
    }

    if (!startDate || !endDate) {
      toast({ title: "تنبيه", description: "يرجى تحديد الفترة الزمنية", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Get account info
      const { data: accountData } = await supabase
        .from("gl_accounts")
        .select("*")
        .eq("id", selectedAccount)
        .single();

      setAccountInfo(accountData);

      // Get opening balance (entries before start date)
      const { data: openingData } = await supabase
        .from("journal_entry_lines")
        .select(`
          debit_amount,
          credit_amount,
          entry_id,
          journal_entries!inner(entry_date, status)
        `)
        .eq("account_id", selectedAccount)
        .eq("journal_entries.status", "posted")
        .lt("journal_entries.entry_date", startDate);

      let opening = 0;
      if (openingData) {
        opening = openingData.reduce((sum, line) => {
          return sum + line.debit_amount - line.credit_amount;
        }, 0);
      }
      setOpeningBalance(opening);

      // Get entries in the period
      const { data: entriesData, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          debit_amount,
          credit_amount,
          description,
          journal_entries!inner(
            entry_number,
            entry_date,
            description,
            reference_type,
            status
          )
        `)
        .eq("account_id", selectedAccount)
        .eq("journal_entries.status", "posted")
        .gte("journal_entries.entry_date", startDate)
        .lte("journal_entries.entry_date", endDate)
        .order("journal_entries.entry_date", { ascending: true });

      if (error) throw error;

      // Calculate running balance
      let runningBalance = opening;
      const entries: LedgerEntry[] = [];

      entriesData?.forEach((line: any) => {
        const debit = line.debit_amount || 0;
        const credit = line.credit_amount || 0;
        runningBalance += debit - credit;

        entries.push({
          entry_date: line.journal_entries.entry_date,
          entry_number: line.journal_entries.entry_number,
          description: line.description || line.journal_entries.description || "",
          reference_type: line.journal_entries.reference_type || "",
          debit_amount: debit,
          credit_amount: credit,
          balance: runningBalance,
        });
      });

      setLedgerEntries(entries);
      setClosingBalance(runningBalance);

      toast({ title: "تم بنجاح", description: "تم إنشاء تقرير الأستاذ العام" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalDebit = ledgerEntries.reduce((sum, entry) => sum + entry.debit_amount, 0);
  const totalCredit = ledgerEntries.reduce((sum, entry) => sum + entry.credit_amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            تقرير الأستاذ العام
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>إعدادات التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>الحساب</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_code} - {account.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>من تاريخ</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>إلى تاريخ</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={generateLedger} disabled={loading} className="w-full">
                  <Search className="ml-2 h-4 w-4" />
                  {loading ? "جاري الإنشاء..." : "إنشاء التقرير"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {accountInfo && (
          <Card>
            <CardHeader>
              <CardTitle>
                {accountInfo.account_code} - {accountInfo.account_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="font-semibold">الرصيد الافتتاحي:</span>
                  <span className="text-lg font-bold">{openingBalance.toFixed(2)} ر.س</span>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>رقم القيد</TableHead>
                      <TableHead>البيان</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead className="text-right">مدين</TableHead>
                      <TableHead className="text-right">دائن</TableHead>
                      <TableHead className="text-right">الرصيد</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          لا توجد حركات خلال الفترة المحددة
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledgerEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>{new Date(entry.entry_date).toLocaleDateString("ar-SA")}</TableCell>
                          <TableCell className="font-mono">{entry.entry_number}</TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell>{entry.reference_type}</TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.debit_amount > 0 ? entry.debit_amount.toFixed(2) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.credit_amount > 0 ? entry.credit_amount.toFixed(2) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {entry.balance.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {ledgerEntries.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="font-semibold">إجمالي المدين:</span>
                      <span className="text-lg font-bold">{totalDebit.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="font-semibold">إجمالي الدائن:</span>
                      <span className="text-lg font-bold">{totalCredit.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                      <span className="font-bold text-lg">الرصيد الختامي:</span>
                      <span className="text-xl font-bold">{closingBalance.toFixed(2)} ر.س</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GeneralLedger;
