import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupplierAging, SupplierAgingRow } from "@/lib/accounting";
import { useUserRole } from "@/hooks/useUserRole";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Download, Building2, Search, RefreshCw } from "lucide-react";

const SupplierAgingReport = () => {
  const { hasAnyRole } = useUserRole();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredData = (agingData || []).filter((row) =>
    row.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = filteredData.reduce(
    (acc, row) => ({
      totalBalance: acc.totalBalance + row.totalBalance,
      current: acc.current + row.current,
      d31_60: acc.d31_60 + row.d31_60,
      d61_90: acc.d61_90 + row.d61_90,
      over90: acc.over90 + row.over90,
    }),
    { totalBalance: 0, current: 0, d31_60: 0, d61_90: 0, over90: 0 }
  );

  const exportToCSV = () => {
    if (!filteredData.length) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const headers = ["المورد", "الإجمالي", "0-30 يوم", "31-60 يوم", "61-90 يوم", "أكثر من 90 يوم"];
    const rows = filteredData.map((row) => [
      row.supplierName,
      row.totalBalance.toFixed(2),
      row.current.toFixed(2),
      row.d31_60.toFixed(2),
      row.d61_90.toFixed(2),
      row.over90.toFixed(2),
    ]);

    // Add totals row
    rows.push([
      "الإجمالي",
      totals.totalBalance.toFixed(2),
      totals.current.toFixed(2),
      totals.d31_60.toFixed(2),
      totals.d61_90.toFixed(2),
      totals.over90.toFixed(2),
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
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
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
            </div>

            {/* Data Table */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">جارٍ التحميل...</div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد ديون مستحقة حتى هذا التاريخ
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المورد</TableHead>
                      <TableHead className="text-left">الإجمالي</TableHead>
                      <TableHead className="text-left">0-30 يوم</TableHead>
                      <TableHead className="text-left">31-60 يوم</TableHead>
                      <TableHead className="text-left">61-90 يوم</TableHead>
                      <TableHead className="text-left">90+ يوم</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row) => (
                      <TableRow key={row.supplierId}>
                        <TableCell className="font-medium">{row.supplierName}</TableCell>
                        <TableCell className="font-semibold">{formatNumber(row.totalBalance)}</TableCell>
                        <TableCell>{formatNumber(row.current)}</TableCell>
                        <TableCell className={row.d31_60 > 0 ? "text-yellow-600" : ""}>
                          {formatNumber(row.d31_60)}
                        </TableCell>
                        <TableCell className={row.d61_90 > 0 ? "text-orange-600" : ""}>
                          {formatNumber(row.d61_90)}
                        </TableCell>
                        <TableCell className={row.over90 > 0 ? "text-red-600 font-semibold" : ""}>
                          {formatNumber(row.over90)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>الإجمالي</TableCell>
                      <TableCell>{formatNumber(totals.totalBalance)}</TableCell>
                      <TableCell>{formatNumber(totals.current)}</TableCell>
                      <TableCell>{formatNumber(totals.d31_60)}</TableCell>
                      <TableCell>{formatNumber(totals.d61_90)}</TableCell>
                      <TableCell>{formatNumber(totals.over90)}</TableCell>
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
