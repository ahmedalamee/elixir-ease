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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Edit, 
  Plus, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Trash2, 
  Eye, 
  Package,
  Search,
  ScanLine,
  Download
} from "lucide-react";
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

interface AdjustmentDetail {
  id: string;
  adjustment_id: string;
  product_id: string;
  quantity_before: number;
  quantity_after: number;
  quantity_diff: number;
  unit_cost: number;
  total_cost_diff: number;
  product?: { name: string };
}

const StockAdjustments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<any>(null);
  const [adjustmentDetails, setAdjustmentDetails] = useState<AdjustmentDetail[]>([]);
  const [posting, setPosting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
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

  const fetchAdjustmentDetails = async (adjustmentId: string) => {
    try {
      const { data, error } = await supabase
        .from("stock_adjustment_items")
        .select(`
          *,
          product:products(name)
        `)
        .eq("adjustment_id", adjustmentId)
        .order("created_at");

      if (error) throw error;
      setAdjustmentDetails(data || []);
    } catch (error) {
      console.error("Error fetching adjustment details:", error);
    }
  };

  // Fetch current quantity when product or warehouse changes
  useEffect(() => {
    const fetchCurrentQty = async () => {
      if (selectedProduct && selectedWarehouse) {
        const qty = await getCurrentStockQuantity(selectedProduct, selectedWarehouse);
        setCurrentQuantity(qty);
        
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

  const handleViewDetails = async (adjustment: any) => {
    setSelectedAdjustment(adjustment);
    await fetchAdjustmentDetails(adjustment.id);
    setDetailsDialogOpen(true);
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

  // Filter adjustments
  const filteredAdjustments = adjustments.filter(adj => {
    const matchesSearch = !searchTerm || 
      adj.adjustment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adj.warehouse?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || adj.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Export to CSV
  const handleExport = () => {
    const headers = ['رقم التسوية', 'المستودع', 'التاريخ', 'السبب', 'فرق الكمية', 'فرق القيمة', 'الحالة'];
    const rows = filteredAdjustments.map(adj => [
      adj.adjustment_number,
      adj.warehouse?.name || '',
      adj.adjustment_date,
      getReasonLabel(adj.reason),
      adj.total_difference_qty,
      adj.total_difference_value || 0,
      adj.status
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-adjustments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Edit className="w-7 h-7" />
              سجل تسويات المخزون
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              عرض وإدارة جميع تسويات المخزون مع تكامل FIFO والقيود المحاسبية
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate('/inventory/stock-count')} className="gap-2">
              <ScanLine className="w-4 h-4" />
              جرد جديد
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              تسوية يدوية
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث برقم التسوية أو المستودع..."
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
                  <SelectItem value="posted">مرحّل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport} className="gap-1">
                <Download className="w-4 h-4" />
                تصدير
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Adjustments Table */}
        <Card>
          <CardContent className="p-0">
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
                  <TableHead className="text-right">القيد</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdjustments.length > 0 ? (
                  filteredAdjustments.map((adjustment) => (
                    <TableRow key={adjustment.id}>
                      <TableCell className="font-medium font-mono">
                        {adjustment.adjustment_number}
                      </TableCell>
                      <TableCell>{adjustment.warehouse?.name}</TableCell>
                      <TableCell>
                        {new Date(adjustment.adjustment_date).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>{getReasonLabel(adjustment.reason)}</TableCell>
                      <TableCell className={adjustment.total_difference_qty > 0 ? "text-green-600 font-medium" : adjustment.total_difference_qty < 0 ? "text-red-600 font-medium" : ""}>
                        {adjustment.total_difference_qty > 0 ? "+" : ""}
                        {adjustment.total_difference_qty?.toFixed(2)}
                      </TableCell>
                      <TableCell className={adjustment.total_difference_value > 0 ? "text-green-600 font-medium" : adjustment.total_difference_value < 0 ? "text-red-600 font-medium" : ""}>
                        {adjustment.total_difference_value > 0 ? "+" : ""}
                        {adjustment.total_difference_value?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>{getStatusBadge(adjustment.status)}</TableCell>
                      <TableCell>
                        {adjustment.journal_entry_id ? (
                          <Badge variant="outline" className="text-xs font-mono">
                            {adjustment.journal_entry_id.slice(0, 8)}...
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(adjustment)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {adjustment.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePost(adjustment.id)}
                              disabled={posting}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      لا توجد تسويات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                تفاصيل التسوية: {selectedAdjustment?.adjustment_number}
              </DialogTitle>
              <DialogDescription>
                عرض تفصيلي لبنود التسوية
              </DialogDescription>
            </DialogHeader>

            {selectedAdjustment && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">المستودع</div>
                    <div className="font-medium">{selectedAdjustment.warehouse?.name}</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">التاريخ</div>
                    <div className="font-medium">
                      {new Date(selectedAdjustment.adjustment_date).toLocaleDateString("ar-SA")}
                    </div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">السبب</div>
                    <div className="font-medium">{getReasonLabel(selectedAdjustment.reason)}</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">الحالة</div>
                    <div>{getStatusBadge(selectedAdjustment.status)}</div>
                  </div>
                </div>

                {/* Totals */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg ${selectedAdjustment.total_difference_qty >= 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                    <div className="text-xs text-muted-foreground">إجمالي فرق الكمية</div>
                    <div className={`text-lg font-bold ${selectedAdjustment.total_difference_qty >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedAdjustment.total_difference_qty > 0 ? '+' : ''}{selectedAdjustment.total_difference_qty?.toFixed(2)}
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${(selectedAdjustment.total_difference_value || 0) >= 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                    <div className="text-xs text-muted-foreground">إجمالي فرق القيمة</div>
                    <div className={`text-lg font-bold ${(selectedAdjustment.total_difference_value || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(selectedAdjustment.total_difference_value || 0) > 0 ? '+' : ''}{(selectedAdjustment.total_difference_value || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <ScrollArea className="h-[300px] border rounded-lg">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="text-right">المنتج</TableHead>
                        <TableHead className="text-center">الكمية قبل</TableHead>
                        <TableHead className="text-center">الكمية بعد</TableHead>
                        <TableHead className="text-center">الفرق</TableHead>
                        <TableHead className="text-left">أثر التكلفة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adjustmentDetails.map((item) => (
                        <TableRow key={item.id} className={
                          item.quantity_diff > 0 ? 'bg-green-50/50 dark:bg-green-950/10' :
                          item.quantity_diff < 0 ? 'bg-red-50/50 dark:bg-red-950/10' : ''
                        }>
                          <TableCell className="font-medium">{item.product?.name}</TableCell>
                          <TableCell className="text-center">{item.quantity_before}</TableCell>
                          <TableCell className="text-center">{item.quantity_after}</TableCell>
                          <TableCell className={`text-center font-bold ${
                            item.quantity_diff > 0 ? 'text-green-600' : 
                            item.quantity_diff < 0 ? 'text-red-600' : ''
                          }`}>
                            {item.quantity_diff > 0 ? '+' : ''}{item.quantity_diff}
                          </TableCell>
                          <TableCell className={`text-left font-medium ${
                            (item.total_cost_diff || 0) > 0 ? 'text-green-600' : 
                            (item.total_cost_diff || 0) < 0 ? 'text-red-600' : ''
                          }`}>
                            {(item.total_cost_diff || 0) > 0 ? '+' : ''}{(item.total_cost_diff || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {selectedAdjustment.notes && (
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">ملاحظات</div>
                    <div>{selectedAdjustment.notes}</div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                إغلاق
              </Button>
              {selectedAdjustment?.status === "draft" && (
                <Button onClick={() => {
                  handlePost(selectedAdjustment.id);
                  setDetailsDialogOpen(false);
                }} disabled={posting}>
                  <CheckCircle className="w-4 h-4 ml-2" />
                  ترحيل التسوية
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Adjustment Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء تسوية مخزون يدوية</DialogTitle>
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
