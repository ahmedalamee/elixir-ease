import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  Search, 
  Barcode, 
  Download, 
  Upload, 
  Save, 
  CheckCircle, 
  History,
  Plus,
  Minus,
  ScanLine,
  Calculator,
  ArrowLeft,
  Loader2,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Settings2,
  ListChecks,
  ClipboardCheck,
  Check,
  Warehouse,
  Calendar,
  FileSpreadsheet
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
  lastScanned?: boolean;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  cost_price: number;
}

interface PostResult {
  success?: boolean;
  adjustment_number?: string;
  items_count?: number;
  total_increase?: number;
  total_decrease?: number;
  net_impact?: number;
  journal_entry_number?: string;
}

type Step = 'setup' | 'count' | 'review';

const STEPS_CONFIG = [
  { key: 'setup' as Step, label: 'إعداد الجرد', icon: Settings2, number: 1 },
  { key: 'count' as Step, label: 'إدخال الكميات', icon: ListChecks, number: 2 },
  { key: 'review' as Step, label: 'المراجعة والاعتماد', icon: ClipboardCheck, number: 3 },
];

const StockCount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // Step State
  const [currentStep, setCurrentStep] = useState<Step>('setup');
  
  // Data States
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [countDate, setCountDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  
  // UI States
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [postResult, setPostResult] = useState<PostResult | null>(null);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [showSetupWarning, setShowSetupWarning] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchInitialData();
  }, []);

  // Auto-focus barcode input when in barcode mode
  useEffect(() => {
    if (barcodeMode && barcodeInputRef.current && currentStep === 'count') {
      barcodeInputRef.current.focus();
    }
  }, [barcodeMode, currentStep]);

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
  const loadWarehouseProducts = async () => {
    if (!selectedWarehouse) {
      setShowSetupWarning(true);
      toast({
        title: "تنبيه",
        description: "يرجى اختيار المستودع أولاً",
        variant: "destructive",
      });
      return;
    }
    
    setLoadingProducts(true);
    try {
      const items: CountItem[] = [];
      
      for (const product of products) {
        const systemQty = await getCurrentStockQuantity(product.id, selectedWarehouse);
        
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
      setCurrentStep('count');
      setShowSetupWarning(false);
      
      toast({
        title: "تم تحميل المنتجات",
        description: `تم تحميل ${items.length} منتج من المستودع "${warehouseName}"`,
      });
    } catch (error) {
      console.error("Error loading products:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل منتجات المستودع",
        variant: "destructive",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouse(warehouseId);
    const wh = warehouses.find(w => w.id === warehouseId);
    setWarehouseName(wh?.name || '');
    setShowSetupWarning(false);
  };

  // Update counted quantity
  const updateCountedQty = useCallback((itemId: string, value: number | null) => {
    setCountItems(prev => prev.map(item => {
      if (item.id !== itemId) return { ...item, lastScanned: false };
      
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
        adjustment_type: adjustmentType,
        lastScanned: false
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
    
    setCountItems(prev => prev.map(i => {
      if (i.id !== item.id) return { ...i, lastScanned: false };
      
      const difference = newQty - i.system_qty;
      const costImpact = difference * i.unit_cost;
      const adjustmentType: 'increase' | 'decrease' | 'no_change' = 
        difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'no_change';
      
      return {
        ...i,
        counted_qty: newQty,
        difference,
        cost_impact: costImpact,
        adjustment_type: adjustmentType,
        lastScanned: true
      };
    }));
    
    toast({
      title: "تم المسح",
      description: `${item.product_name}: ${newQty}`,
    });
    
    setBarcodeInput("");
  }, [countItems, toast]);

  const handleBarcodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      handleBarcodeScan(barcodeInput.trim());
    }
  };

  // Memoized calculations for performance
  const filteredItems = useMemo(() => {
    return countItems.filter(item => {
      // Apply difference filter
      if (showOnlyDifferences && (item.counted_qty === null || item.difference === 0)) {
        return false;
      }
      
      // Apply search filter
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        item.product_name.toLowerCase().includes(search) ||
        item.sku?.toLowerCase().includes(search) ||
        item.barcode?.toLowerCase().includes(search)
      );
    });
  }, [countItems, searchTerm, showOnlyDifferences]);

  // Get items with differences only
  const itemsWithDifference = useMemo(() => {
    return countItems.filter(item => item.counted_qty !== null && item.difference !== 0);
  }, [countItems]);

  // Summary calculations
  const summaryStats = useMemo(() => {
    const increaseItems = countItems.filter(i => i.adjustment_type === 'increase');
    const decreaseItems = countItems.filter(i => i.adjustment_type === 'decrease');
    
    const totalIncrease = increaseItems.reduce((sum, i) => sum + i.cost_impact, 0);
    const totalDecrease = decreaseItems.reduce((sum, i) => sum + Math.abs(i.cost_impact), 0);
    const netImpact = totalIncrease - totalDecrease;
    const countedItemsCount = countItems.filter(i => i.counted_qty !== null).length;
    
    return {
      totalIncrease,
      totalDecrease,
      netImpact,
      countedItemsCount,
      increaseCount: increaseItems.length,
      decreaseCount: decreaseItems.length
    };
  }, [countItems]);

  // Shared function to create adjustment records
  const createAdjustmentRecords = async () => {
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
        total_difference_value: summaryStats.netImpact,
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

    return { adjustment, adjustmentNumber };
  };

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
      const { adjustmentNumber } = await createAdjustmentRecords();

      toast({
        title: "تم الحفظ",
        description: `تم حفظ الجرد كمسودة: ${adjustmentNumber}`,
      });
      
      // Reset and go back to setup
      resetForm();

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
      const { adjustment, adjustmentNumber } = await createAdjustmentRecords();

      // Post the adjustment
      const result = await postInventoryAdjustment(adjustment.id);
      
      setPostResult({
        ...result,
        adjustment_number: adjustmentNumber,
        items_count: itemsWithDifference.length,
        total_increase: summaryStats.totalIncrease,
        total_decrease: summaryStats.totalDecrease,
        net_impact: summaryStats.netImpact
      });
      setResultDialogOpen(true);

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

  const resetForm = () => {
    setCountItems([]);
    setSelectedWarehouse("");
    setWarehouseName("");
    setNotes("");
    setCurrentStep('setup');
    setShowOnlyDifferences(false);
    setSearchTerm("");
    setBarcodeMode(false);
  };

  // Navigate to a step (only backward allowed)
  const handleStepClick = (step: Step) => {
    const currentIndex = STEPS_CONFIG.findIndex(s => s.key === currentStep);
    const targetIndex = STEPS_CONFIG.findIndex(s => s.key === step);
    
    // Only allow going backward
    if (targetIndex < currentIndex) {
      setCurrentStep(step);
    }
  };

  // Export to Excel (CSV)
  const handleExport = () => {
    const headers = ['barcode', 'sku', 'product_name', 'system_qty', 'counted_qty', 'difference', 'unit_cost', 'cost_impact'];
    const rows = countItems.map(item => [
      item.barcode,
      item.sku,
      item.product_name,
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
    a.download = `stock-count-${warehouseName}-${countDate}.csv`;
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
        const parts = line.split(',');
        const barcode = parts[0]?.trim();
        // Try to get counted_qty from column 5 (index 4) if full format, else column 2 (index 1)
        const countedQty = parts[4]?.trim() || parts[1]?.trim();
        
        if (!barcode || !countedQty) return;

        const item = countItems.find(i => i.barcode === barcode || i.sku === barcode);
        if (item) {
          updateCountedQty(item.id, parseFloat(countedQty));
          matched++;
        } else {
          notFound.push(barcode);
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
  const getRowClass = (item: CountItem) => {
    if (item.lastScanned) return 'bg-primary/20 ring-2 ring-primary ring-inset animate-pulse';
    switch (item.adjustment_type) {
      case 'increase': return 'bg-green-50 dark:bg-green-950/30';
      case 'decrease': return 'bg-red-50 dark:bg-red-950/30';
      default: return '';
    }
  };

  // Step indicator component with click navigation
  const StepIndicator = () => {
    const currentIndex = STEPS_CONFIG.findIndex(s => s.key === currentStep);

    return (
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center gap-1 sm:gap-2 p-2 bg-muted/50 rounded-xl">
          {STEPS_CONFIG.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.key;
            const isCompleted = index < currentIndex;
            const canClick = index < currentIndex;
            
            return (
              <div key={step.key} className="flex items-center">
                {index > 0 && (
                  <div className={`w-6 sm:w-10 h-0.5 mx-1 ${
                    isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`} />
                )}
                <button
                  onClick={() => canClick && handleStepClick(step.key)}
                  disabled={!canClick}
                  className={`
                    flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                      : isCompleted 
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 cursor-pointer' 
                        : 'bg-muted text-muted-foreground cursor-default'
                    }
                  `}
                >
                  <div className={`
                    flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                    ${isActive 
                      ? 'bg-primary-foreground/20' 
                      : isCompleted 
                        ? 'bg-green-600 text-white' 
                        : 'bg-muted-foreground/20'
                    }
                  `}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.number}
                  </div>
                  <Icon className="w-4 h-4 hidden sm:block" />
                  <span className="text-sm font-medium hidden md:inline">{step.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading && warehouses.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>جارٍ التحميل...</span>
          </div>
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
              <Package className="w-7 h-7 text-primary" />
              الجرد الفعلي
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              إدارة الجرد الفعلي للمخزون مع تكامل FIFO والقيود المحاسبية
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/inventory/stock-adjustments')} className="gap-2">
            <History className="w-4 h-4" />
            سجل التسويات
          </Button>
        </div>

        {/* Step Indicator */}
        <StepIndicator />

        {/* STEP 1: Setup */}
        {currentStep === 'setup' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Settings2 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>إعداد الجرد</CardTitle>
              <CardDescription>اختر المستودع وحدد تاريخ الجرد لبدء عملية الجرد الفعلي</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Warehouse className="w-4 h-4" />
                    المستودع <span className="text-destructive">*</span>
                  </Label>
                  <Select value={selectedWarehouse} onValueChange={handleWarehouseChange}>
                    <SelectTrigger className={showSetupWarning && !selectedWarehouse ? 'border-destructive ring-2 ring-destructive/20' : ''}>
                      <SelectValue placeholder="اختر المستودع" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showSetupWarning && !selectedWarehouse && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      يجب اختيار المستودع للمتابعة
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    تاريخ الجرد
                  </Label>
                  <Input
                    type="date"
                    value={countDate}
                    onChange={(e) => setCountDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  ملاحظات (اختياري)
                </Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات إضافية عن الجرد..."
                />
              </div>
              <Separator />
              <div className="flex justify-center">
                <Button 
                  onClick={loadWarehouseProducts} 
                  disabled={loadingProducts}
                  className="gap-2 min-w-[220px]"
                  size="lg"
                >
                  {loadingProducts ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جارٍ تحميل المنتجات...
                    </>
                  ) : (
                    <>
                      تحميل منتجات المستودع
                      <ArrowLeft className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Count */}
        {currentStep === 'count' && (
          <>
            {/* Info Bar */}
            <Card className="mb-4 border-primary/20">
              <CardContent className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary/5">
                      <Warehouse className="w-3.5 h-3.5" />
                      {warehouseName}
                    </Badge>
                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
                      <Calendar className="w-3.5 h-3.5" />
                      {countDate}
                    </Badge>
                    <Separator orientation="vertical" className="h-6 hidden sm:block" />
                    <div className="flex gap-3 sm:gap-4 text-sm">
                      <span className="text-muted-foreground">
                        إجمالي: <strong className="text-foreground">{countItems.length}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        تم جردها: <strong className="text-primary">{summaryStats.countedItemsCount}</strong>
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep('setup')} className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                    تعديل الإعداد
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Barcode Mode Card */}
            <Card className={`mb-4 transition-all duration-300 ${barcodeMode ? 'border-primary shadow-lg shadow-primary/10' : ''}`}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={barcodeMode}
                      onCheckedChange={setBarcodeMode}
                      id="barcode-mode"
                      className="data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor="barcode-mode" className="cursor-pointer flex items-center gap-2 font-medium">
                      <ScanLine className={`w-5 h-5 ${barcodeMode ? 'text-primary' : 'text-muted-foreground'}`} />
                      وضع الباركود
                    </Label>
                  </div>
                  
                  {barcodeMode && (
                    <div className="flex-1 w-full sm:w-auto flex items-center gap-3 animate-in slide-in-from-top-2">
                      <Barcode className="w-7 h-7 text-primary hidden sm:block" />
                      <div className="relative flex-1">
                        <Input
                          ref={barcodeInputRef}
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyDown={handleBarcodeKeyDown}
                          placeholder="امسح الباركود ثم Enter..."
                          className="flex-1 pr-10 text-lg h-12 border-primary/50 focus:border-primary"
                          autoFocus
                        />
                        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-pulse" />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Search & Tools Bar */}
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
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background">
                  <Switch
                    checked={showOnlyDifferences}
                    onCheckedChange={setShowOnlyDifferences}
                    id="show-diff"
                  />
                  <Label htmlFor="show-diff" className="text-sm cursor-pointer whitespace-nowrap">
                    الفروقات فقط
                  </Label>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">تصدير</span>
                </Button>
                <label>
                  <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer" asChild>
                    <span>
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">استيراد</span>
                    </span>
                  </Button>
                  <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </div>

            {/* Products Table */}
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] sm:h-[450px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right min-w-[180px] font-semibold">المنتج</TableHead>
                        <TableHead className="text-right w-[80px] hidden md:table-cell font-semibold">SKU</TableHead>
                        <TableHead className="text-right w-[100px] hidden lg:table-cell font-semibold">الباركود</TableHead>
                        <TableHead className="text-center w-[70px] font-semibold">النظام</TableHead>
                        <TableHead className="text-center w-[150px] font-semibold">الكمية الفعلية</TableHead>
                        <TableHead className="text-center w-[70px] font-semibold">الفرق</TableHead>
                        <TableHead className="text-left w-[90px] hidden sm:table-cell font-semibold">التكلفة</TableHead>
                        <TableHead className="text-center w-[70px] font-semibold">النوع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length > 0 ? (
                        filteredItems.map((item) => (
                          <TableRow key={item.id} className={`transition-all ${getRowClass(item)}`}>
                            <TableCell className="font-medium">
                              <div>{item.product_name}</div>
                              <div className="text-xs text-muted-foreground md:hidden">
                                {item.sku && <span>{item.sku}</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{item.sku || '-'}</TableCell>
                            <TableCell className="font-mono text-xs hidden lg:table-cell">{item.barcode || '-'}</TableCell>
                            <TableCell className="text-center font-semibold text-muted-foreground">{item.system_qty}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-full"
                                  onClick={() => updateCountedQty(item.id, Math.max(0, (item.counted_qty ?? 0) - 1))}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.counted_qty ?? ''}
                                  onChange={(e) => updateCountedQty(item.id, e.target.value ? parseFloat(e.target.value) : null)}
                                  className="w-16 sm:w-20 text-center h-9 font-semibold"
                                  placeholder="-"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-full"
                                  onClick={() => updateCountedQty(item.id, (item.counted_qty ?? 0) + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className={`text-center font-bold ${
                              item.difference > 0 ? 'text-green-600' : 
                              item.difference < 0 ? 'text-red-600' : 'text-muted-foreground'
                            }`}>
                              {item.counted_qty !== null ? (
                                item.difference > 0 ? `+${item.difference}` : item.difference
                              ) : '-'}
                            </TableCell>
                            <TableCell className={`text-left text-sm font-semibold hidden sm:table-cell ${
                              item.cost_impact > 0 ? 'text-green-600' : 
                              item.cost_impact < 0 ? 'text-red-600' : 'text-muted-foreground'
                            }`}>
                              {item.counted_qty !== null ? (
                                `${item.cost_impact > 0 ? '+' : ''}${item.cost_impact.toFixed(2)}`
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.adjustment_type === 'increase' && (
                                <Badge className="bg-green-500 hover:bg-green-600 text-xs px-2">زيادة</Badge>
                              )}
                              {item.adjustment_type === 'decrease' && (
                                <Badge variant="destructive" className="text-xs px-2">نقص</Badge>
                              )}
                              {item.adjustment_type === 'no_change' && item.counted_qty !== null && (
                                <Badge variant="secondary" className="text-xs px-2">✓</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                            <div className="flex flex-col items-center gap-2">
                              <Search className="w-8 h-8 text-muted-foreground/50" />
                              {showOnlyDifferences ? 'لا توجد فروقات بعد' : 'لا توجد منتجات مطابقة للبحث'}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Summary & Actions */}
            <Card className="mt-4">
              <CardContent className="py-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 w-full lg:w-auto">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Calculator className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">التغييرات</div>
                        <div className="font-bold text-lg">{itemsWithDifference.length}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="text-xs text-muted-foreground">الزيادة</div>
                        <div className="font-bold text-green-600">{summaryStats.totalIncrease.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="text-xs text-muted-foreground">النقص</div>
                        <div className="font-bold text-red-600">{summaryStats.totalDecrease.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                      summaryStats.netImpact >= 0 
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                    }`}>
                      <AlertCircle className={`w-5 h-5 ${summaryStats.netImpact >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                      <div>
                        <div className="text-xs text-muted-foreground">الصافي</div>
                        <div className={`font-bold ${summaryStats.netImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {summaryStats.netImpact >= 0 ? '+' : ''}{summaryStats.netImpact.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 w-full lg:w-auto justify-end">
                    <Button
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={saving || itemsWithDifference.length === 0}
                      className="gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span className="hidden sm:inline">{saving ? 'جارٍ الحفظ...' : 'حفظ كمسودة'}</span>
                    </Button>
                    <Button
                      onClick={() => itemsWithDifference.length > 0 && setCurrentStep('review')}
                      disabled={itemsWithDifference.length === 0}
                      className="gap-2"
                    >
                      المراجعة والاعتماد
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* STEP 3: Review */}
        {currentStep === 'review' && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>مراجعة واعتماد الجرد</CardTitle>
              <CardDescription>راجع الفروقات قبل الاعتماد النهائي وإنشاء القيود المحاسبية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-muted/50 to-muted">
                  <CardContent className="p-4 text-center">
                    <Warehouse className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-lg font-bold truncate">{warehouseName}</div>
                    <div className="text-xs text-muted-foreground">المستودع</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-muted/50 to-muted">
                  <CardContent className="p-4 text-center">
                    <Calendar className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-lg font-bold">{countDate}</div>
                    <div className="text-xs text-muted-foreground">تاريخ الجرد</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-muted/50 to-muted">
                  <CardContent className="p-4 text-center">
                    <FileSpreadsheet className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-lg font-bold">{itemsWithDifference.length}</div>
                    <div className="text-xs text-muted-foreground">منتجات بفروقات</div>
                  </CardContent>
                </Card>
                <Card className={`bg-gradient-to-br ${
                  summaryStats.netImpact >= 0 
                    ? 'from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-950/20' 
                    : 'from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-950/20'
                }`}>
                  <CardContent className="p-4 text-center">
                    <AlertCircle className={`w-5 h-5 mx-auto mb-1 ${summaryStats.netImpact >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    <div className={`text-lg font-bold ${
                      summaryStats.netImpact >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {summaryStats.netImpact >= 0 ? '+' : ''}{summaryStats.netImpact.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">صافي التأثير</div>
                  </CardContent>
                </Card>
              </div>

              {/* Cost Impact Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">إجمالي الزيادة في المخزون</div>
                      <div className="text-2xl font-bold text-green-600">+{summaryStats.totalIncrease.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{summaryStats.increaseCount} منتج</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">إجمالي النقص في المخزون</div>
                      <div className="text-2xl font-bold text-red-600">-{summaryStats.totalDecrease.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{summaryStats.decreaseCount} منتج</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Items with differences */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  المنتجات التي بها فروقات ({itemsWithDifference.length})
                </h3>
                <ScrollArea className="h-[200px] sm:h-[250px] border rounded-lg">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                      <TableRow>
                        <TableHead className="text-right font-semibold">المنتج</TableHead>
                        <TableHead className="text-center font-semibold">النظام</TableHead>
                        <TableHead className="text-center font-semibold">الفعلية</TableHead>
                        <TableHead className="text-center font-semibold">الفرق</TableHead>
                        <TableHead className="text-left hidden sm:table-cell font-semibold">التكلفة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsWithDifference.map(item => (
                        <TableRow key={item.id} className={getRowClass(item)}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{item.system_qty}</TableCell>
                          <TableCell className="text-center font-semibold">{item.counted_qty}</TableCell>
                          <TableCell className={`text-center font-bold ${item.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.difference > 0 ? `+${item.difference}` : item.difference}
                          </TableCell>
                          <TableCell className={`text-left font-semibold hidden sm:table-cell ${item.cost_impact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.cost_impact > 0 ? '+' : ''}{item.cost_impact.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {notes && (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    ملاحظات:
                  </div>
                  <div>{notes}</div>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <Button variant="outline" onClick={() => setCurrentStep('count')} className="gap-2">
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                  العودة للتعديل
                </Button>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ كمسودة
                  </Button>
                  <Button
                    onClick={handleFinalize}
                    disabled={finalizing}
                    className="gap-2 min-w-[140px]"
                    size="lg"
                  >
                    {finalizing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        جارٍ الترحيل...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        اعتماد الجرد
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result Dialog */}
        <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <DialogTitle className="text-xl">تم اعتماد الجرد بنجاح</DialogTitle>
              <DialogDescription>
                تم ترحيل التسوية وإنشاء القيود المحاسبية وتحديث المخزون
              </DialogDescription>
            </DialogHeader>
            
            {postResult && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-xs text-muted-foreground">رقم التسوية</div>
                    <div className="font-bold text-primary">{postResult.adjustment_number}</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-xs text-muted-foreground">عدد المنتجات</div>
                    <div className="font-bold">{postResult.items_count}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg text-center border border-green-200 dark:border-green-800">
                    <div className="text-xs text-muted-foreground">إجمالي الزيادة</div>
                    <div className="font-bold text-green-600">+{postResult.total_increase?.toFixed(2)}</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg text-center border border-red-200 dark:border-red-800">
                    <div className="text-xs text-muted-foreground">إجمالي النقص</div>
                    <div className="font-bold text-red-600">-{postResult.total_decrease?.toFixed(2)}</div>
                  </div>
                </div>
                
                <div className={`p-4 rounded-lg text-center ${
                  (postResult.net_impact ?? 0) >= 0 
                    ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                }`}>
                  <div className="text-xs text-muted-foreground">صافي التأثير</div>
                  <div className={`font-bold text-2xl ${
                    (postResult.net_impact ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(postResult.net_impact ?? 0) >= 0 ? '+' : ''}{postResult.net_impact?.toFixed(2)}
                  </div>
                </div>
                
                {postResult.journal_entry_number && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-center border border-blue-200 dark:border-blue-800">
                    <div className="text-xs text-muted-foreground">القيد المحاسبي</div>
                    <div className="font-bold text-blue-600">{postResult.journal_entry_number}</div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => {
                setResultDialogOpen(false);
                resetForm();
              }} className="gap-2">
                <Plus className="w-4 h-4" />
                جرد جديد
              </Button>
              <Button onClick={() => {
                setResultDialogOpen(false);
                navigate('/inventory/stock-adjustments');
              }} className="gap-2">
                <History className="w-4 h-4" />
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
