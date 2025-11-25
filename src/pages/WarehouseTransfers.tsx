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
import { Package, Plus, CheckCircle, XCircle, Clock, Truck } from "lucide-react";

const WarehouseTransfers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    from_warehouse_id: "",
    to_warehouse_id: "",
    item_id: "",
    qty: "",
    notes: "",
  });

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
      await Promise.all([fetchTransfers(), fetchWarehouses(), fetchProducts()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("warehouse_transfers")
        .select(`
          *,
          from_warehouse:warehouses!from_warehouse_id(name),
          to_warehouse:warehouses!to_warehouse_id(name),
          item:products(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error("Error fetching transfers:", error);
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
      !formData.from_warehouse_id ||
      !formData.to_warehouse_id ||
      !formData.item_id ||
      !formData.qty
    ) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (formData.from_warehouse_id === formData.to_warehouse_id) {
      toast({
        title: "خطأ",
        description: "لا يمكن التحويل إلى نفس المستودع",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const transferNumber = `TRF-${Date.now()}`;

      const { error } = await (supabase as any).from("warehouse_transfers").insert({
        transfer_number: transferNumber,
        from_warehouse_id: formData.from_warehouse_id,
        to_warehouse_id: formData.to_warehouse_id,
        item_id: formData.item_id,
        qty: parseFloat(formData.qty),
        status: "pending",
        notes: formData.notes,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "تمت العملية بنجاح",
        description: `تم إنشاء التحويل رقم: ${transferNumber}`,
      });

      setDialogOpen(false);
      setFormData({
        from_warehouse_id: "",
        to_warehouse_id: "",
        item_id: "",
        qty: "",
        notes: "",
      });
      fetchTransfers();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (transferId: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updateData: any = { status: newStatus };

      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user?.id;
      }

      const { error } = await (supabase as any)
        .from("warehouse_transfers")
        .update(updateData)
        .eq("id", transferId);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة التحويل بنجاح",
      });

      fetchTransfers();
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
            <Clock className="w-3 h-3" />
            معلق
          </Badge>
        );
      case "in_transit":
        return (
          <Badge className="bg-blue-500 gap-1">
            <Truck className="w-3 h-3" />
            قيد النقل
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle className="w-3 h-3" />
            مكتمل
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            ملغي
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
                <Package className="w-6 h-6" />
                تحويلات المستودعات
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                إدارة تحويلات المنتجات بين المستودعات
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              تحويل جديد
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم التحويل</TableHead>
                  <TableHead className="text-right">من مستودع</TableHead>
                  <TableHead className="text-right">إلى مستودع</TableHead>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length > 0 ? (
                  transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">
                        {transfer.transfer_number}
                      </TableCell>
                      <TableCell>{transfer.from_warehouse?.name}</TableCell>
                      <TableCell>{transfer.to_warehouse?.name}</TableCell>
                      <TableCell>{transfer.item?.name}</TableCell>
                      <TableCell>{transfer.qty}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        {new Date(transfer.created_at).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {transfer.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleStatusChange(transfer.id, "in_transit")
                                }
                              >
                                بدء النقل
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  handleStatusChange(transfer.id, "cancelled")
                                }
                              >
                                إلغاء
                              </Button>
                            </>
                          )}
                          {transfer.status === "in_transit" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleStatusChange(transfer.id, "completed")
                              }
                            >
                              إتمام
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      لا توجد تحويلات حالياً
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* New Transfer Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إنشاء تحويل جديد</DialogTitle>
              <DialogDescription>
                قم بإدخال تفاصيل التحويل بين المستودعات
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="from_warehouse">من مستودع *</Label>
                <Select
                  value={formData.from_warehouse_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, from_warehouse_id: value })
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
                <Label htmlFor="to_warehouse">إلى مستودع *</Label>
                <Select
                  value={formData.to_warehouse_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, to_warehouse_id: value })
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
              <Button onClick={handleSubmit}>إنشاء التحويل</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default WarehouseTransfers;
