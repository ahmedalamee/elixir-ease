import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Loader2,
  FileEdit,
  Send,
  FileCheck,
  RefreshCw,
} from "lucide-react";
import {
  usePurchaseRequisition,
  usePRItems,
  useSubmitPR,
  useConvertPRToRFQ,
  useConvertPRToPO,
} from "@/hooks/usePurchaseRequisitions";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useEffect } from "react";

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

const priorityLabels: Record<string, string> = {
  normal: "عادي",
  high: "عالي",
  urgent: "عاجل",
};

export default function PurchaseRequisitionView() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const { data: pr, isLoading } = usePurchaseRequisition(id);
  const { data: items } = usePRItems(id);
  const submitPR = useSubmitPR();
  const convertToRFQ = useConvertPRToRFQ();
  const convertToPO = useConvertPRToPO();

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("is_active", true);
      setSuppliers(data || []);
    };
    fetchSuppliers();
  }, []);

  const handleSubmit = async () => {
    if (id) {
      await submitPR.mutateAsync(id);
    }
  };

  const handleConvertToRFQ = async () => {
    if (id) {
      await convertToRFQ.mutateAsync(id);
      navigate("/purchases/rfq");
    }
  };

  const handleConvertToPO = async () => {
    if (id && selectedSupplierId) {
      await convertToPO.mutateAsync({ prId: id, supplierId: selectedSupplierId });
      setShowSupplierDialog(false);
      navigate("/purchase-orders");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            طلب الشراء غير موجود
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/purchases/requisitions")}>
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>
          <div>
            <h1 className="text-3xl font-bold">طلب الشراء {pr.pr_number}</h1>
            <p className="text-muted-foreground">
              تاريخ الإنشاء: {format(new Date(pr.created_at), "dd MMM yyyy", { locale: ar })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pr.status === "draft" && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/purchases/requisitions/${id}/edit`)}
              >
                <FileEdit className="h-4 w-4 ml-2" />
                تعديل
              </Button>
              <Button onClick={handleSubmit} disabled={submitPR.isPending}>
                {submitPR.isPending ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 ml-2" />
                )}
                إرسال للموافقة
              </Button>
            </>
          )}
          {pr.status === "approved" && (
            <>
              <Button variant="outline" onClick={handleConvertToRFQ} disabled={convertToRFQ.isPending}>
                {convertToRFQ.isPending ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 ml-2" />
                )}
                تحويل إلى طلب عروض أسعار
              </Button>
              <Button onClick={() => setShowSupplierDialog(true)}>
                <FileCheck className="h-4 w-4 ml-2" />
                تحويل إلى أمر شراء
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الطلب</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">رقم الطلب</p>
                <p className="font-medium">{pr.pr_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">التاريخ</p>
                <p className="font-medium">
                  {format(new Date(pr.created_at), "dd MMM yyyy", { locale: ar })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المستودع</p>
                <p className="font-medium">{pr.warehouses?.name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الأولوية</p>
                <Badge variant={pr.priority === "urgent" ? "destructive" : "secondary"}>
                  {priorityLabels[pr.priority] || pr.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الحالة</p>
                <Badge className={statusColors[pr.status]}>
                  {statusLabels[pr.status] || pr.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">العملة</p>
                <p className="font-medium">{pr.currency_code}</p>
              </div>
              {pr.notes && (
                <div className="col-span-full">
                  <p className="text-sm text-muted-foreground">ملاحظات</p>
                  <p className="font-medium">{pr.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>المنتجات المطلوبة</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>سعر الوحدة التقديري</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.products?.name || "-"}
                      </TableCell>
                      <TableCell>{item.requested_qty}</TableCell>
                      <TableCell>{item.estimated_unit_cost_fc?.toLocaleString("ar-YE")} ر.ي</TableCell>
                      <TableCell>
                        {item.line_total_fc?.toLocaleString("ar-YE")} ر.ي
                      </TableCell>
                      <TableCell>{item.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              <div className="flex justify-end gap-8">
                <div>
                  <p className="text-sm text-muted-foreground">الإجمالي (FC)</p>
                  <p className="text-lg font-bold">{pr.total_fc?.toLocaleString("ar-YE")} {pr.currency_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الإجمالي (BC)</p>
                  <p className="text-xl font-bold">{pr.total_bc?.toLocaleString("ar-YE")} ر.ي</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ملخص</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span>{pr.subtotal_bc?.toLocaleString("ar-YE")} ر.ي</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الخصم</span>
                <span>{pr.discount_bc?.toLocaleString("ar-YE")} ر.ي</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الضريبة</span>
                <span>{pr.tax_bc?.toLocaleString("ar-YE")} ر.ي</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>الإجمالي</span>
                <span>{pr.total_bc?.toLocaleString("ar-YE")} ر.ي</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>اختر المورد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>المورد</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المورد" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleConvertToPO} disabled={!selectedSupplierId || convertToPO.isPending}>
              {convertToPO.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              تحويل إلى أمر شراء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
