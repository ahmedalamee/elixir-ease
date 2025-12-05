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
import { Edit, Plus, CheckCircle, XCircle, FileText, Trash2 } from "lucide-react";
import { generateAdjustmentNumber, postInventoryAdjustment, getCurrentStockQuantity } from "@/lib/inventory";

interface AdjustmentItem {
  product_id: string;
  product_name: string;
  quantity_before: number;
  quantity_after: number;
  quantity_diff: number;
  unit_cost: number;
  batch_number: string;
  expiry_date: string;
}

const StockAdjustments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  
  // Form state
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  
  // Item form state
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantityAfter, setQuantityAfter] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState(0);

  const reasonOptions = [
    { value: "stock_count", label: "فرق جرد" },
    { value: "damaged", label: "هالك" },
    { value: "expired", label: "منتهي الصلاحية" },
    { value: "found", label: "مخزون مكتشف" },
    { value: "opening_balance", label: "رصيد افتتاحي" },
    { value: "theft", label: "سرقة" },
    { value: "donation", label: "منحة" },
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
      const { data, error } = await supabase
        .from("stock_adjustments")
        .select(`
          *,
          warehouse:warehouses(name)
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
        .select("id, name, cost_price")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  // Fetch current quantity when product or warehouse changes
  useEffect(() => {
    const fetchCurrentQty = async () => {
      if (selectedProduct && selectedWarehouse) {
        const qty = await getCurrentStockQuantity(selectedProduct, selectedWarehouse);
        setCurrentQuantity(qty);
        
        // Set default unit cost from product
        const product = products.find(p => p.id === selectedProduct);
        if (product && !unitCost) {
          setUnitCost(product.cost_price?.toString() || "0");
        }
      }
    };
    fetchCurrentQty();
  }, [selectedProduct, selectedWarehouse]);

  const handleAddItem = () => {
    if (!selectedProduct || quantityAfter === "") {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار المنتج وإدخال الكمية الجديدة",
        variant: "destructive",
      });
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    const qtyAfter = parseFloat(quantityAfter);
    const qtyDiff = qtyAfter - currentQuantity;

    // For increases, unit cost is required
    if (qtyDiff > 0 && (!unitCost || parseFloat(unitCost) <= 0)) {
      toast({
        title: "خطأ",
        description: "يجب إدخال تكلفة الوحدة للزيادات",
        variant: "destructive",
      });
      return;
    }

    const newItem: AdjustmentItem = {
      product_id: selectedProduct,
      product_name: product?.name || "",
      quantity_before: currentQuantity,
      quantity_after: qtyAfter,
      quantity_diff: qtyDiff,
      unit_cost: qtyDiff > 0 ? parseFloat(unitCost) : 0,
      batch_number: batchNumber,
      expiry_date: expiryDate,
    };

    setItems([...items, newItem]);
    
    // Reset item form
    setSelectedProduct("");
    setQuantityAfter("");
    setUnitCost("");
    setBatchNumber("");
    setExpiryDate("");
    setCurrentQuantity(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedWarehouse || !reason || items.length === 0) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة وإضافة منتج واحد على الأقل",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adjustmentNumber = await generateAdjustmentNumber();
      
      const totalDiffQty = items.reduce((sum, item) => sum + item.quantity_diff, 0);

      // Create adjustment header
      const { data: adjustment, error: headerError } = await supabase
        .from("stock_adjustments")
        .insert({
          adjustment_number: adjustmentNumber,
          warehouse_id: selectedWarehouse,
          adjustment_date: adjustmentDate,
          reason: reason,
          notes: notes,
          status: "draft",
          total_difference_qty: totalDiffQty,
          created_by: user?.id,
        })
        .select()
        .single();

      if (headerError) throw headerError;

      // Create adjustment items
      const itemsToInsert = items.map(item => ({
        adjustment_id: adjustment.id,
        product_id: item.product_id,
        batch_number: item.batch_number || null,
        quantity_before: item.quantity_before,
        quantity_after: item.quantity_after,
        quantity_diff: item.quantity_diff,
        unit_cost: item.unit_cost,
        expiry_date: item.expiry_date || null,
      }));

      const { error: itemsError } = await supabase
        .from("stock_adjustment_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: "تمت العملية بنجاح",
        description: `تم إنشاء التسوية رقم: ${adjustmentNumber}`,
      });

      resetForm();
      setDialogOpen(false);
      fetchAdjustments();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePost = async (adjustmentId: string) => {
    setPosting(true);
    try {
      const result = await postInventoryAdjustment(adjustmentId);
      
      toast({
        title: "تم الترحيل بنجاح",
        description: `تم ترحيل التسوية ${result.adjustment_number}. القيد المحاسبي: ${result.journal_entry_number || 'لا يوجد'}`,
      });

      fetchAdjustments();
    } catch (error: any) {
      toast({
        title: "خطأ في الترحيل",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  const resetForm = () => {
    setSelectedWarehouse("");
    setAdjustmentDate(new Date().toISOString().split('T')[0]);
    setReason("");
    setNotes("");
    setItems([]);
    setSelectedProduct("");
    setQuantityAfter("");
    setUnitCost("");
    setBatchNumber("");
    setExpiryDate("");
    setCurrentQuantity(0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">مسودة</Badge>;
      case "posted":
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="w-3 h-3" />مرحّل</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />ملغي</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReasonLabel = (reasonValue: string) => {
    return reasonOptions.find((r) => r.value === reasonValue)?.label || reasonValue;
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
                تسويات المخزون
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                إدارة تسويات كميات المخزون مع تكامل FIFO والقيود المحاسبية
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              تسوية جديدة
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم التسوية</TableHead>
                  <TableHead className="text-right">المستودع</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">السبب</TableHead>
                  <TableHead className="text-right">فرق الكمية</TableHead>
                  <TableHead className="text-right">فرق القيمة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
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
                      <TableCell>
                        {new Date(adjustment.adjustment_date).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>{getReasonLabel(adjustment.reason)}</TableCell>
                      <TableCell className={adjustment.total_difference_qty > 0 ? "text-green-600" : adjustment.total_difference_qty < 0 ? "text-red-600" : ""}>
                        {adjustment.total_difference_qty > 0 ? "+" : ""}
                        {adjustment.total_difference_qty?.toFixed(2)}
                      </TableCell>
                      <TableCell className={adjustment.total_difference_value > 0 ? "text-green-600" : adjustment.total_difference_value < 0 ? "text-red-600" : ""}>
                        {adjustment.total_difference_value > 0 ? "+" : ""}
                        {adjustment.total_difference_value?.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(adjustment.status)}</TableCell>
                      <TableCell>
                        {adjustment.status === "draft" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handlePost(adjustment.id)}
                              disabled={posting}
                            >
                              <FileText className="w-4 h-4 ml-1" />
                              ترحيل
                            </Button>
                          </div>
                        )}
                        {adjustment.journal_entry_id && (
                          <Badge variant="outline" className="text-xs">
                            قيد: {adjustment.journal_entry_id.slice(0, 8)}...
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      لا توجد تسويات حالياً
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* New Adjustment Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء تسوية مخزون جديدة</DialogTitle>
              <DialogDescription>
                قم بإدخال تفاصيل تسوية المخزون - ستتكامل التسوية مع FIFO والقيود المحاسبية عند الترحيل
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Header Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المستودع *</Label>
                  <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المستودع" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>تاريخ التسوية *</Label>
                  <Input
                    type="date"
                    value={adjustmentDate}
                    onChange={(e) => setAdjustmentDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>السبب *</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر السبب" />
                    </SelectTrigger>
                    <SelectContent>
                      {reasonOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات إضافية..."
                  />
                </div>
              </div>

              {/* Add Item Section */}
              <Card className="p-4">
                <h4 className="font-semibold mb-4">إضافة منتج للتسوية</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>المنتج *</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>الكمية الحالية</Label>
                    <Input value={currentQuantity.toString()} disabled className="bg-muted" />
                  </div>

                  <div className="space-y-2">
                    <Label>الكمية الجديدة *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={quantityAfter}
                      onChange={(e) => setQuantityAfter(e.target.value)}
                      placeholder="الكمية بعد التسوية"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>تكلفة الوحدة (للزيادات)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>رقم الدفعة</Label>
                    <Input
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="اختياري"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>تاريخ الانتهاء</Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleAddItem} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  إضافة للقائمة
                </Button>
              </Card>

              {/* Items List */}
              {items.length > 0 && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-4">بنود التسوية ({items.length})</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المنتج</TableHead>
                        <TableHead className="text-right">قبل</TableHead>
                        <TableHead className="text-right">بعد</TableHead>
                        <TableHead className="text-right">الفرق</TableHead>
                        <TableHead className="text-right">التكلفة</TableHead>
                        <TableHead className="text-right">حذف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.quantity_before.toFixed(2)}</TableCell>
                          <TableCell>{item.quantity_after.toFixed(2)}</TableCell>
                          <TableCell className={item.quantity_diff > 0 ? "text-green-600" : item.quantity_diff < 0 ? "text-red-600" : ""}>
                            {item.quantity_diff > 0 ? "+" : ""}{item.quantity_diff.toFixed(2)}
                          </TableCell>
                          <TableCell>{item.unit_cost.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>
                إلغاء
              </Button>
              <Button onClick={handleSubmit} disabled={items.length === 0}>
                حفظ كمسودة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StockAdjustments;