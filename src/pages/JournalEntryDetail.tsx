import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, CheckCircle, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
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

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference_type: string;
  total_debit: number;
  total_credit: number;
  status: string;
  created_at: string;
  posted_at: string;
}

interface JournalLine {
  id: string;
  line_no: number;
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  gl_accounts: {
    account_code: string;
    account_name: string;
  };
}

const JournalEntryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [lines, setLines] = useState<JournalLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchJournalEntry();
    }
  }, [id]);

  const fetchJournalEntry = async () => {
    setLoading(true);
    try {
      // Fetch journal entry
      const { data: entryData, error: entryError } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("id", id)
        .single();

      if (entryError) throw entryError;
      setEntry(entryData);

      // Fetch journal lines
      const { data: linesData, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          gl_accounts(account_code, account_name)
        `)
        .eq("entry_id", id)
        .order("line_no");

      if (linesError) throw linesError;
      setLines(linesData || []);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePostEntry = async () => {
    if (!entry || entry.status === "posted") return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from("journal_entries")
        .update({
          status: "posted",
          posted_at: new Date().toISOString(),
          posting_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", entry.id);

      if (error) throw error;

      toast({ title: "تم بنجاح", description: "تم ترحيل القيد بنجاح" });
      fetchJournalEntry();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
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
          <Button onClick={() => navigate("/accounting")} className="mt-4">
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة
          </Button>
        </div>
      </div>
    );
  }

  const isBalanced = Math.abs(entry.total_debit - entry.total_credit) < 0.01;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/accounting")}>
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8" />
              تفاصيل القيد {entry.entry_number}
            </h1>
          </div>
          {entry.status === "draft" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!isBalanced || posting}>
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

        <Card>
          <CardHeader>
            <CardTitle>معلومات القيد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">رقم القيد</p>
                <p className="font-mono font-bold">{entry.entry_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">التاريخ</p>
                <p className="font-semibold">{new Date(entry.entry_date).toLocaleDateString("ar-SA")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الحالة</p>
                <div className="flex items-center gap-2">
                  {entry.status === "posted" ? (
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
                <p className="text-sm text-muted-foreground">النوع</p>
                <p className="font-semibold">{entry.reference_type || "يدوي"}</p>
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
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.line_no}</TableCell>
                    <TableCell className="font-mono">{line.gl_accounts.account_code}</TableCell>
                    <TableCell>{line.gl_accounts.account_name}</TableCell>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="text-right font-mono">
                      {line.debit_amount > 0 ? line.debit_amount.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.credit_amount > 0 ? line.credit_amount.toFixed(2) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted">
                  <TableCell colSpan={4}>الإجمالي</TableCell>
                  <TableCell className="text-right font-mono text-lg">
                    {entry.total_debit.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-lg">
                    {entry.total_credit.toFixed(2)}
                  </TableCell>
                </TableRow>
                {!isBalanced && (
                  <TableRow className="bg-red-50">
                    <TableCell colSpan={6} className="text-center text-red-600 font-bold">
                      ⚠️ القيد غير متوازن - الفرق: {Math.abs(entry.total_debit - entry.total_credit).toFixed(2)} ر.س
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {entry.posted_at && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                تم الترحيل في: {new Date(entry.posted_at).toLocaleString("ar-SA")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default JournalEntryDetail;
