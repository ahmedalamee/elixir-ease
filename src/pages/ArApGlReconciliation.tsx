import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  reconcileArWithGl,
  reconcileApWithGl,
  rebuildCustomerBalance,
  rebuildSupplierBalance,
  ArReconciliationRow,
  ApReconciliationRow,
} from "@/lib/accounting";
import { useUserRole } from "@/hooks/useUserRole";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Download,
  RefreshCw,
  Scale,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wrench,
} from "lucide-react";

const ArApGlReconciliation = () => {
  const { hasAnyRole } = useUserRole();
  const queryClient = useQueryClient();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("ar");

  const canView = hasAnyRole(["admin", "pharmacist", "inventory_manager"]);
  const canRebuild = hasAnyRole(["admin"]);

  // AR Reconciliation Query
  const {
    data: arData,
    isLoading: arLoading,
    refetch: refetchAr,
  } = useQuery({
    queryKey: ["ar-reconciliation", asOfDate],
    queryFn: () => reconcileArWithGl(asOfDate),
    enabled: canView,
  });

  // AP Reconciliation Query
  const {
    data: apData,
    isLoading: apLoading,
    refetch: refetchAp,
  } = useQuery({
    queryKey: ["ap-reconciliation", asOfDate],
    queryFn: () => reconcileApWithGl(asOfDate),
    enabled: canView,
  });

  // Rebuild Customer Balance Mutation
  const rebuildCustomerMutation = useMutation({
    mutationFn: rebuildCustomerBalance,
    onSuccess: (newBalance, customerId) => {
      toast.success(`تم تحديث رصيد العميل: ${newBalance.toFixed(2)}`);
      queryClient.invalidateQueries({ queryKey: ["ar-reconciliation"] });
    },
    onError: (error: any) => {
      toast.error(`خطأ في إعادة بناء الرصيد: ${error.message}`);
    },
  });

  // Rebuild Supplier Balance Mutation
  const rebuildSupplierMutation = useMutation({
    mutationFn: rebuildSupplierBalance,
    onSuccess: (newBalance, supplierId) => {
      toast.success(`تم تحديث رصيد المورد: ${newBalance.toFixed(2)}`);
      queryClient.invalidateQueries({ queryKey: ["ap-reconciliation"] });
    },
    onError: (error: any) => {
      toast.error(`خطأ في إعادة بناء الرصيد: ${error.message}`);
    },
  });

  const formatNumber = (num: number) => {
    return num.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "matched":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 ml-1" />
            متطابق
          </Badge>
        );
      case "mismatch":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 ml-1" />
            عدم تطابق
          </Badge>
        );
      case "only_in_subledger":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            <AlertTriangle className="h-3 w-3 ml-1" />
            في الفرعي فقط
          </Badge>
        );
      case "only_in_gl":
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600">
            <AlertTriangle className="h-3 w-3 ml-1" />
            في الأستاذ فقط
          </Badge>
        );
      default:
        return <Badge variant="secondary">غير محدد</Badge>;
    }
  };

  // Calculate AR summary
  const arSummary = {
    total: arData?.length || 0,
    matched: arData?.filter((r) => r.status === "matched").length || 0,
    mismatched: arData?.filter((r) => r.status !== "matched").length || 0,
    totalSubledger: arData?.reduce((sum, r) => sum + r.subledgerBalance, 0) || 0,
    totalGl: arData?.reduce((sum, r) => sum + r.glBalance, 0) || 0,
    totalDiff: arData?.reduce((sum, r) => sum + Math.abs(r.difference), 0) || 0,
  };

  // Calculate AP summary
  const apSummary = {
    total: apData?.length || 0,
    matched: apData?.filter((r) => r.status === "matched").length || 0,
    mismatched: apData?.filter((r) => r.status !== "matched").length || 0,
    totalSubledger: apData?.reduce((sum, r) => sum + r.subledgerBalance, 0) || 0,
    totalGl: apData?.reduce((sum, r) => sum + r.glBalance, 0) || 0,
    totalDiff: apData?.reduce((sum, r) => sum + Math.abs(r.difference), 0) || 0,
  };

  const exportToCSV = (type: "ar" | "ap") => {
    const data = type === "ar" ? arData : apData;
    const entityLabel = type === "ar" ? "العميل" : "المورد";
    const fileName = type === "ar" ? "مطابقة_الذمم_المدينة" : "مطابقة_الذمم_الدائنة";

    if (!data || data.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const headers = [entityLabel, "رصيد الفرعي", "رصيد الأستاذ", "الفرق", "الحالة"];
    const rows = data.map((row: any) => [
      type === "ar" ? row.customerName : row.supplierName,
      row.subledgerBalance.toFixed(2),
      row.glBalance.toFixed(2),
      row.difference.toFixed(2),
      row.status === "matched" ? "متطابق" : "غير متطابق",
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}_${asOfDate}.csv`;
    link.click();
    toast.success("تم تصدير التقرير بنجاح");
  };

  if (!canView) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8 text-center text-muted-foreground">
          ليس لديك صلاحية لعرض هذا التقرير
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-6 w-6" />
              مطابقة الذمم المدينة والدائنة مع الأستاذ العام
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label>كما في تاريخ:</Label>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-48"
              />
              <Button
                onClick={() => {
                  refetchAr();
                  refetchAp();
                }}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="ar" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  الذمم المدينة (AR)
                  {arSummary.mismatched > 0 && (
                    <Badge variant="destructive" className="mr-2">
                      {arSummary.mismatched}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="ap" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  الذمم الدائنة (AP)
                  {apSummary.mismatched > 0 && (
                    <Badge variant="destructive" className="mr-2">
                      {apSummary.mismatched}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* AR Tab */}
              <TabsContent value="ar" className="space-y-4">
                {/* AR Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">إجمالي العملاء</div>
                      <div className="text-2xl font-bold">{arSummary.total}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">متطابق</div>
                      <div className="text-2xl font-bold text-green-600">{arSummary.matched}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">غير متطابق</div>
                      <div className="text-2xl font-bold text-red-600">{arSummary.mismatched}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">إجمالي الفروقات</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {formatNumber(arSummary.totalDiff)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => exportToCSV("ar")} variant="outline">
                    <Download className="h-4 w-4 ml-2" />
                    تصدير CSV
                  </Button>
                </div>

                {arLoading ? (
                  <div className="text-center py-8 text-muted-foreground">جارٍ التحميل...</div>
                ) : !arData || arData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات للمطابقة
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">العميل</TableHead>
                          <TableHead className="text-left">رصيد الفرعي</TableHead>
                          <TableHead className="text-left">رصيد الأستاذ</TableHead>
                          <TableHead className="text-left">الفرق</TableHead>
                          <TableHead className="text-center">الحالة</TableHead>
                          {canRebuild && <TableHead className="text-center">إجراء</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {arData.map((row) => (
                          <TableRow
                            key={row.customerId}
                            className={row.status !== "matched" ? "bg-red-50 dark:bg-red-950/20" : ""}
                          >
                            <TableCell className="font-medium">{row.customerName}</TableCell>
                            <TableCell>{formatNumber(row.subledgerBalance)}</TableCell>
                            <TableCell>{formatNumber(row.glBalance)}</TableCell>
                            <TableCell
                              className={
                                Math.abs(row.difference) > 0.01
                                  ? "text-red-600 font-semibold"
                                  : ""
                              }
                            >
                              {formatNumber(row.difference)}
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(row.status)}
                            </TableCell>
                            {canRebuild && (
                              <TableCell className="text-center">
                                {row.status !== "matched" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => rebuildCustomerMutation.mutate(row.customerId)}
                                    disabled={rebuildCustomerMutation.isPending}
                                  >
                                    <Wrench className="h-3 w-3 ml-1" />
                                    إصلاح
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>الإجمالي</TableCell>
                          <TableCell>{formatNumber(arSummary.totalSubledger)}</TableCell>
                          <TableCell>{formatNumber(arSummary.totalGl)}</TableCell>
                          <TableCell>{formatNumber(arSummary.totalDiff)}</TableCell>
                          <TableCell colSpan={canRebuild ? 2 : 1}></TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* AP Tab */}
              <TabsContent value="ap" className="space-y-4">
                {/* AP Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">إجمالي الموردين</div>
                      <div className="text-2xl font-bold">{apSummary.total}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">متطابق</div>
                      <div className="text-2xl font-bold text-green-600">{apSummary.matched}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">غير متطابق</div>
                      <div className="text-2xl font-bold text-red-600">{apSummary.mismatched}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">إجمالي الفروقات</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {formatNumber(apSummary.totalDiff)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => exportToCSV("ap")} variant="outline">
                    <Download className="h-4 w-4 ml-2" />
                    تصدير CSV
                  </Button>
                </div>

                {apLoading ? (
                  <div className="text-center py-8 text-muted-foreground">جارٍ التحميل...</div>
                ) : !apData || apData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات للمطابقة
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">المورد</TableHead>
                          <TableHead className="text-left">رصيد الفرعي</TableHead>
                          <TableHead className="text-left">رصيد الأستاذ</TableHead>
                          <TableHead className="text-left">الفرق</TableHead>
                          <TableHead className="text-center">الحالة</TableHead>
                          {canRebuild && <TableHead className="text-center">إجراء</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {apData.map((row) => (
                          <TableRow
                            key={row.supplierId}
                            className={row.status !== "matched" ? "bg-red-50 dark:bg-red-950/20" : ""}
                          >
                            <TableCell className="font-medium">{row.supplierName}</TableCell>
                            <TableCell>{formatNumber(row.subledgerBalance)}</TableCell>
                            <TableCell>{formatNumber(row.glBalance)}</TableCell>
                            <TableCell
                              className={
                                Math.abs(row.difference) > 0.01
                                  ? "text-red-600 font-semibold"
                                  : ""
                              }
                            >
                              {formatNumber(row.difference)}
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(row.status)}
                            </TableCell>
                            {canRebuild && (
                              <TableCell className="text-center">
                                {row.status !== "matched" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => rebuildSupplierMutation.mutate(row.supplierId)}
                                    disabled={rebuildSupplierMutation.isPending}
                                  >
                                    <Wrench className="h-3 w-3 ml-1" />
                                    إصلاح
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>الإجمالي</TableCell>
                          <TableCell>{formatNumber(apSummary.totalSubledger)}</TableCell>
                          <TableCell>{formatNumber(apSummary.totalGl)}</TableCell>
                          <TableCell>{formatNumber(apSummary.totalDiff)}</TableCell>
                          <TableCell colSpan={canRebuild ? 2 : 1}></TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ArApGlReconciliation;
