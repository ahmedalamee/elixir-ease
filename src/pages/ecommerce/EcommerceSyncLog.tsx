import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { TreeSidebar } from "@/components/TreeSidebar";
import { menuTree } from "@/data/menu-tree";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";

const syncTypeMap: Record<string, string> = {
  order: "طلب",
  product: "منتج",
  customer: "عميل",
  inventory: "مخزون",
};

const statusMap: Record<string, { label: string; icon: any; variant: "default" | "secondary" | "destructive" }> = {
  success: { label: "ناجح", icon: CheckCircle, variant: "default" },
  failed: { label: "فشل", icon: XCircle, variant: "destructive" },
  pending: { label: "قيد الانتظار", icon: Clock, variant: "secondary" },
};

export default function EcommerceSyncLog() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["ecommerce-sync-logs", typeFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("ecommerce_sync_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (typeFilter !== "all") {
        query = query.eq("sync_type", typeFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="flex">
        <TreeSidebar menuData={menuTree} />
        <main className="flex-1 container mx-auto py-6 px-4 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">سجل مزامنة المتجر</h1>
          </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="نوع المزامنة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="order">طلبات</SelectItem>
                <SelectItem value="product">منتجات</SelectItem>
                <SelectItem value="customer">عملاء</SelectItem>
                <SelectItem value="inventory">مخزون</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="success">ناجح</SelectItem>
                <SelectItem value="failed">فشل</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الإجراء</TableHead>
                <TableHead>المعرف الخارجي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>رسالة الخطأ</TableHead>
                <TableHead>التفاصيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    لا توجد سجلات مزامنة
                  </TableCell>
                </TableRow>
              ) : (
                logs?.map((log) => {
                  const StatusIcon = statusMap[log.status]?.icon || Clock;
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{syncTypeMap[log.sync_type] || log.sync_type}</Badge>
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.external_id || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[log.status]?.variant || "secondary"}>
                          <StatusIcon className="h-3 w-3 ml-1" />
                          {statusMap[log.status]?.label || log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-destructive">
                        {log.error_message || "-"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل المزامنة</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">النوع</label>
                  <p className="font-medium">{syncTypeMap[selectedLog.sync_type]}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">الإجراء</label>
                  <p className="font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">المعرف الخارجي</label>
                  <p className="font-mono">{selectedLog.external_id || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">المعرف الداخلي</label>
                  <p className="font-mono text-sm">{selectedLog.internal_id || "-"}</p>
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="bg-destructive/10 p-4 rounded">
                  <label className="text-sm text-destructive font-medium">رسالة الخطأ</label>
                  <p>{selectedLog.error_message}</p>
                </div>
              )}

              {selectedLog.request_data && (
                <div>
                  <label className="text-sm text-muted-foreground">بيانات الطلب</label>
                  <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-60 mt-2" dir="ltr">
                    {JSON.stringify(selectedLog.request_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.response_data && (
                <div>
                  <label className="text-sm text-muted-foreground">بيانات الاستجابة</label>
                  <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-60 mt-2" dir="ltr">
                    {JSON.stringify(selectedLog.response_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
        </main>
      </div>
    </div>
  );
}
