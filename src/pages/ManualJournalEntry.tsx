import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, BookOpen, CheckCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import { useUserRole } from "@/hooks/useUserRole";
import {
  fetchGlAccounts,
  createJournalEntry,
  validateJournalEntry,
  postJournalEntry,
} from "@/lib/accounting";
import type { GlAccount } from "@/types/accounting";

interface JournalLine {
  lineNo: number;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

const ManualJournalEntry = () => {
  const { toast } = useToast();
  const { roles, loading: rolesLoading } = useUserRole();
  const [accounts, setAccounts] = useState<GlAccount[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [journalLines, setJournalLines] = useState<JournalLine[]>([
    { lineNo: 1, accountId: "", description: "", debit: 0, credit: 0 },
    { lineNo: 2, accountId: "", description: "", debit: 0, credit: 0 },
  ]);

  const canManage = roles.includes("admin") || roles.includes("inventory_manager");

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await fetchGlAccounts();
      // Filter only active, non-header accounts
      setAccounts(data.filter((acc) => acc.isActive && !acc.isHeader));
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const addJournalLine = () => {
    setJournalLines([
      ...journalLines,
      {
        lineNo: journalLines.length + 1,
        accountId: "",
        description: "",
        debit: 0,
        credit: 0,
      },
    ]);
  };

  const updateJournalLine = (index: number, field: keyof JournalLine, value: any) => {
    const updated = [...journalLines];
    updated[index] = { ...updated[index], [field]: value };
    setJournalLines(updated);
  };

  const removeJournalLine = (index: number) => {
    if (journalLines.length <= 2) {
      toast({
        title: "تنبيه",
        description: "يجب أن يحتوي القيد على سطرين على الأقل",
        variant: "destructive",
      });
      return;
    }
    const updated = journalLines.filter((_, i) => i !== index);
    // Renumber lines
    updated.forEach((line, i) => {
      line.lineNo = i + 1;
    });
    setJournalLines(updated);
  };

  const handleSaveJournal = async (postImmediately: boolean) => {
    if (!canManage) {
      toast({ title: "تنبيه", description: "ليس لديك صلاحية لإنشاء القيود", variant: "destructive" });
      return;
    }

    // Validate lines
    const validation = validateJournalEntry(
      journalLines.map((l) => ({ debit: l.debit || 0, credit: l.credit || 0 }))
    );

    if (!validation.isValid) {
      toast({
        title: "خطأ في القيد",
        description: validation.errors.join("\n"),
        variant: "destructive",
      });
      return;
    }

    // Check that all lines have account selected
    const hasEmptyAccounts = journalLines.some((line) => !line.accountId && (line.debit > 0 || line.credit > 0));
    if (hasEmptyAccounts) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار حساب لكل سطر",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Prepare lines
      const lines = journalLines
        .filter((line) => line.accountId && (line.debit > 0 || line.credit > 0))
        .map((line) => ({
          accountId: line.accountId,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description,
          lineNo: line.lineNo,
        }));

      // Create entry
      const { journalId, entryNo } = await createJournalEntry(
        {
          entryDate,
          description,
          sourceModule: "manual_journal",
          isPosted: postImmediately,
        },
        lines
      );

      // If saving as draft and user wants to post, post it
      if (postImmediately && !journalId) {
        await postJournalEntry(journalId);
      }

      toast({
        title: "تم بنجاح",
        description: `تم ${postImmediately ? "إنشاء وترحيل" : "حفظ"} القيد ${entryNo}`,
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
    setEntryDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setJournalLines([
      { lineNo: 1, accountId: "", description: "", debit: 0, credit: 0 },
      { lineNo: 2, accountId: "", description: "", debit: 0, credit: 0 },
    ]);
  };

  const totalDebit = journalLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = journalLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

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
                ليس لديك صلاحية لإنشاء القيود اليدوية. يرجى الاتصال بالمسؤول.
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
            قيد يومية يدوي جديد
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>معلومات القيد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>تاريخ القيد *</Label>
                <Input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
              <div>
                <Label>البيان</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف القيد (اختياري)"
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>سطور القيد</CardTitle>
            <Button variant="outline" size="sm" onClick={addJournalLine}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة سطر
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="min-w-[250px]">الحساب *</TableHead>
                  <TableHead className="min-w-[200px]">البيان</TableHead>
                  <TableHead className="w-32 text-right">مدين</TableHead>
                  <TableHead className="w-32 text-right">دائن</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalLines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>{line.lineNo}</TableCell>
                    <TableCell>
                      <Select
                        value={line.accountId}
                        onValueChange={(value) => updateJournalLine(index, "accountId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحساب" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountCode} - {account.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.description}
                        onChange={(e) => updateJournalLine(index, "description", e.target.value)}
                        placeholder="بيان السطر"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit || ""}
                        onChange={(e) => updateJournalLine(index, "debit", parseFloat(e.target.value) || 0)}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit || ""}
                        onChange={(e) => updateJournalLine(index, "credit", parseFloat(e.target.value) || 0)}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeJournalLine(index)}
                        disabled={journalLines.length <= 2}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted">
                  <TableCell colSpan={3} className="text-left">الإجمالي</TableCell>
                  <TableCell className="text-right text-lg">{totalDebit.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-lg">{totalCredit.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
                {!isBalanced && (
                  <TableRow className="bg-destructive/10">
                    <TableCell colSpan={6} className="text-center text-destructive font-bold">
                      ⚠️ القيد غير متوازن - الفرق: {Math.abs(totalDebit - totalCredit).toFixed(2)} ر.ي
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex justify-end gap-4">
            <Button variant="outline" onClick={resetForm} disabled={loading}>
              إعادة تعيين
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSaveJournal(false)}
              disabled={loading || !isBalanced}
            >
              <Save className="ml-2 h-4 w-4" />
              حفظ كمسودة
            </Button>
            <Button
              onClick={() => handleSaveJournal(true)}
              disabled={loading || !isBalanced}
            >
              <CheckCircle className="ml-2 h-4 w-4" />
              {loading ? "جاري الحفظ..." : "حفظ وترحيل"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManualJournalEntry;
