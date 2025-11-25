import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, BookOpen } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface GLAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_name_en?: string;
  account_type: string;
  parent_account_id?: string;
  is_active: boolean;
  is_header: boolean;
  currency: string;
  description?: string;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description?: string;
  total_debit: number;
  total_credit: number;
  status: string;
}

interface JournalLine {
  line_no: number;
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
}

const Accounting = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isJournalDialogOpen, setIsJournalDialogOpen] = useState(false);

  // Account form
  const [accountForm, setAccountForm] = useState({
    account_code: "",
    account_name: "",
    account_name_en: "",
    account_type: "asset",
    parent_account_id: "",
    is_header: false,
    description: "",
  });

  // Journal Entry form
  const [journalForm, setJournalForm] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    description: "",
  });

  const [journalLines, setJournalLines] = useState<JournalLine[]>([
    { line_no: 1, account_id: "", description: "", debit_amount: 0, credit_amount: 0 },
    { line_no: 2, account_id: "", description: "", debit_amount: 0, credit_amount: 0 },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchAccounts(), fetchJournalEntries()]);
    setLoading(false);
  };

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("gl_accounts")
      .select("*")
      .order("account_code");

    if (error) {
      toast({ title: "خطأ", description: "فشل تحميل الحسابات", variant: "destructive" });
      return;
    }

    setAccounts(data || []);
  };

  const fetchJournalEntries = async () => {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .limit(50);

    if (error) {
      toast({ title: "خطأ", description: "فشل تحميل قيود اليومية", variant: "destructive" });
      return;
    }

    setJournalEntries(data || []);
  };

  const handleSaveAccount = async () => {
    const { error } = await supabase.from("gl_accounts").insert([accountForm]);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "تم بنجاح", description: "تم إضافة الحساب" });
    setIsAccountDialogOpen(false);
    fetchAccounts();
    resetAccountForm();
  };

  const handleSaveJournalEntry = async () => {
    // التحقق من توازن القيد
    const totalDebit = journalLines.reduce((sum, line) => sum + Number(line.debit_amount), 0);
    const totalCredit = journalLines.reduce((sum, line) => sum + Number(line.credit_amount), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast({
        title: "خطأ في التوازن",
        description: `المدين (${totalDebit.toFixed(2)}) لا يساوي الدائن (${totalCredit.toFixed(2)})`,
        variant: "destructive",
      });
      return;
    }

    // الحصول على رقم القيد التالي
    const { data: numberingRule } = await supabase
      .from("document_numbering_rules")
      .select("*")
      .eq("document_type", "JE")
      .single();

    if (!numberingRule) {
      toast({ title: "خطأ", description: "قاعدة الترقيم غير موجودة", variant: "destructive" });
      return;
    }

    const entryNumber = `${numberingRule.prefix}${String(numberingRule.next_number).padStart(
      numberingRule.number_length,
      "0"
    )}`;

    // إنشاء القيد
    const { data: journalEntry, error: entryError } = await supabase
      .from("journal_entries")
      .insert([
        {
          entry_number: entryNumber,
          entry_date: journalForm.entry_date,
          description: journalForm.description,
          reference_type: "Manual",
          total_debit: totalDebit,
          total_credit: totalCredit,
          status: "draft",
        },
      ])
      .select()
      .single();

    if (entryError) {
      toast({ title: "خطأ", description: entryError.message, variant: "destructive" });
      return;
    }

    // إضافة خطوط القيد
    const lines = journalLines
      .filter((line) => line.account_id && (line.debit_amount > 0 || line.credit_amount > 0))
      .map((line) => ({
        entry_id: journalEntry.id,
        line_no: line.line_no,
        account_id: line.account_id,
        description: line.description,
        debit_amount: line.debit_amount,
        credit_amount: line.credit_amount,
      }));

    const { error: linesError } = await supabase.from("journal_entry_lines").insert(lines);

    if (linesError) {
      toast({ title: "خطأ", description: linesError.message, variant: "destructive" });
      return;
    }

    // تحديث رقم القيد التالي
    await supabase
      .from("document_numbering_rules")
      .update({ next_number: numberingRule.next_number + 1 })
      .eq("id", numberingRule.id);

    toast({ title: "تم بنجاح", description: `تم إنشاء القيد ${entryNumber}` });
    setIsJournalDialogOpen(false);
    fetchJournalEntries();
    resetJournalForm();
  };

  const resetAccountForm = () => {
    setAccountForm({
      account_code: "",
      account_name: "",
      account_name_en: "",
      account_type: "asset",
      parent_account_id: "",
      is_header: false,
      description: "",
    });
  };

  const resetJournalForm = () => {
    setJournalForm({
      entry_date: new Date().toISOString().split("T")[0],
      description: "",
    });
    setJournalLines([
      { line_no: 1, account_id: "", description: "", debit_amount: 0, credit_amount: 0 },
      { line_no: 2, account_id: "", description: "", debit_amount: 0, credit_amount: 0 },
    ]);
  };

  const addJournalLine = () => {
    setJournalLines([
      ...journalLines,
      {
        line_no: journalLines.length + 1,
        account_id: "",
        description: "",
        debit_amount: 0,
        credit_amount: 0,
      },
    ]);
  };

  const updateJournalLine = (index: number, field: keyof JournalLine, value: any) => {
    const updated = [...journalLines];
    updated[index] = { ...updated[index], [field]: value };
    setJournalLines(updated);
  };

  const totalDebit = journalLines.reduce((sum, line) => sum + Number(line.debit_amount || 0), 0);
  const totalCredit = journalLines.reduce((sum, line) => sum + Number(line.credit_amount || 0), 0);

  if (loading) {
    return <div className="p-8">جاري التحميل...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          المحاسبة العامة
        </h1>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">شجرة الحسابات</TabsTrigger>
          <TabsTrigger value="journal">قيود اليومية</TabsTrigger>
        </TabsList>

        {/* شجرة الحسابات */}
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>الحسابات العامة</CardTitle>
              <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة حساب
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>إضافة حساب جديد</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>رمز الحساب</Label>
                      <Input
                        value={accountForm.account_code}
                        onChange={(e) => setAccountForm({ ...accountForm, account_code: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>اسم الحساب (عربي)</Label>
                      <Input
                        value={accountForm.account_name}
                        onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>اسم الحساب (إنجليزي)</Label>
                      <Input
                        value={accountForm.account_name_en}
                        onChange={(e) => setAccountForm({ ...accountForm, account_name_en: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>نوع الحساب</Label>
                      <Select
                        value={accountForm.account_type}
                        onValueChange={(value) => setAccountForm({ ...accountForm, account_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asset">أصول</SelectItem>
                          <SelectItem value="liability">خصوم</SelectItem>
                          <SelectItem value="equity">حقوق ملكية</SelectItem>
                          <SelectItem value="revenue">إيرادات</SelectItem>
                          <SelectItem value="expense">مصروفات</SelectItem>
                          <SelectItem value="cogs">تكلفة البضاعة المباعة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>الحساب الأب</Label>
                      <Select
                        value={accountForm.parent_account_id}
                        onValueChange={(value) => setAccountForm({ ...accountForm, parent_account_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحساب الأب (اختياري)" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            .filter((acc) => acc.is_header)
                            .map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.account_code} - {acc.account_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="is_header"
                        checked={accountForm.is_header}
                        onCheckedChange={(checked) =>
                          setAccountForm({ ...accountForm, is_header: checked as boolean })
                        }
                      />
                      <Label htmlFor="is_header">حساب رئيسي (لا يقبل قيود مباشرة)</Label>
                    </div>
                    <div className="col-span-2">
                      <Label>الوصف</Label>
                      <Textarea
                        value={accountForm.description}
                        onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAccountDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleSaveAccount}>
                      <Save className="ml-2 h-4 w-4" />
                      حفظ
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رمز الحساب</TableHead>
                    <TableHead>اسم الحساب</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>حساب رئيسي</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono">{account.account_code}</TableCell>
                      <TableCell>{account.account_name}</TableCell>
                      <TableCell>
                        {account.account_type === "asset"
                          ? "أصول"
                          : account.account_type === "liability"
                          ? "خصوم"
                          : account.account_type === "equity"
                          ? "حقوق ملكية"
                          : account.account_type === "revenue"
                          ? "إيرادات"
                          : account.account_type === "expense"
                          ? "مصروفات"
                          : "تكلفة البضاعة"}
                      </TableCell>
                      <TableCell>{account.is_header ? "نعم" : "لا"}</TableCell>
                      <TableCell>{account.is_active ? "نشط" : "غير نشط"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* قيود اليومية */}
        <TabsContent value="journal" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>قيود اليومية (آخر 50 قيد)</CardTitle>
              <Dialog open={isJournalDialogOpen} onOpenChange={setIsJournalDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="ml-2 h-4 w-4" />
                    قيد يدوي جديد
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>إنشاء قيد يدوي</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>التاريخ</Label>
                        <Input
                          type="date"
                          value={journalForm.entry_date}
                          onChange={(e) => setJournalForm({ ...journalForm, entry_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>الوصف</Label>
                        <Input
                          value={journalForm.description}
                          onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">خطوط القيد</h3>
                        <Button variant="outline" size="sm" onClick={addJournalLine}>
                          <Plus className="ml-2 h-4 w-4" />
                          إضافة سطر
                        </Button>
                      </div>
                      {journalLines.map((line, index) => (
                        <div key={index} className="grid grid-cols-6 gap-2 items-center p-2 border rounded">
                          <div className="col-span-2">
                            <Select
                              value={line.account_id}
                              onValueChange={(value) => updateJournalLine(index, "account_id", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الحساب" />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts
                                  .filter((acc) => !acc.is_header)
                                  .map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                      {acc.account_code} - {acc.account_name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Input
                              type="number"
                              placeholder="مدين"
                              value={line.debit_amount || ""}
                              onChange={(e) => updateJournalLine(index, "debit_amount", Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              placeholder="دائن"
                              value={line.credit_amount || ""}
                              onChange={(e) => updateJournalLine(index, "credit_amount", Number(e.target.value))}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              placeholder="البيان"
                              value={line.description}
                              onChange={(e) => updateJournalLine(index, "description", e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t font-semibold">
                        <span>المجموع:</span>
                        <div className="flex gap-4">
                          <span>مدين: {totalDebit.toFixed(2)}</span>
                          <span>دائن: {totalCredit.toFixed(2)}</span>
                          <span
                            className={
                              Math.abs(totalDebit - totalCredit) < 0.01 ? "text-green-600" : "text-red-600"
                            }
                          >
                            الفرق: {(totalDebit - totalCredit).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsJournalDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleSaveJournalEntry}>
                      <Save className="ml-2 h-4 w-4" />
                      حفظ القيد
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم القيد</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>البيان</TableHead>
                    <TableHead>المدين</TableHead>
                    <TableHead>الدائن</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono">{entry.entry_number}</TableCell>
                      <TableCell>{new Date(entry.entry_date).toLocaleDateString("ar-SA")}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{entry.total_debit.toFixed(2)}</TableCell>
                      <TableCell>{entry.total_credit.toFixed(2)}</TableCell>
                      <TableCell>
                        {entry.status === "draft" ? "مسودة" : entry.status === "posted" ? "مرحّل" : "ملغي"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `/journal-entry/${entry.id}`}
                        >
                          عرض
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Accounting;
