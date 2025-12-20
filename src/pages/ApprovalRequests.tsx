import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Eye, CheckCircle, ClipboardList } from "lucide-react";
import { useApprovalRequests } from "@/hooks/useApprovals";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  cancelled: "bg-gray-500",
};

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  approved: "معتمد",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

const docTypeLabels: Record<string, string> = {
  purchase_requisition: "طلب شراء",
  purchase_order: "أمر شراء",
  sales_invoice: "فاتورة مبيعات",
  expense: "مصروفات",
};

export default function ApprovalRequests() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("all");

  const { data: requests, isLoading } = useApprovalRequests({
    status: statusFilter === "all" ? undefined : statusFilter,
    documentType: docTypeFilter === "all" ? undefined : docTypeFilter,
  });

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">طلبات الموافقة</h1>
          <p className="text-muted-foreground">
            إدارة ومتابعة طلبات الموافقة على المستندات
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {requests?.filter((r) => r.status === "pending").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">قيد الانتظار</p>
              </div>
              <ClipboardList className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {requests?.filter((r) => r.status === "approved").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">معتمد</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {requests?.filter((r) => r.status === "rejected").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">مرفوض</p>
              </div>
              <ClipboardList className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{requests?.length || 0}</p>
                <p className="text-sm text-muted-foreground">الإجمالي</p>
              </div>
              <ClipboardList className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة طلبات الموافقة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
            <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="جميع الأنواع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="purchase_requisition">طلب شراء</SelectItem>
                <SelectItem value="purchase_order">أمر شراء</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : !requests?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد طلبات موافقة</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم المستند</TableHead>
                  <TableHead className="text-right">نوع المستند</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الخطوة الحالية</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.document_number || "-"}
                    </TableCell>
                    <TableCell>
                      {docTypeLabels[request.document_type] || request.document_type}
                    </TableCell>
                    <TableCell>
                      {request.requested_at
                        ? format(new Date(request.requested_at), "dd MMM yyyy", {
                            locale: ar,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {request.current_step} / {request.total_steps}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[request.status] || "bg-gray-500"}>
                        {statusLabels[request.status] || request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/approvals/${request.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
