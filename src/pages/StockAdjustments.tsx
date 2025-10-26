import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Plus, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const StockAdjustments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    warehouse_id: "",
    item_id: "",
    adjustment_type: "",
    qty: "",
    reason: "",
    notes: "",
  });

  const adjustmentTypes = [
    { value: "increase", label: "زيادة" },
    { value: "decrease", label: "نقص" },
  ];

  const reasonOptions = [
    { value: "damaged", label: "هالك" },
    { value: "expired", label: "منتهي الصلاحية" },
    { value: "inventory_count", label: "فرق جرد" },
    { value: "donation", label: "منحة" },
    { value: "theft", label: "سرقة" },
    { value: "return", label: "مرتجع" },
    { value: "other", label: "أخرى" },
  ];

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAdjustments(), fetchWarehouses(), fetchProducts()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdjustments = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("stock_adjustments")
        .select(`
          *,
          warehouse:warehouses(name),
          item:products(name, quantity)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAdjustments(data || []);
    } catch (error) {
      console.error("Error fetching adjustments:", error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, quantity")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.warehouse_id ||
      !formData.item_id ||
      !formData.adjustment_type ||
      !formData.qty ||
      !formData.reason
    ) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adjustmentNumber = `ADJ-${Date.now()}`;
      const qty = parseFloat(formData.qty);

      // Check if needs approval (large adjustments)
      const needsApproval = Math.abs(qty) > 100; // Example threshold

      const { error } = await (supabase as any).from("stock_adjustments").insert({
        adjustment_number: adjustmentNumber,
        warehouse_id: formData.warehouse_id,
        item_id: formData.item_id,
        adjustment_type: formData.adjustment_type,
        qty: formData.adjustment_type === "decrease" ? -qty : qty,
        reason: formData.reason,
        notes: formData.notes,
        status: needsApproval ? "pending" : "approved",
        created_by: user?.id,
      });

      if (error) throw error;

      // If auto-approved, update inventory
      if (!needsApproval) {
        const product = products.find((p) => p.id === formData.item_id);
        if (product) {
          const newQty =
            formData.adjustment_type === "increase"
              ? product.quantity + qty
              : product.quantity - qty;

          await supabase
            .from("products")
            .update({ quantity: newQty })
            .eq("id", formData.item_id);
        }
      }

      toast({
        title: "تمت العملية بنجاح",
        description: needsApproval
          ? "تم إنشاء التعديل وهو بانتظار الموافقة"
          : `تم إنشاء التعديل رقم: ${adjustmentNumber}`,
      });

      setDialogOpen(false);
      setFormData({
        warehouse_id: "",
        item_id: "",
        adjustment_type: "",
        qty: "",
        reason: "",
        notes: "",
      });
      fetchAdjustments();
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleApproval = async (adjustmentId: string, approved: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adjustment = adjustments.find((a) => a.id === adjustmentId);

      if (!adjustment) return;

      if (approved) {
        // Update inventory
        const product = products.find((p) => p.id === adjustment.item_id);
        if (product) {
          const newQty = product.quantity + adjustment.qty;

          await supabase
            .from("products")
            .update({ quantity: newQty })
            .eq("id", adjustment.item_id);
        }

        await (supabase as any)
          .from("stock_adjustments")
          .update({
            status: "approved",
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
          })
          .eq("id", adjustmentId);
      } else {
        await (supabase as any)
          .from("stock_adjustments")
          .update({ status: "rejected" })
          .eq("id", adjustmentId);
      }

      toast({
        title: "تم التحديث",
        description: approved ? "تمت الموافقة على التعديل" : "تم رفض التعديل",
      });

      fetchAdjustments();
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            بانتظار الموافقة
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle className="w-3 h-3" />
            معتمد
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            مرفوض
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReasonLabel = (reason: string) => {
    return reasonOptions.find((r) => r.value === reason)?.label || reason;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">جارٍ التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Edit className="w-6 h-6" />
                تعديلات المخزون
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                إدارة تعديلات كميات المخزون والموافقات
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              تعديل جديد
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم التعديل</TableHead>
                  <TableHead className="text-right">المستودع</TableHead>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">السبب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.length > 0 ? (
                  adjustments.map((adjustment) => (
                    <TableRow key={adjustment.id}>
                      <TableCell className="font-medium">
                        {adjustment.adjustment_number}
                      </TableCell>
                      <TableCell>{adjustment.warehouse?.name}</TableCell>
                      <TableCell>{adjustment.item?.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            adjustment.adjustment_type === "increase"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {adjustment.adjustment_type === "increase"
                            ? "زيادة"
                            : "نقص"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={
                          adjustment.qty > 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {adjustment.qty > 0 ? "+" : ""}
                        {adjustment.qty}
                      </TableCell>
                      <TableCell>{getReasonLabel(adjustment.reason)}</TableCell>
                      <TableCell>{getStatusBadge(adjustment.status)}</TableCell>
                      <TableCell>
                        {new Date(adjustment.created_at).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>
                        {adjustment.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproval(adjustment.id, true)}
                            >
                              موافقة
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApproval(adjustment.id, false)}
                            >
                              رفض
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      لا توجد تعديلات حالياً
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* New Adjustment Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إنشاء تعديل جديد</DialogTitle>
              <DialogDescription>
                قم بإدخال تفاصيل تعديل المخزون
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse">المستودع *</Label>
                <Select
                  value={formData.warehouse_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, warehouse_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المستودع" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item">المنتج *</Label>
                <Select
                  value={formData.item_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, item_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المنتج" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (متوفر: {product.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjustment_type">نوع التعديل *</Label>
                <Select
                  value={formData.adjustment_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, adjustment_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    {adjustmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qty">الكمية *</Label>
                <Input
                  id="qty"
                  type="number"
                  step="0.01"
                  value={formData.qty}
                  onChange={(e) =>
                    setFormData({ ...formData, qty: e.target.value })
                  }
                  placeholder="0.00"
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">السبب *</Label>
                <Select
                  value={formData.reason}
                  onValueChange={(value) =>
                    setFormData({ ...formData, reason: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر السبب" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonOptions.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="ملاحظات اختيارية..."
                  className="text-right"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSubmit}>إنشاء التعديل</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StockAdjustments;
