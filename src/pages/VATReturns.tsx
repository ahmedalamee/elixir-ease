import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, FileText, Send, Eye, Download, AlertTriangle, CheckCircle, Clock, Ban } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  generateVatReturn, 
  submitVatReturn,
  type VatReturnRecord,
  type TaxPeriod 
} from "@/lib/accounting";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

const VATReturns = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<VatReturnRecord | null>(null);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [returnToSubmit, setReturnToSubmit] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { isAdmin, hasRole, loading: roleLoading } = useUserRole();

  // Fetch VAT returns with tax period details
  const { data: returns = [], isLoading } = useQuery<VatReturnRecord[]>({
    queryKey: ["vat-returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vat_returns")
        .select(`
          *,
          tax_periods (
            period_number,
            start_date,
            end_date,
            period_type
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VatReturnRecord[];
    },
  });

  // Fetch open tax periods for selection
  const { data: taxPeriods = [] } = useQuery<TaxPeriod[]>({
    queryKey: ["tax-periods-open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_periods")
        .select("*")
        .eq("status", "open")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as TaxPeriod[];
    },
  });

  // Generate VAT Return mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!startDate || !endDate) {
        throw new Error("يرجى تحديد تاريخ البداية والنهاية");
      }
      
      if (new Date(endDate) < new Date(startDate)) {
        throw new Error("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");
      }

      return await generateVatReturn(startDate, endDate);
    },
    onSuccess: (data) => {
      toast.success(`تم إنشاء الإقرار الضريبي رقم ${data.returnNumber} بنجاح`);
      queryClient.invalidateQueries({ queryKey: ["vat-returns"] });
      queryClient.invalidateQueries({ queryKey: ["tax-periods-open"] });
      setCreateDialogOpen(false);
      setStartDate("");
      setEndDate("");
    },
    onError: (error: any) => {
      toast.error(`فشل إنشاء الإقرار: ${error.message}`);
    },
  });

  // Submit VAT Return mutation
  const submitMutation = useMutation({
    mutationFn: async (returnId: string) => {
      await submitVatReturn(returnId);
    },
    onSuccess: () => {
      toast.success("تم تقديم الإقرار الضريبي بنجاح");
      queryClient.invalidateQueries({ queryKey: ["vat-returns"] });
      setSubmitConfirmOpen(false);
      setReturnToSubmit(null);
    },
    onError: (error: any) => {
      toast.error(`فشل تقديم الإقرار: ${error.message}`);
    },
  });

  // Handle period selection for quick date fill
  const handlePeriodSelect = (periodId: string) => {
    setSelectedPeriod(periodId);
    const period = taxPeriods?.find(p => p.id === periodId);
    if (period) {
      setStartDate(period.start_date);
      setEndDate(period.end_date);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!returns || returns.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const headers = [
      "رقم الإقرار",
      "الفترة",
      "من تاريخ",
      "إلى تاريخ",
      "إجمالي المبيعات",
      "إجمالي المشتريات",
      "ضريبة المخرجات",
      "ضريبة المدخلات",
      "صافي الضريبة",
      "المبلغ المستحق",
      "الحالة",
    ];

    const rows = returns.map((ret) => [
      ret.return_number,
      ret.tax_periods?.period_number || "",
      ret.tax_periods?.start_date || "",
      ret.tax_periods?.end_date || "",
      ret.total_sales?.toFixed(2) || "0",
      ret.total_purchases?.toFixed(2) || "0",
      ret.output_vat?.toFixed(2) || "0",
      ret.input_vat?.toFixed(2) || "0",
      ret.net_vat?.toFixed(2) || "0",
      ret.amount_due?.toFixed(2) || "0",
      ret.status === "submitted" ? "مقدم" : "مسودة",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vat_returns_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 ml-1" />
            مقدم
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <CheckCircle className="h-3 w-3 ml-1" />
            معتمد
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <Ban className="h-3 w-3 ml-1" />
            مرفوض
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 ml-1" />
            مسودة
          </Badge>
        );
    }
  };

  const handleViewDetails = (ret: VatReturnRecord) => {
    setSelectedReturn(ret);
    setDetailsDialogOpen(true);
  };

  const handleSubmitClick = (returnId: string) => {
    setReturnToSubmit(returnId);
    setSubmitConfirmOpen(true);
  };

  if (isLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8 text-center">جارٍ التحميل...</div>
      </div>
    );
  }

  // Check admin access
  if (!isAdmin && !hasRole("pharmacist")) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ليس لديك صلاحية الوصول إلى هذه الصفحة. يرجى التواصل مع مسؤول النظام.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        {/* Header Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                الإقرارات الضريبية (VAT)
              </CardTitle>
              <CardDescription className="mt-2">
                إدارة الإقرارات الضريبية وتقديمها للجهات المختصة
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 ml-2" />
                تصدير CSV
              </Button>
              
              {/* Create Dialog */}
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 ml-2" />
                    إقرار جديد
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>إنشاء إقرار ضريبي جديد</DialogTitle>
                    <DialogDescription>
                      اختر الفترة الضريبية لإنشاء إقرار جديد
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {taxPeriods && taxPeriods.length > 0 && (
                      <div>
                        <Label>اختيار فترة ضريبية موجودة (اختياري)</Label>
                        <Select value={selectedPeriod} onValueChange={handlePeriodSelect}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="اختر فترة ضريبية" />
                          </SelectTrigger>
                          <SelectContent>
                            {taxPeriods.map((period) => (
                              <SelectItem key={period.id} value={period.id}>
                                {period.period_number} ({period.start_date} - {period.end_date})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>من تاريخ *</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>إلى تاريخ *</Label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        سيتم حساب ضريبة المخرجات من فواتير المبيعات المرحلة وضريبة المدخلات من فواتير الشراء المرحلة خلال الفترة المحددة.
                      </AlertDescription>
                    </Alert>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button
                      onClick={() => generateMutation.mutate()}
                      disabled={generateMutation.isPending || !startDate || !endDate}
                    >
                      {generateMutation.isPending ? "جارٍ الإنشاء..." : "إنشاء الإقرار"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">إجمالي الإقرارات</div>
                  <div className="text-2xl font-bold">{returns?.length || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">المسودات</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {returns?.filter((r) => r.status === "draft").length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">المقدمة</div>
                  <div className="text-2xl font-bold text-green-600">
                    {returns?.filter((r) => r.status === "submitted").length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">إجمالي المستحق</div>
                  <div className="text-2xl font-bold">
                    {(returns?.reduce((sum, r) => sum + (r.amount_due || 0), 0) || 0).toLocaleString("ar-SA")} ر.ي
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Returns Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الإقرار</TableHead>
                    <TableHead>الفترة</TableHead>
                    <TableHead>من</TableHead>
                    <TableHead>إلى</TableHead>
                    <TableHead className="text-left">ضريبة المخرجات</TableHead>
                    <TableHead className="text-left">ضريبة المدخلات</TableHead>
                    <TableHead className="text-left">صافي الضريبة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns?.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell className="font-medium">{ret.return_number}</TableCell>
                      <TableCell>{ret.tax_periods?.period_number || "-"}</TableCell>
                      <TableCell>
                        {ret.tax_periods?.start_date
                          ? new Date(ret.tax_periods.start_date).toLocaleDateString("ar-SA")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {ret.tax_periods?.end_date
                          ? new Date(ret.tax_periods.end_date).toLocaleDateString("ar-SA")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-left">
                        {(ret.output_vat || 0).toLocaleString("ar-SA")} ر.ي
                      </TableCell>
                      <TableCell className="text-left">
                        {(ret.input_vat || 0).toLocaleString("ar-SA")} ر.ي
                      </TableCell>
                      <TableCell className="text-left font-bold">
                        <span className={ret.net_vat && ret.net_vat > 0 ? "text-red-600" : "text-green-600"}>
                          {(ret.net_vat || 0).toLocaleString("ar-SA")} ر.ي
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(ret.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetails(ret)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {ret.status === "draft" && isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSubmitClick(ret.id)}
                              disabled={submitMutation.isPending}
                            >
                              <Send className="h-4 w-4 ml-1" />
                              تقديم
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {returns?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                لا توجد إقرارات ضريبية. ابدأ بإنشاء إقرار جديد.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل الإقرار الضريبي</DialogTitle>
              <DialogDescription>
                رقم الإقرار: {selectedReturn?.return_number}
              </DialogDescription>
            </DialogHeader>
            
            {selectedReturn && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">تاريخ التقديم</Label>
                    <p className="font-medium">
                      {selectedReturn.filing_date
                        ? new Date(selectedReturn.filing_date).toLocaleDateString("ar-SA")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الحالة</Label>
                    <p>{getStatusBadge(selectedReturn.status)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الفترة الضريبية</Label>
                    <p className="font-medium">{selectedReturn.tax_periods?.period_number || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">نوع الفترة</Label>
                    <p className="font-medium">{selectedReturn.tax_periods?.period_type || "-"}</p>
                  </div>
                </div>

                <Separator />

                {/* Sales Section */}
                <div>
                  <h4 className="font-semibold mb-3">المبيعات</h4>
                  <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                    <div>
                      <Label className="text-muted-foreground">إجمالي المبيعات</Label>
                      <p className="font-medium">{(selectedReturn.total_sales || 0).toLocaleString("ar-SA")} ر.ي</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">المبيعات الخاضعة للضريبة</Label>
                      <p className="font-medium">{(selectedReturn.standard_rated_sales || 0).toLocaleString("ar-SA")} ر.ي</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">المبيعات الصفرية</Label>
                      <p className="font-medium">{(selectedReturn.zero_rated_sales || 0).toLocaleString("ar-SA")} ر.ي</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">المبيعات المعفاة</Label>
                      <p className="font-medium">{(selectedReturn.exempt_sales || 0).toLocaleString("ar-SA")} ر.ي</p>
                    </div>
                  </div>
                </div>

                {/* Purchases Section */}
                <div>
                  <h4 className="font-semibold mb-3">المشتريات</h4>
                  <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                    <div>
                      <Label className="text-muted-foreground">إجمالي المشتريات</Label>
                      <p className="font-medium">{(selectedReturn.total_purchases || 0).toLocaleString("ar-SA")} ر.ي</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">المشتريات الخاضعة للضريبة</Label>
                      <p className="font-medium">{(selectedReturn.standard_rated_purchases || 0).toLocaleString("ar-SA")} ر.ي</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">المشتريات الصفرية</Label>
                      <p className="font-medium">{(selectedReturn.zero_rated_purchases || 0).toLocaleString("ar-SA")} ر.ي</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">المشتريات المعفاة</Label>
                      <p className="font-medium">{(selectedReturn.exempt_purchases || 0).toLocaleString("ar-SA")} ر.ي</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* VAT Calculation */}
                <div>
                  <h4 className="font-semibold mb-3">حساب الضريبة</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 p-4 rounded-lg">
                      <Label className="text-muted-foreground">ضريبة المخرجات (على المبيعات)</Label>
                      <p className="text-xl font-bold text-red-600">
                        {(selectedReturn.output_vat || 0).toLocaleString("ar-SA")} ر.ي
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <Label className="text-muted-foreground">ضريبة المدخلات (على المشتريات)</Label>
                      <p className="text-xl font-bold text-green-600">
                        {(selectedReturn.input_vat || 0).toLocaleString("ar-SA")} ر.ي
                      </p>
                    </div>
                    {selectedReturn.corrections !== null && selectedReturn.corrections !== 0 && (
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <Label className="text-muted-foreground">التعديلات والتصحيحات</Label>
                        <p className="text-xl font-bold text-yellow-600">
                          {(selectedReturn.corrections || 0).toLocaleString("ar-SA")} ر.ي
                        </p>
                      </div>
                    )}
                    <div className="col-span-2 bg-primary/10 p-4 rounded-lg">
                      <Label className="text-muted-foreground">صافي الضريبة المستحقة / المستردة</Label>
                      <p className={`text-2xl font-bold ${(selectedReturn.net_vat || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                        {(selectedReturn.net_vat || 0).toLocaleString("ar-SA")} ر.ي
                        <span className="text-sm font-normal mr-2">
                          {(selectedReturn.net_vat || 0) > 0 ? "(مستحقة للدفع)" : "(قابلة للاسترداد)"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submission Info */}
                {selectedReturn.status === "submitted" && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3">معلومات التقديم</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">تاريخ التقديم</Label>
                          <p className="font-medium">
                            {selectedReturn.submitted_at
                              ? new Date(selectedReturn.submitted_at).toLocaleDateString("ar-SA")
                              : "-"}
                          </p>
                        </div>
                        {selectedReturn.submission_reference && (
                          <div>
                            <Label className="text-muted-foreground">رقم المرجع</Label>
                            <p className="font-medium">{selectedReturn.submission_reference}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {selectedReturn.notes && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-muted-foreground">ملاحظات</Label>
                      <p className="mt-1">{selectedReturn.notes}</p>
                    </div>
                  </>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Submit Confirmation Dialog */}
        <Dialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد تقديم الإقرار</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من رغبتك في تقديم هذا الإقرار الضريبي؟ لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubmitConfirmOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={() => returnToSubmit && submitMutation.mutate(returnToSubmit)}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "جارٍ التقديم..." : "تأكيد التقديم"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default VATReturns;
