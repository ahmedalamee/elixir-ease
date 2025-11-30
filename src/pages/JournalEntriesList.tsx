import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Search, Plus, Eye, CheckCircle, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useUserRole } from "@/hooks/useUserRole";
import { fetchJournalEntries, postJournalEntry } from "@/lib/accounting";
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

interface JournalEntryListItem {
  id: string;
  entry_no: string;
  entry_date: string;
  description: string;
  source_module: string;
  is_posted: boolean;
  is_reversed: boolean;
  created_at: string;
}

const JournalEntriesList = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { roles, loading: rolesLoading } = useUserRole();
  const [entries, setEntries] = useState<JournalEntryListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "posted">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const canManage = roles.includes("admin") || roles.includes("inventory_manager");

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (statusFilter === "draft") filters.isPosted = false;
      if (statusFilter === "posted") filters.isPosted = true;
      if (sourceFilter !== "all") filters.sourceModule = sourceFilter;

      const data = await fetchJournalEntries(filters);
      setEntries(data);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePostEntry = async (entryId: string) => {
    setPosting(entryId);
    try {
      await postJournalEntry(entryId);
      toast({ title: "تم بنجاح", description: "تم ترحيل القيد" });
      loadEntries();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setPosting(null);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        entry.entry_no.toLowerCase().includes(search) ||
        (entry.description || "").toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8">جاري التحميل...</div>
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
            قيود اليومية
          </h1>
          {canManage && (
            <Button onClick={() => navigate("/accounting/manual-journal")}>
              <Plus className="ml-2 h-4 w-4" />
              قيد يدوي جديد
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>البحث والتصفية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <Label>الحالة</Label>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="posted">مرحّل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المصدر</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="manual_journal">يدوي</SelectItem>
                    <SelectItem value="sales">مبيعات</SelectItem>
                    <SelectItem value="purchases">مشتريات</SelectItem>
                    <SelectItem value="pos">نقطة البيع</SelectItem>
                    <SelectItem value="reversal">عكس قيد</SelectItem>
                    <SelectItem value="system">النظام</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={loadEntries} disabled={loading} className="w-full">
                  <Search className="ml-2 h-4 w-4" />
                  {loading ? "جاري البحث..." : "بحث"}
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <Label>بحث بالرقم أو الوصف</Label>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث برقم القيد أو البيان..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>قائمة القيود ({filteredEntries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم القيد</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>البيان</TableHead>
                  <TableHead>المصدر</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      لا توجد قيود
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono font-bold">{entry.entry_no}</TableCell>
                      <TableCell>
                        {new Date(entry.entry_date).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>{entry.description || "-"}</TableCell>
                      <TableCell>
                        {entry.source_module === "manual_journal"
                          ? "يدوي"
                          : entry.source_module === "sales"
                          ? "مبيعات"
                          : entry.source_module === "purchases"
                          ? "مشتريات"
                          : entry.source_module === "pos"
                          ? "نقطة البيع"
                          : entry.source_module === "reversal"
                          ? "عكس قيد"
                          : entry.source_module || "-"}
                      </TableCell>
                      <TableCell>
                        {entry.is_reversed ? (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">معكوس</span>
                          </div>
                        ) : entry.is_posted ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">مرحّل</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-orange-600">مسودة</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/accounting/journal/${entry.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!entry.is_posted && canManage && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  disabled={posting === entry.id}
                                >
                                  <CheckCircle className="ml-2 h-4 w-4" />
                                  ترحيل
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>تأكيد ترحيل القيد</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من ترحيل القيد {entry.entry_no}؟ لن تتمكن من تعديله بعد الترحيل.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handlePostEntry(entry.id)}>
                                    تأكيد الترحيل
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JournalEntriesList;
