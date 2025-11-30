import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useUserRole } from "@/hooks/useUserRole";
import { fetchJournalEntryWithLines, postJournalEntry, reverseJournalEntry } from "@/lib/accounting";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const JournalEntryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { roles, loading: rolesLoading } = useUserRole();
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [reversing, setReversing] = useState(false);
  
  // Reversal form
  const [reversalDate, setReversalDate] = useState(new Date().toISOString().split("T")[0]);
  const [reversalDescription, setReversalDescription] = useState("");

  const canManage = roles.includes("admin") || roles.includes("inventory_manager");

  useEffect(() => {
    if (id) {
      loadJournalEntry();
    }
  }, [id]);

  const loadJournalEntry = async () => {
    setLoading(true);
    try {
      const data = await fetchJournalEntryWithLines(id!);
      setEntry(data);
      setReversalDescription(`عكس القيد ${data.entry_no}`);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePostEntry = async () => {
    if (!entry || entry.is_posted) return;

    setPosting(true);
    try {
      await postJournalEntry(entry.id);
      toast({ title: "تم بنجاح", description: "تم ترحيل القيد بنجاح" });
      loadJournalEntry();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const handleReverseEntry = async () => {
    if (!entry || !entry.is_posted || entry.is_reversed) return;

    setReversing(true);
    try {
      const reversalId = await reverseJournalEntry(entry.id, reversalDate, reversalDescription);
      toast({ 
        title: "تم بنجاح", 
        description: "تم عكس القيد بنجاح",
      });
      // Navigate to the reversal entry
      navigate(`/accounting/journal/${reversalId}`);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setReversing(false);
    }
  };

  if (rolesLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8">جاري التحميل...</div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8">
          <p>القيد غير موجود</p>
          <Button onClick={() => navigate("/accounting/journal-entries")} className="mt-4">
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة
          </Button>
        </div>
      </div>
    );
  }

  const totalDebit = entry.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0;
  const totalCredit = entry.lines?.reduce((sum: number, line: any) => sum + (line.credit || 0), 0) || 0;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/accounting/journal-entries")}>
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8" />
              تفاصيل القيد {entry.entry_no}
            </h1>
          </div>
          <div className="flex gap-2">
            {entry.is_posted && !entry.is_reversed && canManage && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={reversing}>
                    <RotateCcw className="ml-2 h-4 w-4" />
                    عكس القيد
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>عكس القيد</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم إنشاء قيد جديد بمبالغ معكوسة (المدين يصبح دائن والعكس)
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>تاريخ العكس</Label>
                      <Input
                        type="date"
                        value={reversalDate}
                        onChange={(e) => setReversalDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>الوصف</Label>
                      <Textarea
                        value={reversalDescription}
                        onChange={(e) => setReversalDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReverseEntry}>
                      {reversing ? "جاري العكس..." : "تأكيد العكس"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {!entry.is_posted && isBalanced && canManage && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={posting}>
                    <CheckCircle className="ml-2 h-4 w-4" />
                    {posting ? "جاري الترحيل..." : "ترحيل القيد"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد ترحيل القيد</AlertDialogTitle>
                    <AlertDialogDescription>
                      هل أنت متأكد من ترحيل هذا القيد؟ لن تتمكن من تعديله بعد الترحيل.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePostEntry}>تأكيد الترحيل</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>معلومات القيد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">رقم القيد</p>
                <p className="font-mono font-bold">{entry.entry_no}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">التاريخ</p>
                <p className="font-semibold">{new Date(entry.entry_date).toLocaleDateString("ar-SA")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الحالة</p>
                <div className="flex items-center gap-2">
                  {entry.is_reversed ? (
                    <>
                      <XCircle className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold text-gray-600">معكوس</span>
                    </>
                  ) : entry.is_posted ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-semibold text-green-600">مرحّل</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-orange-500" />
                      <span className="font-semibold text-orange-600">مسودة</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المصدر</p>
                <p className="font-semibold">
                  {entry.source_module === "manual_journal"
                    ? "يدوي"
                    : entry.source_module === "sales"
                    ? "مبيعات"
                    : entry.source_module === "purchases"
                    ? "مشتريات"
                    : entry.source_module === "reversal"
                    ? "عكس قيد"
                    : entry.source_module || "يدوي"}
                </p>
              </div>
              {entry.description && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-sm text-muted-foreground">البيان</p>
                  <p className="font-semibold">{entry.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تفاصيل القيد</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>رمز الحساب</TableHead>
                  <TableHead>اسم الحساب</TableHead>
                  <TableHead>البيان</TableHead>
                  <TableHead className="text-right">مدين</TableHead>
                  <TableHead className="text-right">دائن</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.line_no}</TableCell>
                    <TableCell className="font-mono">{line.gl_accounts?.account_code}</TableCell>
                    <TableCell>{line.gl_accounts?.account_name}</TableCell>
                    <TableCell>{line.description || "-"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {line.debit > 0 ? line.debit.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.credit > 0 ? line.credit.toFixed(2) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted">
                  <TableCell colSpan={4}>الإجمالي</TableCell>
                  <TableCell className="text-right font-mono text-lg">
                    {totalDebit.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-lg">
                    {totalCredit.toFixed(2)}
                  </TableCell>
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

        {entry.posting_date && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                تم الترحيل في: {new Date(entry.posting_date).toLocaleDateString("ar-SA")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default JournalEntryDetail;
