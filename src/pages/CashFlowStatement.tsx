import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getCashFlowDirect, getCashFlowIndirect, type CashFlowData } from "@/lib/accounting";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const CashFlowStatement = () => {
  const currentDate = new Date();
  const firstDayOfYear = new Date(currentDate.getFullYear(), 0, 1).toISOString().split("T")[0];
  const today = currentDate.toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(firstDayOfYear);
  const [toDate, setToDate] = useState(today);
  const [method, setMethod] = useState<"direct" | "indirect">("direct");

  const { isAdmin, hasRole, loading: roleLoading } = useUserRole();

  // Fetch direct method data
  const { data: directData, isLoading: directLoading, refetch: refetchDirect } = useQuery({
    queryKey: ["cash-flow-direct", fromDate, toDate],
    queryFn: () => getCashFlowDirect({ fromDate, toDate }),
    enabled: method === "direct",
  });

  // Fetch indirect method data
  const { data: indirectData, isLoading: indirectLoading, refetch: refetchIndirect } = useQuery({
    queryKey: ["cash-flow-indirect", fromDate, toDate],
    queryFn: () => getCashFlowIndirect({ fromDate, toDate }),
    enabled: method === "indirect",
  });

  const data: CashFlowData | undefined = method === "direct" ? directData : indirectData;
  const isLoading = method === "direct" ? directLoading : indirectLoading;

  const handleApplyFilter = () => {
    if (method === "direct") {
      refetchDirect();
    } else {
      refetchIndirect();
    }
  };

  const exportToCSV = () => {
    if (!data) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const rows: string[][] = [
      ["قائمة التدفقات النقدية"],
      [`الفترة: من ${fromDate} إلى ${toDate}`],
      [`الطريقة: ${method === "direct" ? "المباشرة" : "غير المباشرة"}`],
      [],
      ["البيان", "المبلغ"],
      [],
      [data.operatingActivities.name, ""],
      ...data.operatingActivities.items.map(i => [i.description, i.amount.toFixed(2)]),
      ["إجمالي الأنشطة التشغيلية", data.operatingActivities.total.toFixed(2)],
      [],
      [data.investingActivities.name, ""],
      ...data.investingActivities.items.map(i => [i.description, i.amount.toFixed(2)]),
      ["إجمالي الأنشطة الاستثمارية", data.investingActivities.total.toFixed(2)],
      [],
      [data.financingActivities.name, ""],
      ...data.financingActivities.items.map(i => [i.description, i.amount.toFixed(2)]),
      ["إجمالي الأنشطة التمويلية", data.financingActivities.total.toFixed(2)],
      [],
      ["صافي التغير في النقدية", data.netCashChange.toFixed(2)],
      ["رصيد النقدية أول الفترة", data.openingCashBalance.toFixed(2)],
      ["رصيد النقدية آخر الفترة", data.closingCashBalance.toFixed(2)],
    ];

    const csvContent = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cash_flow_${method}_${fromDate}_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير التقرير بنجاح");
  };

  const formatAmount = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString("ar-SA", { minimumFractionDigits: 2 });
    return amount < 0 ? `(${formatted})` : formatted;
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8 text-center">جارٍ التحميل...</div>
      </div>
    );
  }

  if (!isAdmin && !hasRole("pharmacist") && !hasRole("inventory_manager")) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8">
          <Alert variant="destructive">
            <AlertDescription>ليس لديك صلاحية الوصول إلى هذه الصفحة.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-6 w-6" />
                  قائمة التدفقات النقدية
                </CardTitle>
                <CardDescription className="mt-2">
                  تحليل حركة النقدية من الأنشطة التشغيلية والاستثمارية والتمويلية
                </CardDescription>
              </div>
              <Button variant="outline" onClick={exportToCSV} disabled={!data}>
                <Download className="h-4 w-4 ml-2" />
                تصدير CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end mb-6">
              <div>
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-40 mt-1"
                />
              </div>
              <div>
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-40 mt-1"
                />
              </div>
              <Button onClick={handleApplyFilter}>تطبيق</Button>
            </div>

            {/* Method Tabs */}
            <Tabs value={method} onValueChange={(v) => setMethod(v as "direct" | "indirect")}>
              <TabsList className="mb-4">
                <TabsTrigger value="direct">الطريقة المباشرة</TabsTrigger>
                <TabsTrigger value="indirect">الطريقة غير المباشرة</TabsTrigger>
              </TabsList>

              <TabsContent value="direct">
                {isLoading ? (
                  <div className="text-center py-8">جارٍ تحميل البيانات...</div>
                ) : data ? (
                  <CashFlowReport data={data} formatAmount={formatAmount} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    اختر الفترة واضغط تطبيق
                  </div>
                )}
              </TabsContent>

              <TabsContent value="indirect">
                {isLoading ? (
                  <div className="text-center py-8">جارٍ تحميل البيانات...</div>
                ) : data ? (
                  <CashFlowReport data={data} formatAmount={formatAmount} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    اختر الفترة واضغط تطبيق
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

// Sub-component for the cash flow report display
const CashFlowReport = ({ 
  data, 
  formatAmount 
}: { 
  data: CashFlowData; 
  formatAmount: (n: number) => string;
}) => {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">الأنشطة التشغيلية</div>
                <div className={`text-xl font-bold ${data.operatingActivities.total >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatAmount(data.operatingActivities.total)} ر.ي
                </div>
              </div>
              {data.operatingActivities.total >= 0 ? (
                <ArrowUpRight className="h-8 w-8 text-green-500" />
              ) : (
                <ArrowDownRight className="h-8 w-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">الأنشطة الاستثمارية</div>
                <div className={`text-xl font-bold ${data.investingActivities.total >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatAmount(data.investingActivities.total)} ر.ي
                </div>
              </div>
              {data.investingActivities.total >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">الأنشطة التمويلية</div>
                <div className={`text-xl font-bold ${data.financingActivities.total >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatAmount(data.financingActivities.total)} ر.ي
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={data.netCashChange >= 0 ? "bg-green-50" : "bg-red-50"}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">صافي التغير</div>
                <div className={`text-xl font-bold ${data.netCashChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatAmount(data.netCashChange)} ر.ي
                </div>
              </div>
              {data.netCashChange >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-bold">البيان</TableHead>
              <TableHead className="text-left font-bold w-40">المبلغ (ر.ي)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Operating Activities */}
            <TableRow className="bg-blue-50/50">
              <TableCell colSpan={2} className="font-bold text-blue-800">
                {data.operatingActivities.name}
              </TableCell>
            </TableRow>
            {data.operatingActivities.items.map((item, idx) => (
              <TableRow key={`op-${idx}`}>
                <TableCell className="pr-8">{item.description}</TableCell>
                <TableCell className={`text-left ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatAmount(item.amount)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-blue-100/50 font-bold">
              <TableCell>إجمالي الأنشطة التشغيلية</TableCell>
              <TableCell className={`text-left ${data.operatingActivities.total >= 0 ? "text-green-700" : "text-red-700"}`}>
                {formatAmount(data.operatingActivities.total)}
              </TableCell>
            </TableRow>

            {/* Investing Activities */}
            {data.investingActivities.items.length > 0 && (
              <>
                <TableRow className="bg-purple-50/50">
                  <TableCell colSpan={2} className="font-bold text-purple-800">
                    {data.investingActivities.name}
                  </TableCell>
                </TableRow>
                {data.investingActivities.items.map((item, idx) => (
                  <TableRow key={`inv-${idx}`}>
                    <TableCell className="pr-8">{item.description}</TableCell>
                    <TableCell className={`text-left ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatAmount(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-purple-100/50 font-bold">
                  <TableCell>إجمالي الأنشطة الاستثمارية</TableCell>
                  <TableCell className={`text-left ${data.investingActivities.total >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatAmount(data.investingActivities.total)}
                  </TableCell>
                </TableRow>
              </>
            )}

            {/* Financing Activities */}
            {data.financingActivities.items.length > 0 && (
              <>
                <TableRow className="bg-orange-50/50">
                  <TableCell colSpan={2} className="font-bold text-orange-800">
                    {data.financingActivities.name}
                  </TableCell>
                </TableRow>
                {data.financingActivities.items.map((item, idx) => (
                  <TableRow key={`fin-${idx}`}>
                    <TableCell className="pr-8">{item.description}</TableCell>
                    <TableCell className={`text-left ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatAmount(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-orange-100/50 font-bold">
                  <TableCell>إجمالي الأنشطة التمويلية</TableCell>
                  <TableCell className={`text-left ${data.financingActivities.total >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatAmount(data.financingActivities.total)}
                  </TableCell>
                </TableRow>
              </>
            )}

            <TableRow className="h-4" />

            {/* Summary */}
            <TableRow className="border-t-2">
              <TableCell className="font-bold">صافي التغير في النقدية</TableCell>
              <TableCell className={`text-left font-bold ${data.netCashChange >= 0 ? "text-green-700" : "text-red-700"}`}>
                {formatAmount(data.netCashChange)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>رصيد النقدية في بداية الفترة</TableCell>
              <TableCell className="text-left">{formatAmount(data.openingCashBalance)}</TableCell>
            </TableRow>
            <TableRow className="bg-primary/10 font-bold text-lg">
              <TableCell>رصيد النقدية في نهاية الفترة</TableCell>
              <TableCell className={`text-left ${data.closingCashBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
                {formatAmount(data.closingCashBalance)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CashFlowStatement;
