import { useState, useEffect, useRef, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, 
  Search, 
  Barcode, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Save, 
  CheckCircle, 
  AlertTriangle,
  History,
  Plus,
  Minus,
  Trash2,
  ScanLine,
  Calculator
} from "lucide-react";
import { generateAdjustmentNumber, postInventoryAdjustment, getCurrentStockQuantity } from "@/lib/inventory";

interface CountItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  barcode: string;
  system_qty: number;
  counted_qty: number | null;
  difference: number;
  unit_cost: number;
  cost_impact: number;
  adjustment_type: 'increase' | 'decrease' | 'no_change';
}

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  cost_price: number;
}

const StockCount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // States
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [countDate, setCountDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [postResult, setPostResult] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    fetchInitialData();
  }, []);

  // Auto-focus barcode input when in barcode mode
  useEffect(() => {
    if (barcodeMode && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [barcodeMode]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchWarehouses(), fetchProducts()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (!error) setWarehouses(data || []);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, barcode, cost_price")
      .eq("is_active", true)
      .order("name");
    if (!error) setProducts(data || []);
  };

  // Load all products for selected warehouse
  const loadWarehouseProducts = async (warehouseId: string) => {
    if (!warehouseId) return;
    
    setLoading(true);
    try {
      const items: CountItem[] = [];
      
      for (const product of products) {
        const systemQty = await getCurrentStockQuantity(product.id, warehouseId);
        
        items.push({
          id: crypto.randomUUID(),
          product_id: product.id,
          product_name: product.name,
          sku: product.sku || '',
          barcode: product.barcode || '',
          system_qty: systemQty,
          counted_qty: null,
          difference: 0,
          unit_cost: product.cost_price || 0,
          cost_impact: 0,
          adjustment_type: 'no_change'
        });
      }
      
      setCountItems(items);
    } catch (error) {
      console.error("Error loading products:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل منتجات المستودع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouse(warehouseId);
    loadWarehouseProducts(warehouseId);
  };

  // Update counted quantity
  const updateCountedQty = useCallback((itemId: string, value: number | null) => {
    setCountItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      const countedQty = value;
      const difference = countedQty !== null ? countedQty - item.system_qty : 0;
      const costImpact = difference * item.unit_cost;
      const adjustmentType: 'increase' | 'decrease' | 'no_change' = 
        difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'no_change';
      
      return {
        ...item,
        counted_qty: countedQty,
        difference,
        cost_impact: costImpact,
        adjustment_type: adjustmentType
      };
    }));
  }, []);

  // Handle barcode scan
  const handleBarcodeScan = useCallback((barcode: string) => {
    const item = countItems.find(i => i.barcode === barcode || i.sku === barcode);
    
    if (!item) {
      toast({
        title: "لم يُعثر على المنتج",
        description: `الباركود: ${barcode}`,
        variant: "destructive",
      });
      return;
    }

    // Increment counted quantity by 1
    const newQty = (item.counted_qty ?? 0) + 1;
    updateCountedQty(item.id, newQty);
    
    toast({
      title: "تم المسح",
      description: `${item.product_name}: ${newQty}`,
    });
    
    setBarcodeInput("");
  }, [countItems, updateCountedQty, toast]);

  const handleBarcodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      handleBarcodeScan(barcodeInput.trim());
    }
  };

  // Filter items
  const filteredItems = countItems.filter(item => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.product_name.toLowerCase().includes(search) ||
      item.sku?.toLowerCase().includes(search) ||
      item.barcode?.toLowerCase().includes(search)
    );
  });

  // Get items with differences only
  const itemsWithDifference = countItems.filter(item => item.counted_qty !== null && item.difference !== 0);

  // Summary calculations
  const totalIncrease = countItems
    .filter(i => i.adjustment_type === 'increase')
    .reduce((sum, i) => sum + i.cost_impact, 0);
  
  const totalDecrease = countItems
    .filter(i => i.adjustment_type === 'decrease')
    .reduce((sum, i) => sum + Math.abs(i.cost_impact), 0);

  const netImpact = totalIncrease - totalDecrease;

  // Save as draft
  const handleSaveDraft = async () => {
    if (!selectedWarehouse || itemsWithDifference.length === 0) {
      toast({
        title: "تنبيه",
        description: "لا توجد فروقات للحفظ",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adjustmentNumber = await generateAdjustmentNumber();

      // Create adjustment header
      const { data: adjustment, error: headerError } = await supabase
        .from("stock_adjustments")
        .insert({
          adjustment_number: adjustmentNumber,
          warehouse_id: selectedWarehouse,
          adjustment_date: countDate,
          reason: "stock_count",
          notes: notes,
          status: "draft",
          total_difference_qty: itemsWithDifference.reduce((sum, i) => sum + i.difference, 0),
          total_difference_value: netImpact,
          created_by: user?.id,
        })
        .select()
        .single();

      if (headerError) throw headerError;

      // Create adjustment items
      const itemsToInsert = itemsWithDifference.map(item => ({
        adjustment_id: adjustment.id,
        product_id: item.product_id,
        quantity_before: item.system_qty,
        quantity_after: item.counted_qty,
        quantity_diff: item.difference,
        unit_cost: item.unit_cost,
        total_cost_diff: item.cost_impact,
      }));

      const { error: itemsError } = await supabase
        .from("stock_adjustment_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: "تم الحفظ",
        description: `تم حفظ الجرد كمسودة: ${adjustmentNumber}`,
      });

    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Finalize and post
  const handleFinalize = async () => {
    if (!selectedWarehouse || itemsWithDifference.length === 0) {
      toast({
        title: "تنبيه",
        description: "لا توجد فروقات للترحيل",
        variant: "destructive",
      });
      return;
    }

    setFinalizing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adjustmentNumber = await generateAdjustmentNumber();

      // Create adjustment header
      const { data: adjustment, error: headerError } = await supabase
        .from("stock_adjustments")
        .insert({
          adjustment_number: adjustmentNumber,
          warehouse_id: selectedWarehouse,
          adjustment_date: countDate,
          reason: "stock_count",
          notes: notes,
          status: "draft",
          total_difference_qty: itemsWithDifference.reduce((sum, i) => sum + i.difference, 0),
          total_difference_value: netImpact,
          created_by: user?.id,
        })
        .select()
        .single();

      if (headerError) throw headerError;

      // Create adjustment items
      const itemsToInsert = itemsWithDifference.map(item => ({
        adjustment_id: adjustment.id,
        product_id: item.product_id,
        quantity_before: item.system_qty,
        quantity_after: item.counted_qty,
        quantity_diff: item.difference,
        unit_cost: item.unit_cost,
        total_cost_diff: item.cost_impact,
      }));

      const { error: itemsError } = await supabase
        .from("stock_adjustment_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Post the adjustment
      const result = await postInventoryAdjustment(adjustment.id);
      
      setPostResult({
        ...result,
        items_count: itemsWithDifference.length,
        total_increase: totalIncrease,
        total_decrease: totalDecrease,
      });
      setResultDialogOpen(true);

      // Reset form
      setCountItems([]);
      setSelectedWarehouse("");
      setNotes("");

    } catch (error: any) {
      toast({
        title: "خطأ في الترحيل",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFinalizing(false);
    }
  };

  // Export to Excel (CSV)
  const handleExport = () => {
    const headers = ['اسم المنتج', 'SKU', 'الباركود', 'كمية النظام', 'الكمية المحسوبة', 'الفرق', 'التكلفة', 'أثر التكلفة'];
    const rows = countItems.map(item => [
      item.product_name,
      item.sku,
      item.barcode,
      item.system_qty,
      item.counted_qty ?? '',
      item.difference,
      item.unit_cost,
      item.cost_impact
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-count-${countDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import from Excel
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(1); // Skip header
      
      let matched = 0;
      let notFound: string[] = [];

      lines.forEach(line => {
        const [barcode, countedQty] = line.split(',');
        if (!barcode || !countedQty) return;

        const item = countItems.find(i => i.barcode === barcode.trim() || i.sku === barcode.trim());
        if (item) {
          updateCountedQty(item.id, parseFloat(countedQty.trim()));
          matched++;
        } else {
          notFound.push(barcode.trim());
        }
      });

      toast({
        title: "تم الاستيراد",
        description: `تم مطابقة ${matched} منتج. ${notFound.length > 0 ? `لم يُعثر على: ${notFound.slice(0, 3).join(', ')}${notFound.length > 3 ? '...' : ''}` : ''}`,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Row style based on adjustment type
  const getRowClass = (type: string) => {
    switch (type) {
      case 'increase': return 'bg-green-50 dark:bg-green-950/20';
      case 'decrease': return 'bg-red-50 dark:bg-red-950/20';
      default: return '';
    }
  };

  if (loading && warehouses.length === 0) {
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
              <Package className="w-7 h-7" />
              الجرد الفعلي
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              إدارة الجرد الفعلي للمخزون مع تكامل FIFO والقيود المحاسبية
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate('/inventory/stock-adjustments')} className="gap-2">
              <History className="w-4 h-4" />
              سجل التسويات
            </Button>
          </div>
        </div>

        {/* Setup Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">إعداد الجرد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>المستودع *</Label>
                <Select value={selectedWarehouse} onValueChange={handleWarehouseChange}>
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
                <Label>تاريخ الجرد</Label>
                <Input
                  type="date"
                  value={countDate}
                  onChange={(e) => setCountDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات..."
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2 p-2 border rounded-md flex-1">
                  <Switch
                    checked={barcodeMode}
                    onCheckedChange={setBarcodeMode}
                    id="barcode-mode"
                  />
                  <Label htmlFor="barcode-mode" className="cursor-pointer flex items-center gap-1">
                    <ScanLine className="w-4 h-4" />
                    وضع الباركود
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Barcode Scanner */}
        {barcodeMode && selectedWarehouse && (
          <Card className="mb-6 border-primary">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Barcode className="w-8 h-8 text-primary" />
                <div className="flex-1">
                  <Input
                    ref={barcodeInputRef}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleBarcodeKeyDown}
                    placeholder="امسح الباركود أو أدخله يدوياً..."
                    className="text-lg"
                    autoFocus
                  />
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {itemsWithDifference.length} تغيير
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Actions Bar */}
        {selectedWarehouse && (
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالاسم، الباركود، SKU..."
                className="pr-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
                <Download className="w-4 h-4" />
                تصدير
              </Button>
              <label>
                <Button variant="outline" size="sm" className="gap-1 cursor-pointer" asChild>
                  <span>
                    <Upload className="w-4 h-4" />
                    استيراد
                  </span>
                </Button>
                <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* Products Table */}
        {selectedWarehouse && (
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-right w-[250px]">المنتج</TableHead>
                      <TableHead className="text-right w-[100px]">SKU</TableHead>
                      <TableHead className="text-right w-[120px]">الباركود</TableHead>
                      <TableHead className="text-center w-[100px]">كمية النظام</TableHead>
                      <TableHead className="text-center w-[140px]">الكمية الفعلية</TableHead>
                      <TableHead className="text-center w-[80px]">الفرق</TableHead>
                      <TableHead className="text-left w-[100px]">أثر التكلفة</TableHead>
                      <TableHead className="text-center w-[80px]">النوع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => (
                        <TableRow key={item.id} className={getRowClass(item.adjustment_type)}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-muted-foreground">{item.sku || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{item.barcode || '-'}</TableCell>
                          <TableCell className="text-center">{item.system_qty}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateCountedQty(item.id, Math.max(0, (item.counted_qty ?? 0) - 1))}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Input
                                type="number"
                                min="0"
                                value={item.counted_qty ?? ''}
                                onChange={(e) => updateCountedQty(item.id, e.target.value ? parseFloat(e.target.value) : null)}
                                className="w-20 text-center h-8"
                                placeholder="-"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateCountedQty(item.id, (item.counted_qty ?? 0) + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className={`text-center font-bold ${
                            item.difference > 0 ? 'text-green-600' : 
                            item.difference < 0 ? 'text-red-600' : ''
                          }`}>
                            {item.counted_qty !== null ? (
                              item.difference > 0 ? `+${item.difference}` : item.difference
                            ) : '-'}
                          </TableCell>
                          <TableCell className={`text-left font-medium ${
                            item.cost_impact > 0 ? 'text-green-600' : 
                            item.cost_impact < 0 ? 'text-red-600' : ''
                          }`}>
                            {item.counted_qty !== null ? (
                              `${item.cost_impact > 0 ? '+' : ''}${item.cost_impact.toFixed(2)}`
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.adjustment_type === 'increase' && (
                              <Badge className="bg-green-500">زيادة</Badge>
                            )}
                            {item.adjustment_type === 'decrease' && (
                              <Badge variant="destructive">نقص</Badge>
                            )}
                            {item.adjustment_type === 'no_change' && item.counted_qty !== null && (
                              <Badge variant="secondary">متطابق</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {loading ? 'جارٍ التحميل...' : 'لا توجد منتجات'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Summary & Actions */}
        {selectedWarehouse && countItems.length > 0 && (
          <Card className="mt-6">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {/* Summary */}
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">عدد التغييرات:</span>
                    <Badge variant="outline">{itemsWithDifference.length}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-green-600" />
                    <span className="text-muted-foreground">إجمالي الزيادة:</span>
                    <span className="font-bold text-green-600">{totalIncrease.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Minus className="w-5 h-5 text-red-600" />
                    <span className="text-muted-foreground">إجمالي النقص:</span>
                    <span className="font-bold text-red-600">{totalDecrease.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">الصافي:</span>
                    <span className={`font-bold ${netImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netImpact >= 0 ? '+' : ''}{netImpact.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={saving || itemsWithDifference.length === 0}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'جارٍ الحفظ...' : 'حفظ كمسودة'}
                  </Button>
                  <Button
                    onClick={handleFinalize}
                    disabled={finalizing || itemsWithDifference.length === 0}
                    className="gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {finalizing ? 'جارٍ الترحيل...' : 'اعتماد الجرد'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result Dialog */}
        <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-6 h-6" />
                تم اعتماد الجرد بنجاح
              </DialogTitle>
              <DialogDescription>
                تم ترحيل التسوية وإنشاء القيود المحاسبية
              </DialogDescription>
            </DialogHeader>
            
            {postResult && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground">رقم التسوية</div>
                    <div className="font-bold">{postResult.adjustment_number}</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground">عدد المنتجات</div>
                    <div className="font-bold">{postResult.items_count}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground">إجمالي الزيادة</div>
                    <div className="font-bold text-green-600">+{postResult.total_increase?.toFixed(2)}</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground">إجمالي النقص</div>
                    <div className="font-bold text-red-600">-{postResult.total_decrease?.toFixed(2)}</div>
                  </div>
                </div>
                
                {postResult.journal_entry_number && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground">القيد المحاسبي</div>
                    <div className="font-bold">{postResult.journal_entry_number}</div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => {
                setResultDialogOpen(false);
                navigate('/inventory/stock-adjustments');
              }}>
                عرض سجل التسويات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StockCount;
