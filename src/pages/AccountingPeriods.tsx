import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Plus, Lock, Unlock, Calendar, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  fetchAccountingPeriods,
  createAccountingPeriod,
  closeAccountingPeriod,
  reopenAccountingPeriod,
  performYearEndClosing,
  type AccountingPeriod,
  type AccountingPeriodInsert,
} from "@/lib/accounting";

export default function AccountingPeriods() {
  const queryClient = useQueryClient();
  const { roles, loading: rolesLoading } = useUserRole();
  const isAdmin = roles.includes("admin");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isYearEndDialogOpen, setIsYearEndDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [newPeriod, setNewPeriod] = useState<AccountingPeriodInsert>({
    periodName: "",
    fiscalYear: new Date().getFullYear(),
    startDate: "",
    endDate: "",
    notes: "",
  });

  // Fetch periods
  const { data: periods = [], isLoading } = useQuery({
    queryKey: ["accounting-periods"],
    queryFn: fetchAccountingPeriods,
  });

  // Create period mutation
  const createMutation = useMutation({
    mutationFn: createAccountingPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
      toast.success("تم إنشاء الفترة المحاسبية بنجاح");
      setIsAddDialogOpen(false);
      setNewPeriod({
        periodName: "",
        fiscalYear: new Date().getFullYear(),
        startDate: "",
        endDate: "",
        notes: "",
      });
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إنشاء الفترة: ${error.message}`);
    },
  });

  // Close period mutation
  const closeMutation = useMutation({
    mutationFn: closeAccountingPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
      toast.success("تم إغلاق الفترة المحاسبية بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إغلاق الفترة: ${error.message}`);
    },
  });

  // Reopen period mutation
  const reopenMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      reopenAccountingPeriod(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
      toast.success("تم إعادة فتح الفترة المحاسبية");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إعادة فتح الفترة: ${error.message}`);
    },
  });

  // Year-end closing mutation
  const yearEndMutation = useMutation({
    mutationFn: ({ fiscalYear, closingDate }: { fiscalYear: number; closingDate: string }) =>
      performYearEndClosing(fiscalYear, closingDate),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
      toast.success(`تم الإقفال السنوي بنجاح. رقم القيد: ${result.journalEntryNumber}`);
      setIsYearEndDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`خطأ في الإقفال السنوي: ${error.message}`);
    },
  });

  const handleCreatePeriod = () => {
    if (!newPeriod.periodName || !newPeriod.startDate || !newPeriod.endDate) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    createMutation.mutate(newPeriod);
  };

  const handleYearEndClosing = () => {
    const closingDate = new Date().toISOString().split("T")[0];
    yearEndMutation.mutate({ fiscalYear: selectedYear, closingDate });
  };

  // Get unique fiscal years from periods
  const fiscalYears = [...new Set(periods.map((p) => p.fiscalYear))].sort((a, b) => b - a);

  if (rolesLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <span className="text-muted-foreground">جاري التحميل...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">الفترات المحاسبية</h1>
            <p className="text-muted-foreground">إدارة الفترات المحاسبية والإقفال السنوي</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة فترة
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة فترة محاسبية جديدة</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>اسم الفترة *</Label>
                      <Input
                        placeholder="مثال: يناير 2025"
                        value={newPeriod.periodName}
                        onChange={(e) =>
                          setNewPeriod({ ...newPeriod, periodName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>السنة المالية *</Label>
                      <Input
                        type="number"
                        value={newPeriod.fiscalYear}
                        onChange={(e) =>
                          setNewPeriod({ ...newPeriod, fiscalYear: parseInt(e.target.value) })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>تاريخ البداية *</Label>
                        <Input
                          type="date"
                          value={newPeriod.startDate}
                          onChange={(e) =>
                            setNewPeriod({ ...newPeriod, startDate: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>تاريخ النهاية *</Label>
                        <Input
                          type="date"
                          value={newPeriod.endDate}
                          onChange={(e) =>
                            setNewPeriod({ ...newPeriod, endDate: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>ملاحظات</Label>
                      <Textarea
                        placeholder="ملاحظات إضافية..."
                        value={newPeriod.notes || ""}
                        onChange={(e) =>
                          setNewPeriod({ ...newPeriod, notes: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleCreatePeriod} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isYearEndDialogOpen} onOpenChange={setIsYearEndDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Calendar className="h-4 w-4 ml-2" />
                    إقفال سنوي
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إقفال السنة المالية</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        سيتم إنشاء قيد إقفال لحسابات الإيرادات والمصروفات وترحيل صافي الربح
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Label>السنة المالية</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      >
                        {[...Array(5)].map((_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsYearEndDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleYearEndClosing}
                      disabled={yearEndMutation.isPending}
                    >
                      {yearEndMutation.isPending ? "جاري الإقفال..." : "تنفيذ الإقفال"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Periods Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              قائمة الفترات المحاسبية
            </CardTitle>
          </CardHeader>
          <CardContent>
            {periods.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد فترات محاسبية معرفة. قم بإضافة فترة جديدة للبدء.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الفترة</TableHead>
                    <TableHead>السنة المالية</TableHead>
                    <TableHead>تاريخ البداية</TableHead>
                    <TableHead>تاريخ النهاية</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ الإغلاق</TableHead>
                    {isAdmin && <TableHead>الإجراءات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.periodName}</TableCell>
                      <TableCell>{period.fiscalYear}</TableCell>
                      <TableCell>{period.startDate}</TableCell>
                      <TableCell>{period.endDate}</TableCell>
                      <TableCell>
                        <Badge variant={period.isClosed ? "secondary" : "default"}>
                          {period.isClosed ? (
                            <>
                              <Lock className="h-3 w-3 ml-1" />
                              مغلقة
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3 w-3 ml-1" />
                              مفتوحة
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {period.closedAt
                          ? new Date(period.closedAt).toLocaleDateString("ar-SA")
                          : "-"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {period.isClosed ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Unlock className="h-4 w-4 ml-1" />
                                  إعادة فتح
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>إعادة فتح الفترة المحاسبية</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من إعادة فتح الفترة "{period.periodName}"؟
                                    سيسمح هذا بالترحيل داخل هذه الفترة مرة أخرى.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      reopenMutation.mutate({
                                        id: period.id,
                                        reason: "إعادة فتح يدوية",
                                      })
                                    }
                                  >
                                    إعادة فتح
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Lock className="h-4 w-4 ml-1" />
                                  إغلاق
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>إغلاق الفترة المحاسبية</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من إغلاق الفترة "{period.periodName}"؟
                                    لن يُسمح بالترحيل داخل هذه الفترة بعد الإغلاق.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => closeMutation.mutate(period.id)}
                                  >
                                    إغلاق
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات مهمة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• الفترة المحاسبية تحدد نطاق التواريخ المسموح بالترحيل فيها.</p>
            <p>• عند إغلاق فترة، لن يُسمح بترحيل أي مستند بتاريخ يقع داخلها.</p>
            <p>• الإقفال السنوي ينشئ قيد إقفال لحسابات الإيرادات والمصروفات ويرحّل صافي الربح للأرباح المحتجزة.</p>
            <p>• يمكن إعادة فتح الفترة المغلقة في حالات استثنائية (للمدير فقط).</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
