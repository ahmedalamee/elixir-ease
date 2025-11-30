import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, FileText, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getGeneralLedger, fetchGlAccountsTree, type GeneralLedgerResult } from "@/lib/accounting";
import type { GlAccountTreeNode } from "@/types/accounting";

const AccountLedger = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Initialize dates: first day of current month to today
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [fromDate, setFromDate] = useState(firstDayOfMonth.toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(today.toISOString().split("T")[0]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    searchParams.get("accountId")
  );
  const [accounts, setAccounts] = useState<GlAccountTreeNode[]>([]);
  const [data, setData] = useState<GeneralLedgerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Auto-generate if accountId in URL
  useEffect(() => {
    if (selectedAccountId && fromDate && toDate) {
      handleGenerate();
    }
  }, []); // Only run once on mount

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const tree = await fetchGlAccountsTree();
      // Flatten tree to get all non-header accounts
      const flatAccounts = flattenTree(tree);
      const activeNonHeaderAccounts = flatAccounts.filter(
        (acc) => acc.isActive && !acc.isHeader
      );
      setAccounts(activeNonHeaderAccounts);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل تحميل الحسابات",
        variant: "destructive",
      });
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Flatten tree to get all accounts
  const flattenTree = (nodes: GlAccountTreeNode[]): GlAccountTreeNode[] => {
    let result: GlAccountTreeNode[] = [];
    nodes.forEach((node) => {
      result.push(node);
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenTree(node.children));
      }
    });
    return result;
  };

  const handleGenerate = async () => {
    if (!selectedAccountId) {
      toast({
        title: "تنبيه",
        description: "يرجى اختيار حساب",
        variant: "destructive",
      });
      return;
    }

    if (!fromDate || !toDate) {
      toast({
        title: "تنبيه",
        description: "يرجى تحديد الفترة الزمنية",
        variant: "destructive",
      });
      return;
    }

    if (fromDate > toDate) {
      toast({
        title: "خطأ",
        description: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await getGeneralLedger({
        accountId: selectedAccountId,
        fromDate,
        toDate,
        branchId: null,
      });
      setData(result);
      toast({
        title: "تم إنشاء التقرير بنجاح",
      });
    } catch (error: any) {
      console.error("Error generating ledger:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إنشاء التقرير",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    let csvContent = `دفتر الأستاذ - حركة حساب\n`;
    csvContent += `الحساب: ${data.account.code} - ${data.account.name}\n`;
    csvContent += `الفترة: من ${fromDate} إلى ${toDate}\n\n`;
    csvContent += `الرصيد الافتتاحي:,${data.openingBalance.toFixed(2)}\n\n`;
    csvContent += "التاريخ,رقم القيد,الوصف,مدين,دائن,الرصيد\n";
    
    data.transactions.forEach((trans) => {
      csvContent += `${trans.date},${trans.entryNo},${trans.description},${trans.debit.toFixed(2)},${trans.credit.toFixed(2)},${trans.balance.toFixed(2)}\n`;
    });
    
    csvContent += `\nإجمالي المدين:,${data.totalDebits.toFixed(2)}\n`;
    csvContent += `إجمالي الدائن:,${data.totalCredits.toFixed(2)}\n`;
    csvContent += `الرصيد الختامي:,${data.closingBalance.toFixed(2)}\n`;

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `دفتر_الأستاذ_${data.account.code}_${fromDate}_${toDate}.csv`);
    link.click();
  };

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              دفتر الأستاذ
            </h1>
            <p className="text-muted-foreground mt-2">
              عرض حركة حساب محدد خلال فترة زمنية
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/chart-of-accounts")}
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة لشجرة الحسابات
          </Button>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Account Selector */}
              <div className="col-span-1">
                <Label>الحساب</Label>
                <Select
                  value={selectedAccountId || ""}
                  onValueChange={setSelectedAccountId}
                  disabled={loadingAccounts}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingAccounts ? "جاري التحميل..." : "اختر حساباً"} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.accountCode} - {acc.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* From Date */}
              <div>
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              {/* To Date */}
              <div>
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button onClick={handleGenerate} disabled={loading || !selectedAccountId}>
                <FileText className="ml-2 h-4 w-4" />
                {loading ? "جاري الإنشاء..." : "عرض التقرير"}
              </Button>
              {data && (
                <Button onClick={exportToCSV} variant="outline">
                  تصدير CSV
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Result */}
        {data ? (
          <Card>
            <CardHeader>
              <div className="space-y-2">
                <CardTitle>
                  حركة الحساب: {data.account.code} - {data.account.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  الفترة من {new Date(fromDate).toLocaleDateString("ar-SA")} إلى{" "}
                  {new Date(toDate).toLocaleDateString("ar-SA")}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">الرصيد الافتتاحي</p>
                  <p className="text-xl font-bold font-mono">
                    {data.openingBalance.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">إجمالي المدين</p>
                  <p className="text-xl font-bold font-mono text-blue-600">
                    {data.totalDebits.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">إجمالي الدائن</p>
                  <p className="text-xl font-bold font-mono text-red-600">
                    {data.totalCredits.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">الرصيد الختامي</p>
                  <p className="text-xl font-bold font-mono text-primary">
                    {data.closingBalance.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Transactions Table */}
              <div>
                <h3 className="text-lg font-bold mb-4">تفاصيل الحركات</h3>
                {data.transactions.length === 0 ? (
                  <div className="text-center py-12 bg-muted/20 rounded-lg">
                    <p className="text-muted-foreground">
                      لا توجد حركات خلال هذه الفترة
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">التاريخ</TableHead>
                          <TableHead className="w-[120px]">رقم القيد</TableHead>
                          <TableHead>الوصف</TableHead>
                          <TableHead className="text-right w-[120px]">مدين</TableHead>
                          <TableHead className="text-right w-[120px]">دائن</TableHead>
                          <TableHead className="text-right w-[140px]">الرصيد</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.transactions.map((trans, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">
                              {new Date(trans.date).toLocaleDateString("ar-SA")}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {trans.entryNo}
                            </TableCell>
                            <TableCell className="text-sm">
                              {trans.description}
                              {trans.sourceModule && (
                                <span className="text-xs text-muted-foreground mr-2">
                                  ({trans.sourceModule})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {trans.debit > 0 ? trans.debit.toFixed(2) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {trans.credit > 0 ? trans.credit.toFixed(2) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {trans.balance.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  لم يتم عرض أي بيانات بعد
                </h3>
                <p className="text-sm text-muted-foreground">
                  اختر حساباً وفترة زمنية ثم اضغط "عرض التقرير"
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AccountLedger;
