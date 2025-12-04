import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSupplierStatement, StatementResult } from "@/lib/accounting";
import { useUserRole } from "@/hooks/useUserRole";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Download, FileText, Search } from "lucide-react";

const SupplierStatement = () => {
  const { hasAnyRole } = useUserRole();
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today.toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");

  const canView = hasAnyRole(["admin", "pharmacist", "inventory_manager"]);

  // Fetch suppliers
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: canView,
  });

  // Fetch statement when supplier is selected
  const {
    data: statementData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["supplier-statement", selectedSupplierId, fromDate, toDate],
    queryFn: () => getSupplierStatement(selectedSupplierId, fromDate, toDate),
    enabled: canView && !!selectedSupplierId && !!fromDate && !!toDate,
  });

  const filteredSuppliers = (suppliers || []).filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    if (!statementData || !statementData.transactions.length) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const headers = ["التاريخ", "نوع المستند", "رقم المستند", "البيان", "مدين", "دائن", "الرصيد"];
    const rows: string[][] = [];

    // Opening balance row
    rows.push([
      fromDate,
      "رصيد افتتاحي",
      "-",
      "الرصيد الافتتاحي",
      "0.00",
      statementData.openingBalance > 0 ? statementData.openingBalance.toFixed(2) : "0.00",
      statementData.openingBalance.toFixed(2),
    ]);

    // Transaction rows
    statementData.transactions.forEach((tx) => {
      rows.push([
        tx.date,
        tx.documentType,
        tx.documentNumber,
        tx.description,
        tx.debit.toFixed(2),
        tx.credit.toFixed(2),
        tx.balanceAfter.toFixed(2),
      ]);
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `كشف_حساب_مورد_${statementData.entityName}_${fromDate}_${toDate}.csv`;
    link.click();
    toast.success("تم تصدير الكشف بنجاح");
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
              <FileText className="h-6 w-6" />
              كشف حساب مورد
            </CardTitle>
            {statementData && (
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 ml-2" />
                تصدير CSV
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>اختر المورد</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مورداً..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="بحث..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pr-10"
                        />
                      </div>
                    </div>
                    {filteredSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => refetch()}
                  disabled={!selectedSupplierId}
                  className="w-full"
                >
                  عرض الكشف
                </Button>
              </div>
            </div>

            {/* Statement Content */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">جارٍ التحميل...</div>
            ) : statementData ? (
              <div className="space-y-4">
                {/* Header Info */}
                <div className="bg-muted/50 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">المورد</div>
                    <div className="font-semibold">{statementData.entityName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">الفترة</div>
                    <div className="font-semibold">
                      {new Date(fromDate).toLocaleDateString("ar-SA")} -{" "}
                      {new Date(toDate).toLocaleDateString("ar-SA")}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">الرصيد الافتتاحي</div>
                    <div className="font-semibold">{formatNumber(statementData.openingBalance)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">الرصيد الختامي</div>
                    <div className="font-semibold text-primary">
                      {formatNumber(statementData.closingBalance)}
                    </div>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">رقم المستند</TableHead>
                        <TableHead className="text-right">البيان</TableHead>
                        <TableHead className="text-left">مدين</TableHead>
                        <TableHead className="text-left">دائن</TableHead>
                        <TableHead className="text-left">الرصيد</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Opening Balance Row */}
                      <TableRow className="bg-muted/30">
                        <TableCell>{new Date(fromDate).toLocaleDateString("ar-SA")}</TableCell>
                        <TableCell>رصيد افتتاحي</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>الرصيد الافتتاحي</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>
                          {statementData.openingBalance > 0
                            ? formatNumber(statementData.openingBalance)
                            : "-"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatNumber(statementData.openingBalance)}
                        </TableCell>
                      </TableRow>

                      {/* Transaction Rows */}
                      {statementData.transactions.map((tx, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(tx.date).toLocaleDateString("ar-SA")}
                          </TableCell>
                          <TableCell>{tx.documentType}</TableCell>
                          <TableCell className="font-mono">{tx.documentNumber}</TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell>{tx.debit > 0 ? formatNumber(tx.debit) : "-"}</TableCell>
                          <TableCell>{tx.credit > 0 ? formatNumber(tx.credit) : "-"}</TableCell>
                          <TableCell className="font-semibold">
                            {formatNumber(tx.balanceAfter)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary */}
                <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center">
                  <div className="flex gap-8">
                    <div>
                      <span className="text-muted-foreground ml-2">إجمالي المدين:</span>
                      <span className="font-semibold">{formatNumber(statementData.totalDebit)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground ml-2">إجمالي الدائن:</span>
                      <span className="font-semibold">{formatNumber(statementData.totalCredit)}</span>
                    </div>
                  </div>
                  <div className="text-lg">
                    <span className="text-muted-foreground ml-2">الرصيد الختامي:</span>
                    <span className="font-bold text-primary">
                      {formatNumber(statementData.closingBalance)}
                    </span>
                  </div>
                </div>
              </div>
            ) : selectedSupplierId ? (
              <div className="text-center py-8 text-muted-foreground">
                اضغط "عرض الكشف" لعرض بيانات الحساب
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                اختر مورداً لعرض كشف حسابه
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupplierStatement;
