import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  changed_by: string | null;
  changed_at: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
}

const AuditLog = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [operationFilter, setOperationFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(100);

      if (tableFilter !== "all") {
        query = query.eq("table_name", tableFilter);
      }

      if (operationFilter !== "all") {
        query = query.eq("operation", operationFilter);
      }

      if (fromDate) {
        query = query.gte("changed_at", fromDate.toISOString());
      }

      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("changed_at", endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      setAuditLogs((data || []) as AuditLogEntry[]);
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      toast.error("فشل تحميل سجل التدقيق");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [tableFilter, operationFilter, fromDate, toDate]);

  const getOperationBadgeColor = (operation: string) => {
    switch (operation) {
      case "INSERT":
        return "bg-green-500";
      case "UPDATE":
        return "bg-blue-500";
      case "DELETE":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTableDisplayName = (tableName: string) => {
    const tableNames: Record<string, string> = {
      gl_accounts: "الحسابات",
      gl_journal_entries: "قيود اليومية",
      gl_journal_lines: "بنود القيود",
    };
    return tableNames[tableName] || tableName;
  };

  const handleViewDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setShowDetailsDialog(true);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              سجل التدقيق المحاسبي
            </CardTitle>
            <CardDescription>
              تتبع جميع التغييرات على الحسابات والقيود المحاسبية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>الجدول</Label>
                <Select value={tableFilter} onValueChange={setTableFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="gl_accounts">الحسابات</SelectItem>
                    <SelectItem value="gl_journal_entries">قيود اليومية</SelectItem>
                    <SelectItem value="gl_journal_lines">بنود القيود</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>العملية</Label>
                <Select value={operationFilter} onValueChange={setOperationFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="INSERT">إضافة</SelectItem>
                    <SelectItem value="UPDATE">تعديل</SelectItem>
                    <SelectItem value="DELETE">حذف</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>من تاريخ</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-right">
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "PPP", { locale: ar }) : "اختر التاريخ"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      locale={ar}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>إلى تاريخ</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-right">
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {toDate ? format(toDate, "PPP", { locale: ar }) : "اختر التاريخ"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      locale={ar}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Audit Log Table */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الجدول</TableHead>
                      <TableHead className="text-right">العملية</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">المستخدم</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          لا توجد سجلات تدقيق
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">
                            {getTableDisplayName(log.table_name)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getOperationBadgeColor(log.operation)}>
                              {log.operation === "INSERT" && "إضافة"}
                              {log.operation === "UPDATE" && "تعديل"}
                              {log.operation === "DELETE" && "حذف"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(log.changed_at), "PPp", { locale: ar })}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.changed_by || "النظام"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(log)}
                            >
                              عرض التفاصيل
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>تفاصيل سجل التدقيق</DialogTitle>
            <DialogDescription>
              {selectedLog && (
                <>
                  {getTableDisplayName(selectedLog.table_name)} - {" "}
                  {selectedLog.operation === "INSERT" && "إضافة"}
                  {selectedLog.operation === "UPDATE" && "تعديل"}
                  {selectedLog.operation === "DELETE" && "حذف"}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">معلومات السجل</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">معرف السجل:</span> {selectedLog.record_id}</div>
                    <div><span className="font-medium">التاريخ:</span> {format(new Date(selectedLog.changed_at), "PPpp", { locale: ar })}</div>
                    <div><span className="font-medium">المستخدم:</span> {selectedLog.changed_by || "النظام"}</div>
                  </div>
                </div>

                {selectedLog.old_data && (
                  <div>
                    <h4 className="font-semibold mb-2">البيانات القديمة</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_data && (
                  <div>
                    <h4 className="font-semibold mb-2">البيانات الجديدة</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLog;
