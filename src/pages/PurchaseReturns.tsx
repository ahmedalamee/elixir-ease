import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, FileText, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PurchaseReturns = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: returns, isLoading } = useQuery({
    queryKey: ["purchase-returns", searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("purchase_returns")
        .select(`
          *,
          suppliers (name),
          purchase_invoices (pi_number)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`return_number.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const postReturnMutation = useMutation({
    mutationFn: async (returnId: string) => {
      const { data, error } = await supabase.rpc("post_purchase_return", {
        p_return_id: returnId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("تم ترحيل المرتجع بنجاح");
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
    },
    onError: (error: any) => {
      toast.error(`فشل ترحيل المرتجع: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: "secondary", label: "مسودة" },
      posted: { variant: "default", label: "مرحل" },
      cancelled: { variant: "destructive", label: "ملغي" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8">جارٍ التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              مرتجعات المشتريات
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  إنشاء مرتجع جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>إنشاء مرتجع مشتريات</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>فاتورة الشراء</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الفاتورة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">PI-000001</SelectItem>
                          <SelectItem value="2">PI-000002</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>نوع المرتجع</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">كامل</SelectItem>
                          <SelectItem value="partial">جزئي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>السبب</Label>
                    <Textarea placeholder="اكتب سبب المرتجع..." />
                  </div>
                  <Button className="w-full">حفظ المرتجع</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم المرتجع..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="posted">مرحل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم المرتجع</TableHead>
                  <TableHead>فاتورة الشراء</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ المسترد</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns?.map((returnItem: any) => (
                  <TableRow key={returnItem.id}>
                    <TableCell className="font-medium">{returnItem.return_number}</TableCell>
                    <TableCell>{returnItem.purchase_invoices?.pi_number}</TableCell>
                    <TableCell>{returnItem.suppliers?.name}</TableCell>
                    <TableCell>{new Date(returnItem.return_date).toLocaleDateString("ar-SA")}</TableCell>
                    <TableCell>{returnItem.refund_amount?.toFixed(2)} ر.س</TableCell>
                    <TableCell>{getStatusBadge(returnItem.status)}</TableCell>
                    <TableCell>
                      {returnItem.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => postReturnMutation.mutate(returnItem.id)}
                          disabled={postReturnMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          ترحيل
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {returns?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد مرتجعات مشتريات
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PurchaseReturns;
