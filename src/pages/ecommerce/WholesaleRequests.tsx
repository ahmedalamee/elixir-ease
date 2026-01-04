import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { TreeSidebar } from "@/components/TreeSidebar";
import { menuTree } from "@/data/menu-tree";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Eye, CheckCircle, XCircle, RefreshCw, Building2, FileText, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد الانتظار", variant: "secondary" },
  under_review: { label: "قيد المراجعة", variant: "default" },
  approved: { label: "موافق عليه", variant: "default" },
  rejected: { label: "مرفوض", variant: "destructive" },
};

export default function WholesaleRequests() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["wholesale-requests", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("wholesale_account_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`request_number.ilike.%${search}%,company_name.ilike.%${search}%,contact_name.ilike.%${search}%,phone.ilike.%${search}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const request = requests?.find((r) => r.id === requestId);
      if (!request) throw new Error("Request not found");

      // Create customer record
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: request.company_name,
          email: request.email,
          phone: request.phone,
          address: request.address,
          customer_type: "wholesale",
          is_active: true,
          tax_number: request.tax_number,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Update request
      const { error } = await supabase
        .from("wholesale_account_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          customer_id: customer.id,
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wholesale-requests"] });
      toast.success("تم الموافقة على الطلب وإنشاء حساب العميل");
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "فشل الموافقة على الطلب");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { error } = await supabase
        .from("wholesale_account_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wholesale-requests"] });
      toast.success("تم رفض الطلب");
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
    },
    onError: () => {
      toast.error("فشل رفض الطلب");
    },
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="flex">
        <TreeSidebar menuData={menuTree} />
        <main className="flex-1 container mx-auto py-6 px-4 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">طلبات حسابات الجملة</h1>
          </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم الشركة أو رقم الطلب..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="under_review">قيد المراجعة</SelectItem>
                <SelectItem value="approved">موافق عليه</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>اسم الشركة</TableHead>
                <TableHead>المسؤول</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>السجل التجاري</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : requests?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    لا توجد طلبات
                  </TableCell>
                </TableRow>
              ) : (
                requests?.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.request_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {request.company_name}
                      </div>
                    </TableCell>
                    <TableCell>{request.contact_name}</TableCell>
                    <TableCell>{request.phone}</TableCell>
                    <TableCell>
                      {request.commercial_register_number ? (
                        <Badge variant="outline">{request.commercial_register_number}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMap[request.status]?.variant || "secondary"}>
                        {statusMap[request.status]?.label || request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.created_at), "dd MMM yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {request.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => approveMutation.mutate(request.id)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest && !showRejectDialog} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل طلب حساب الجملة {selectedRequest?.request_number}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <label className="text-sm text-muted-foreground">اسم الشركة</label>
                      <p className="font-medium">{selectedRequest.company_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <label className="text-sm text-muted-foreground">المسؤول</label>
                      <p className="font-medium">{selectedRequest.contact_name}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">البريد الإلكتروني</label>
                    <p className="font-medium">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">الهاتف</label>
                    <p className="font-medium">{selectedRequest.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">العنوان</label>
                    <p className="font-medium">{selectedRequest.address || "-"}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">رقم السجل التجاري</label>
                    <p className="font-medium">{selectedRequest.commercial_register_number || "-"}</p>
                  </div>
                  {selectedRequest.commercial_register_image && (
                    <div>
                      <label className="text-sm text-muted-foreground">صورة السجل التجاري</label>
                      <img
                        src={selectedRequest.commercial_register_image}
                        alt="السجل التجاري"
                        className="mt-2 max-h-40 rounded border"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-muted-foreground">رقم الهوية</label>
                    <p className="font-medium">{selectedRequest.national_id_number || "-"}</p>
                  </div>
                  {selectedRequest.national_id_image && (
                    <div>
                      <label className="text-sm text-muted-foreground">صورة الهوية</label>
                      <img
                        src={selectedRequest.national_id_image}
                        alt="الهوية"
                        className="mt-2 max-h-40 rounded border"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-muted-foreground">الرقم الضريبي</label>
                    <p className="font-medium">{selectedRequest.tax_number || "-"}</p>
                  </div>
                </div>
              </div>

              {selectedRequest.notes && (
                <div>
                  <label className="text-sm text-muted-foreground">ملاحظات</label>
                  <p>{selectedRequest.notes}</p>
                </div>
              )}

              {selectedRequest.status === "rejected" && selectedRequest.rejection_reason && (
                <div className="bg-destructive/10 p-4 rounded">
                  <label className="text-sm text-destructive font-medium">سبب الرفض</label>
                  <p>{selectedRequest.rejection_reason}</p>
                </div>
              )}

              {selectedRequest.status === "pending" && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <XCircle className="h-4 w-4 ml-2" />
                    رفض
                  </Button>
                  <Button onClick={() => approveMutation.mutate(selectedRequest.id)}>
                    <CheckCircle className="h-4 w-4 ml-2" />
                    موافقة وإنشاء الحساب
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفض الطلب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">سبب الرفض</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="أدخل سبب رفض الطلب..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                rejectMutation.mutate({
                  requestId: selectedRequest.id,
                  reason: rejectionReason,
                })
              }
              disabled={!rejectionReason.trim()}
            >
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </main>
      </div>
    </div>
  );
}
