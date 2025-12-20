import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  useApprovalRequest,
  useApprovalHistory,
  useApproveStep,
  useRejectApproval,
} from "@/hooks/useApprovals";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";

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

export default function ApprovalView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: request, isLoading } = useApprovalRequest(id);
  const { data: history } = useApprovalHistory(id);
  const approveStep = useApproveStep();
  const rejectApproval = useRejectApproval();

  const [approveComments, setApproveComments] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 text-center" dir="rtl">
        جاري التحميل...
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto p-6 text-center" dir="rtl">
        طلب الموافقة غير موجود
      </div>
    );
  }

  const handleApprove = async () => {
    try {
      await approveStep.mutateAsync({
        requestId: request.id,
        comments: approveComments,
      });
      setApproveComments("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("يرجى إدخال سبب الرفض");
      return;
    }

    try {
      await rejectApproval.mutateAsync({
        requestId: request.id,
        reason: rejectReason,
      });
      setIsRejectDialogOpen(false);
      setRejectReason("");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/approvals")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {request.document_number || "طلب موافقة"}
            </h1>
            <p className="text-muted-foreground">
              {docTypeLabels[request.document_type] || request.document_type}
            </p>
          </div>
        </div>
        <Badge className={statusColors[request.status] || "bg-gray-500"}>
          {statusLabels[request.status] || request.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">رقم المستند</p>
                  <p className="font-medium">{request.document_number || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">نوع المستند</p>
                  <p className="font-medium">
                    {docTypeLabels[request.document_type] || request.document_type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ الطلب</p>
                  <p className="font-medium">
                    {request.requested_at
                      ? format(new Date(request.requested_at), "dd MMM yyyy HH:mm", {
                          locale: ar,
                        })
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الخطوة الحالية</p>
                  <p className="font-medium">
                    {request.current_step} من {request.total_steps}
                  </p>
                </div>
              </div>
              {request.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">ملاحظات</p>
                  <p>{request.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>سجل الموافقات</CardTitle>
            </CardHeader>
            <CardContent>
              {!history?.length ? (
                <p className="text-muted-foreground text-center py-4">
                  لا يوجد سجل موافقات بعد
                </p>
              ) : (
                <div className="space-y-4">
                  {history.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div
                        className={`p-2 rounded-full ${
                          item.action === "approved"
                            ? "bg-green-100 text-green-600"
                            : item.action === "rejected"
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.action === "approved" ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : item.action === "rejected" ? (
                          <XCircle className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            الخطوة {item.step_order}: {item.action === "approved" ? "موافقة" : "رفض"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.action_at
                              ? format(new Date(item.action_at), "dd MMM yyyy HH:mm", {
                                  locale: ar,
                                })
                              : "-"}
                          </p>
                        </div>
                        {item.comments && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.comments}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {request.status === "pending" && (
            <Card>
              <CardHeader>
                <CardTitle>إجراء الموافقة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ملاحظات (اختياري)</Label>
                  <Textarea
                    value={approveComments}
                    onChange={(e) => setApproveComments(e.target.value)}
                    placeholder="أضف ملاحظاتك هنا..."
                    rows={3}
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={approveStep.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="ml-2 h-4 w-4" />
                    موافقة
                  </Button>

                  <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">
                        <XCircle className="ml-2 h-4 w-4" />
                        رفض
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl">
                      <DialogHeader>
                        <DialogTitle>رفض الطلب</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>سبب الرفض *</Label>
                          <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="يرجى إدخال سبب الرفض..."
                            rows={4}
                          />
                        </div>
                        <Button
                          variant="destructive"
                          onClick={handleReject}
                          disabled={rejectApproval.isPending}
                          className="w-full"
                        >
                          تأكيد الرفض
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>معلومات إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">حالة الطلب</p>
                <Badge className={statusColors[request.status] || "bg-gray-500"}>
                  {statusLabels[request.status] || request.status}
                </Badge>
              </div>
              {request.completed_at && (
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ الإكمال</p>
                  <p className="font-medium">
                    {format(new Date(request.completed_at), "dd MMM yyyy HH:mm", {
                      locale: ar,
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
