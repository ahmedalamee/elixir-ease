import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye, Package, Truck, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد الانتظار", variant: "secondary" },
  confirmed: { label: "مؤكد", variant: "default" },
  processing: { label: "قيد التجهيز", variant: "default" },
  shipped: { label: "تم الشحن", variant: "default" },
  delivered: { label: "تم التسليم", variant: "default" },
  cancelled: { label: "ملغي", variant: "destructive" },
  returned: { label: "مرتجع", variant: "destructive" },
};

const paymentStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "غير مدفوع", variant: "destructive" },
  paid: { label: "مدفوع", variant: "default" },
  partially_paid: { label: "مدفوع جزئياً", variant: "secondary" },
  refunded: { label: "مسترد", variant: "outline" },
};

export default function EcommerceOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["ecommerce-orders", search, statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("ecommerce_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (typeFilter !== "all") {
        query = query.eq("order_type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: orderItems } = useQuery({
    queryKey: ["ecommerce-order-items", selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder?.id) return [];
      const { data, error } = await supabase
        .from("ecommerce_order_items")
        .select("*")
        .eq("order_id", selectedOrder.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOrder?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const updates: any = { status };
      if (status === "shipped") updates.shipped_at = new Date().toISOString();
      if (status === "delivered") updates.delivered_at = new Date().toISOString();
      if (status === "confirmed" || status === "processing") {
        updates.processed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("ecommerce_orders")
        .update(updates)
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-orders"] });
      toast.success("تم تحديث حالة الطلب");
    },
    onError: () => {
      toast.error("فشل تحديث حالة الطلب");
    },
  });

  const formatCurrency = (amount: number, currency: string = "YER") => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">طلبات المتجر الإلكتروني</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الطلب أو اسم العميل..."
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
                <SelectItem value="confirmed">مؤكد</SelectItem>
                <SelectItem value="processing">قيد التجهيز</SelectItem>
                <SelectItem value="shipped">تم الشحن</SelectItem>
                <SelectItem value="delivered">تم التسليم</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="نوع الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="retail">تجزئة</SelectItem>
                <SelectItem value="wholesale">جملة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>حالة الطلب</TableHead>
                <TableHead>حالة الدفع</TableHead>
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
              ) : orders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    لا توجد طلبات
                  </TableCell>
                </TableRow>
              ) : (
                orders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.order_type === "wholesale" ? "default" : "secondary"}>
                        {order.order_type === "wholesale" ? "جملة" : "تجزئة"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(order.total_amount_bc, order.currency_code)}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[order.status]?.variant || "secondary"}>
                        {statusMap[order.status]?.label || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={paymentStatusMap[order.payment_status]?.variant || "secondary"}>
                        {paymentStatusMap[order.payment_status]?.label || order.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.created_at), "dd MMM yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {order.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "confirmed" })}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "cancelled" })}
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        {order.status === "confirmed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "processing" })}
                          >
                            <Package className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                        {order.status === "processing" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "shipped" })}
                          >
                            <Truck className="h-4 w-4 text-orange-600" />
                          </Button>
                        )}
                        {order.status === "shipped" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "delivered" })}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
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

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">العميل</label>
                  <p className="font-medium">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">الهاتف</label>
                  <p className="font-medium">{selectedOrder.customer_phone}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">البريد</label>
                  <p className="font-medium">{selectedOrder.customer_email || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">العنوان</label>
                  <p className="font-medium">{selectedOrder.shipping_address || "-"}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">المنتجات</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>السعر</TableHead>
                      <TableHead>الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unit_price_bc)}</TableCell>
                        <TableCell>{formatCurrency(item.line_total_bc)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between border-t pt-4">
                <div>
                  <p>المجموع الفرعي: {formatCurrency(selectedOrder.subtotal_bc)}</p>
                  <p>الخصم: {formatCurrency(selectedOrder.discount_amount_bc)}</p>
                  <p>الضريبة: {formatCurrency(selectedOrder.tax_amount_bc)}</p>
                  <p>الشحن: {formatCurrency(selectedOrder.shipping_amount_bc)}</p>
                </div>
                <div className="text-left">
                  <p className="text-xl font-bold">
                    الإجمالي: {formatCurrency(selectedOrder.total_amount_bc)}
                  </p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <label className="text-sm text-muted-foreground">ملاحظات العميل</label>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
