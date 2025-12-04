import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Save, BookOpen, AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useUserRole } from "@/hooks/useUserRole";
import { fetchGlAccounts, createOpeningBalanceEntry } from "@/lib/accounting";
import type { GlAccount } from "@/types/accounting";

interface OpeningBalanceLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

const OpeningBalances = () => {
  const { toast } = useToast();
  const { roles, loading: rolesLoading } = useUserRole();
  const [accounts, setAccounts] = useState<GlAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split("T")[0]);
  const [balanceLines, setBalanceLines] = useState<OpeningBalanceLine[]>([]);

  const canManage = roles.includes("admin") || roles.includes("inventory_manager");

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await fetchGlAccounts();
      // Filter only active, non-header accounts
      const filteredAccounts = data.filter((acc) => acc.isActive && !acc.isHeader);
      setAccounts(filteredAccounts);
      
      // Initialize balance lines for all accounts
      setBalanceLines(
        filteredAccounts.map((acc) => ({
          accountId: acc.id,
          accountCode: acc.accountCode,
          accountName: acc.accountName,
          debit: 0,
          credit: 0,
          description: "",
        }))
      );
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const updateBalanceLine = (accountId: string, field: "debit" | "credit" | "description", value: any) => {
    setBalanceLines((prev) =>
      prev.map((line) =>
        line.accountId === accountId ? { ...line, [field]: value } : line
      )
    );
  };

  const handleSave = async () => {
    if (!canManage) {
      toast({ title: "تنبيه", description: "ليس لديك صلاحية", variant: "destructive" });
      return;
    }

    if (!openingDate) {
      toast({ title: "خطأ", description: "يرجى تحديد تاريخ الأرصدة الافتتاحية", variant: "destructive" });
      return;
    }

    if (!isBalanced) {
      toast({
        title: "خطأ في التوازن",
        description: `مجموع المدين (${totalDebit.toFixed(2)}) لا يساوي مجموع الدائن (${totalCredit.toFixed(2)})`,
        variant: "destructive",
      });
      return;
    }

    // Filter only lines with values
    const linesWithValues = balanceLines.filter((line) => line.debit > 0 || line.credit > 0);

    if (linesWithValues.length === 0) {
      toast({ title: "تنبيه", description: "يرجى إدخال رصيد واحد على الأقل", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Prepare lines for the function
      const lines = linesWithValues.map((line, index) => ({
        accountId: line.accountId,
        debit: line.debit || 0,
        credit: line.credit || 0,
        description: line.description || `رصيد افتتاحي - ${line.accountName}`,
        lineNo: index + 1,
      }));

      const { entryNo } = await createOpeningBalanceEntry(openingDate, lines);

      toast({
        title: "تم بنجاح",
        description: `تم حفظ الأرصدة الافتتاحية بقيد رقم ${entryNo}`,
      });

      // Reset form
      resetForm();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOpeningDate(new Date().toISOString().split("T")[0]);
    setBalanceLines((prev) =>
      prev.map((line) => ({
        ...line,
        debit: 0,
        credit: 0,
        description: "",
      }))
    );
  };

  const totalDebit = balanceLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = balanceLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const difference = Math.abs(totalDebit - totalCredit);

  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8">جاري التحميل...</div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                ليس لديك صلاحية للوصول إلى هذه الصفحة. يرجى الاتصال بالمسؤول.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            الأرصدة الافتتاحية
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>معلومات الأرصدة الافتتاحية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>تاريخ الأرصدة الافتتاحية *</Label>
                <Input
                  type="date"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-end">
                <div className="text-sm text-muted-foreground">
                  سيتم إنشاء قيد يومية بالأرصدة الافتتاحية المدخلة
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أرصدة الحسابات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">رمز الحساب</TableHead>
                    <TableHead className="min-w-[200px]">اسم الحساب</TableHead>
                    <TableHead className="w-40 text-right">مدين</TableHead>
                    <TableHead className="w-40 text-right">دائن</TableHead>
                    <TableHead className="min-w-[150px]">ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceLines.map((line) => (
                    <TableRow key={line.accountId}>
                      <TableCell className="font-mono">{line.accountCode}</TableCell>
                      <TableCell>{line.accountName}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (val >= 0) {
                              updateBalanceLine(line.accountId, "debit", val);
                            }
                          }}
                          className="text-right"
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (val >= 0) {
                              updateBalanceLine(line.accountId, "credit", val);
                            }
                          }}
                          className="text-right"
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(e) => updateBalanceLine(line.accountId, "description", e.target.value)}
                          placeholder="ملاحظات اختيارية"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={2} className="text-left">الإجمالي</TableCell>
                    <TableCell className="text-right text-lg">{totalDebit.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-lg">{totalCredit.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {!isBalanced && totalDebit + totalCredit > 0 && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-md flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <div>
                  <p className="font-bold text-destructive">القيد غير متوازن!</p>
                  <p className="text-sm text-destructive/80">
                    الفرق: {difference.toFixed(2)} ر.ي - يجب أن يكون مجموع المدين مساوياً لمجموع الدائن
                  </p>
                </div>
              </div>
            )}

            {isBalanced && totalDebit > 0 && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-md">
                <p className="text-green-700 font-medium">✓ القيد متوازن وجاهز للحفظ</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex justify-end gap-4">
            <Button variant="outline" onClick={resetForm} disabled={loading}>
              إعادة تعيين
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !isBalanced || totalDebit === 0}
            >
              <Save className="ml-2 h-4 w-4" />
              {loading ? "جاري الحفظ..." : "حفظ الأرصدة الافتتاحية"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OpeningBalances;
