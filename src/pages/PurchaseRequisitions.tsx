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
import { Plus, Search, Eye, FileEdit, Loader2, FileText, Send } from "lucide-react";
import { usePurchaseRequisitions, useSubmitPR } from "@/hooks/usePurchaseRequisitions";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  converted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  pending_approval: "قيد الموافقة",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
  converted: "تم التحويل",
};

export default function PurchaseRequisitions() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: requisitions, isLoading } = usePurchaseRequisitions({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
  });

  const submitPR = useSubmitPR();

  const handleSubmitForApproval = async (id: string) => {
    try {
      await submitPR.mutateAsync(id);
    } catch (error) {
      console.error("Error submitting PR:", error);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">طلبات الشراء</h1>
          <p className="text-muted-foreground">إدارة طلبات الشراء الداخلية</p>
        </div>
        <Button onClick={() => navigate("/purchases/requisitions/new")}>
          <Plus className="h-4 w-4 ml-2" />
          طلب شراء جديد
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            قائمة طلبات الشراء
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث برقم الطلب أو الوصف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="pending_approval">قيد الموافقة</SelectItem>
                <SelectItem value="approved">تمت الموافقة</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                <SelectItem value="converted">تم التحويل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !requisitions?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد طلبات شراء
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الطلب</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المستودع</TableHead>
                    <TableHead>الأولوية</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجمالي (BC)</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisitions.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell className="font-medium">{pr.pr_number}</TableCell>
                      <TableCell>
                        {format(new Date(pr.created_at), "dd MMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>{pr.warehouses?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={pr.priority === "urgent" ? "destructive" : "secondary"}>
                          {pr.priority === "urgent" ? "عاجل" : pr.priority === "high" ? "عالي" : "عادي"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[pr.status] || "bg-muted"}>
                          {statusLabels[pr.status] || pr.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pr.total_bc?.toLocaleString("ar-YE")} ر.ي
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/purchases/requisitions/${pr.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {pr.status === "draft" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/purchases/requisitions/${pr.id}/edit`)}
                              >
                                <FileEdit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSubmitForApproval(pr.id)}
                                disabled={submitPR.isPending}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
