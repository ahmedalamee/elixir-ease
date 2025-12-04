import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupplierAging, SupplierAgingRow } from "@/lib/accounting";
import { useUserRole } from "@/hooks/useUserRole";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Download, Truck, Search, RefreshCw, AlertTriangle } from "lucide-react";

const SupplierAgingReport = () => {
  const { hasAnyRole } = useUserRole();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyWithBalance, setShowOnlyWithBalance] = useState(true);

  const canView = hasAnyRole(["admin", "pharmacist", "inventory_manager"]);

  const {
    data: agingData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["supplier-aging", asOfDate],
    queryFn: () => getSupplierAging(asOfDate),
    enabled: canView,
  });

  // Filter data based on search and toggle
  const filteredData = (agingData || []).filter((row) => {
    const matchesSearch = row.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const hasBalance = showOnlyWithBalance ? row.totalOutstanding > 0.01 : true;
    return matchesSearch && hasBalance;
  });

  // Calculate totals
  const totals = filteredData.reduce(
    (acc, row) => ({
      currentAmount: acc.currentAmount + row.currentAmount,
      bucket1_30: acc.bucket1_30 + row.bucket1_30,
      bucket31_60: acc.bucket31_60 + row.bucket31_60,
      bucket61_90: acc.bucket61_90 + row.bucket61_90,
      bucket91_120: acc.bucket91_120 + row.bucket91_120,
      bucketOver120: acc.bucketOver120 + row.bucketOver120,
      totalOutstanding: acc.totalOutstanding + row.totalOutstanding,
    }),
    { currentAmount: 0, bucket1_30: 0, bucket31_60: 0, bucket61_90: 0, bucket91_120: 0, bucketOver120: 0, totalOutstanding: 0 }
  );

  const exportToCSV = () => {
    if (!filteredData.length) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const headers = ["المورد", "الإجمالي", "غير مستحق", "1-30 يوم", "31-60 يوم", "61-90 يوم", "91-120 يوم", "أكثر من 120 يوم"];
    const rows = filteredData.map((row) => [
      row.supplierName,
      row.totalOutstanding.toFixed(2),
      row.currentAmount.toFixed(2),
      row.bucket1_30.toFixed(2),
      row.bucket31_60.toFixed(2),
      row.bucket61_90.toFixed(2),
      row.bucket91_120.toFixed(2),
      row.bucketOver120.toFixed(2),
    ]);

    // Add totals row
    rows.push([
      "الإجمالي",
      totals.totalOutstanding.toFixed(2),
      totals.currentAmount.toFixed(2),
      totals.bucket1_30.toFixed(2),
      totals.bucket31_60.toFixed(2),
      totals.bucket61_90.toFixed(2),
      totals.bucket91_120.toFixed(2),
      totals.bucketOver120.toFixed(2),
    ]);

    const csvContent =
      "\uFEFF" + // BOM for UTF-8
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_أعمار_ديون_الموردين_${asOfDate}.csv`;
    link.click();
    toast.success("تم تصدير التقرير بنجاح");
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-6 w-6" />
              تقرير أعمار ديون الموردين (AP Aging)
            </CardTitle>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 ml-2" />
              تصدير CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>كما في تاريخ</Label>
                <Input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label>بحث بالمورد</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث بالاسم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-balance"
                  checked={showOnlyWithBalance}
                  onCheckedChange={setShowOnlyWithBalance}
                />
                <Label htmlFor="show-balance" className="text-sm">أرصدة مستحقة فقط</Label>
              </div>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
            </div>

            {/* Summary Cards */}
            {filteredData.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">عدد الموردين</div>
                    <div className="text-2xl font-bold">{filteredData.length}</div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">إجمالي المستحقات</div>
                    <div className="text-2xl font-bold">{formatNumber(totals.totalOutstanding)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-500/10 border-orange-500/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-orange-600 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      متأخرات (31+ يوم)
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatNumber(totals.bucket31_60 + totals.bucket61_90 + totals.bucket91_120 + totals.bucketOver120)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/10 border-red-500/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      حرجة (120+ يوم)
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatNumber(totals.bucketOver120)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Data Table */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">جارٍ التحميل...</div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد ديون مستحقة حتى هذا التاريخ
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المورد</TableHead>
                      <TableHead className="text-left">الإجمالي</TableHead>
                      <TableHead className="text-left">غير مستحق</TableHead>
                      <TableHead className="text-left">1-30 يوم</TableHead>
                      <TableHead className="text-left">31-60 يوم</TableHead>
                      <TableHead className="text-left">61-90 يوم</TableHead>
                      <TableHead className="text-left">91-120 يوم</TableHead>
                      <TableHead className="text-left">120+ يوم</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row) => (
                      <TableRow key={row.supplierId}>
                        <TableCell className="font-medium">{row.supplierName}</TableCell>
                        <TableCell className="font-semibold">{formatNumber(row.totalOutstanding)}</TableCell>
                        <TableCell className="text-green-600">{formatNumber(row.currentAmount)}</TableCell>
                        <TableCell>{formatNumber(row.bucket1_30)}</TableCell>
                        <TableCell className={row.bucket31_60 > 0 ? "text-yellow-600" : ""}>
                          {formatNumber(row.bucket31_60)}
                        </TableCell>
                        <TableCell className={row.bucket61_90 > 0 ? "text-orange-600" : ""}>
                          {formatNumber(row.bucket61_90)}
                        </TableCell>
                        <TableCell className={row.bucket91_120 > 0 ? "text-orange-700 font-medium" : ""}>
                          {formatNumber(row.bucket91_120)}
                        </TableCell>
                        <TableCell className={row.bucketOver120 > 0 ? "text-red-600 font-semibold" : ""}>
                          {formatNumber(row.bucketOver120)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>الإجمالي</TableCell>
                      <TableCell>{formatNumber(totals.totalOutstanding)}</TableCell>
                      <TableCell>{formatNumber(totals.currentAmount)}</TableCell>
                      <TableCell>{formatNumber(totals.bucket1_30)}</TableCell>
                      <TableCell>{formatNumber(totals.bucket31_60)}</TableCell>
                      <TableCell>{formatNumber(totals.bucket61_90)}</TableCell>
                      <TableCell>{formatNumber(totals.bucket91_120)}</TableCell>
                      <TableCell>{formatNumber(totals.bucketOver120)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupplierAgingReport;
