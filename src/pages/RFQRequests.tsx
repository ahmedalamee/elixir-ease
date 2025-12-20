import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Eye, FileText } from "lucide-react";
import { useRFQRequests } from "@/hooks/useRFQ";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  sent: "bg-blue-500",
  received: "bg-yellow-500",
  evaluated: "bg-purple-500",
  awarded: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  sent: "مرسل",
  received: "تم الاستلام",
  evaluated: "تم التقييم",
  awarded: "تم الترسية",
  cancelled: "ملغي",
};

export default function RFQRequests() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: rfqs, isLoading } = useRFQRequests({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
  });

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">طلبات عروض الأسعار</h1>
          <p className="text-muted-foreground">إدارة طلبات عروض الأسعار من الموردين</p>
        </div>
        <Button onClick={() => navigate("/rfq/new")}>
          <Plus className="ml-2 h-4 w-4" />
          طلب عرض سعر جديد
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة طلبات عروض الأسعار</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الطلب..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="sent">مرسل</SelectItem>
                <SelectItem value="received">تم الاستلام</SelectItem>
                <SelectItem value="evaluated">تم التقييم</SelectItem>
                <SelectItem value="awarded">تم الترسية</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : !rfqs?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد طلبات عروض أسعار</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الطلب</TableHead>
                  <TableHead className="text-right">طلب الشراء</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-right">آخر موعد للتقديم</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfqs.map((rfq) => (
                  <TableRow key={rfq.id}>
                    <TableCell className="font-medium">{rfq.rfq_number}</TableCell>
                    <TableCell>{rfq.purchase_requisitions?.pr_number || "-"}</TableCell>
                    <TableCell>
                      {rfq.created_at
                        ? format(new Date(rfq.created_at), "dd MMM yyyy", { locale: ar })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {rfq.submission_deadline
                        ? format(new Date(rfq.submission_deadline), "dd MMM yyyy", { locale: ar })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[rfq.status] || "bg-gray-500"}>
                        {statusLabels[rfq.status] || rfq.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/rfq/${rfq.id}`)}
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
