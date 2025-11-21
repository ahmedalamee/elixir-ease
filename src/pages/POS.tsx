import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { POSSessionDialog } from "@/components/pos/POSSessionDialog";
import { POSReceipt } from "@/components/pos/POSReceipt";
import { useReactToPrint } from "react-to-print";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Search,
  Trash2,
  Plus,
  Minus,
  Settings,
  User,
  Package,
  Percent,
  DollarSign,
  Clock,
  LogOut,
  TrendingUp,
  FileText,
  CreditCard,
  Star,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Printer,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Interfaces
interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  quantity: number;
  allow_discount?: boolean;
  max_discount_percentage?: number;
  default_discount_percentage?: number;
  base_uom_id?: string;
  image_url?: string;
  category_id?: string;
  expiry_date?: string;
}

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  line_total: number;
  allow_discount: boolean;
  max_discount_percentage: number;
  uom_id?: string;
  expiry_date?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  credit_limit: number;
  loyalty_points: number;
}

interface Category {
  id: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  name: string;
}

const POS = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [posSession, setPosSession] = useState<any>(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessionStats, setSessionStats] = useState({ invoices: 0, total: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());

  const taxRate = 15;

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auth check and initial data fetch
  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  // Fetch session stats when session changes
  useEffect(() => {
    if (posSession) {
      fetchSessionStats();
    }
  }, [posSession]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchData = async () => {
    await Promise.all([
      fetchProducts(),
      fetchCategories(),
      fetchCustomers(),
      fetchPaymentMethods(),
      fetchPOSSession(),
    ]);
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, barcode, price, quantity, allow_discount, max_discount_percentage, default_discount_percentage, base_uom_id, image_url, category_id")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, balance, credit_limit, loyalty_points")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setPaymentMethods(data || []);
      if (data && data.length > 0) {
        setPaymentMethodId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const fetchPOSSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("pos_sessions")
        .select("*")
        .eq("cashier_id", user?.id)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      setPosSession(data);
    } catch (error) {
      console.error("Error fetching POS session:", error);
    }
  };

  const fetchSessionStats = async () => {
    if (!posSession) return;
    
    try {
      const { data, error } = await supabase
        .from("sales_invoices")
        .select("id, total_amount")
        .eq("created_by", currentUser?.id)
        .gte("created_at", posSession.opened_at)
        .eq("status", "posted");

      if (error) throw error;
      
      setSessionStats({
        invoices: data?.length || 0,
        total: data?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0,
      });
    } catch (error) {
      console.error("Error fetching session stats:", error);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.includes(searchTerm);
    const matchesCategory =
      selectedCategory === "all" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.quantity === 0) {
      toast({
        title: "المنتج غير متوفر",
        description: "هذا المنتج غير متوفر في المخزون",
        variant: "destructive",
      });
      return;
    }

    // Check expiry date
    if (product.expiry_date && new Date(product.expiry_date) <= new Date()) {
      toast({
        title: "⚠️ تحذير: منتج منتهي الصلاحية",
        description: `صلاحية المنتج انتهت في ${new Date(product.expiry_date).toLocaleDateString('ar-SA')}`,
        variant: "destructive",
      });
      return;
    }

    const existingItemIndex = cart.findIndex((item) => item.product_id === product.id);

    if (existingItemIndex >= 0) {
      const updatedCart = [...cart];
      const existingItem = updatedCart[existingItemIndex];
      const newQuantity = existingItem.quantity + 1;

      if (newQuantity > product.quantity) {
        toast({
          title: "تحذير",
          description: "الكمية المتاحة غير كافية",
          variant: "destructive",
        });
        return;
      }

      existingItem.quantity = newQuantity;
      existingItem.discount_amount =
        (existingItem.unit_price * newQuantity * existingItem.discount_percentage) / 100;
      existingItem.line_total =
        existingItem.unit_price * newQuantity - existingItem.discount_amount;

      setCart(updatedCart);
    } else {
      const discountPercentage = product.default_discount_percentage || 0;
      const discountAmount = (product.price * discountPercentage) / 100;
      const lineTotal = product.price - discountAmount;

      setCart([
        ...cart,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
          line_total: lineTotal,
          allow_discount: product.allow_discount || false,
          max_discount_percentage: product.max_discount_percentage || 0,
          uom_id: product.base_uom_id,
          expiry_date: product.expiry_date,
        },
      ]);
    }

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }

    const product = products.find((p) => p.id === cart[index].product_id);
    if (product && newQuantity > product.quantity) {
      toast({
        title: "تحذير",
        description: "الكمية المتاحة غير كافية",
        variant: "destructive",
      });
      return;
    }

    const updatedCart = [...cart];
    updatedCart[index].quantity = newQuantity;
    updatedCart[index].discount_amount =
      (updatedCart[index].unit_price * newQuantity * updatedCart[index].discount_percentage) / 100;
    updatedCart[index].line_total =
      updatedCart[index].unit_price * newQuantity - updatedCart[index].discount_amount;

    setCart(updatedCart);
  };

  const updateDiscount = (index: number, discountPercentage: number) => {
    if (!cart[index].allow_discount) {
      toast({
        title: "تحذير",
        description: "لا يُسمح بالخصم على هذا المنتج",
        variant: "destructive",
      });
      return;
    }

    if (discountPercentage > cart[index].max_discount_percentage) {
      toast({
        title: "تحذير",
        description: `أقصى خصم مسموح به ${cart[index].max_discount_percentage}%`,
        variant: "destructive",
      });
      return;
    }

    const updatedCart = [...cart];
    updatedCart[index].discount_percentage = discountPercentage;
    updatedCart[index].discount_amount =
      (updatedCart[index].unit_price * updatedCart[index].quantity * discountPercentage) / 100;
    updatedCart[index].line_total =
      updatedCart[index].unit_price * updatedCart[index].quantity -
      updatedCart[index].discount_amount;

    setCart(updatedCart);
  };

  const clearCart = () => {
    if (cart.length > 0 && !window.confirm("هل أنت متأكد من حذف جميع المنتجات من السلة؟")) {
      return;
    }
    setCart([]);
    setSelectedCustomer(null);
    setPaidAmount("");
  };

  // Calculate totals
  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const discount = cart.reduce((sum, item) => sum + item.discount_amount, 0);
    const afterDiscount = subtotal - discount;
    const taxAmount = (afterDiscount * taxRate) / 100;
    const total = afterDiscount + taxAmount;

    return { subtotal, discount, afterDiscount, taxAmount, total };
  };

  const totals = calculateTotal();
  const changeAmount = paidAmount ? parseFloat(paidAmount) - totals.total : 0;

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "خطأ",
        description: "السلة فارغة",
        variant: "destructive",
      });
      return;
    }

    if (!posSession) {
      toast({
        title: "خطأ",
        description: "يجب فتح جلسة نقدية أولاً",
        variant: "destructive",
      });
      setShowSessionDialog(true);
      return;
    }

    if (!paymentMethodId) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار طريقة الدفع",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Generate invoice number
      const { data: invoiceNumberData } = await supabase.rpc("generate_si_number");
      const invoiceNumber = invoiceNumberData;

      // Create sales invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("sales_invoices")
        .insert({
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString().split("T")[0],
          customer_id: selectedCustomer?.id || null,
          subtotal: totals.subtotal,
          discount_amount: totals.discount,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          paid_amount: totals.total,
          payment_status: "paid",
          payment_method_id: paymentMethodId,
          status: "posted",
          created_by: user?.id,
          posted_by: user?.id,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Insert invoice items
      const invoiceItems = cart.map((item, index) => ({
        invoice_id: invoiceData.id,
        line_no: index + 1,
        item_id: item.product_id,
        uom_id: item.uom_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
        tax_percentage: taxRate,
        tax_amount: (item.line_total * taxRate) / 100,
        line_total: item.line_total + (item.line_total * taxRate) / 100,
      }));

      const { error: itemsError } = await supabase
        .from("sales_invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update POS session
      await supabase
        .from("pos_sessions")
        .update({
          expected_cash: (posSession.expected_cash || posSession.opening_cash) + totals.total,
        })
        .eq("id", posSession.id);

      // Success
      setLastInvoiceNumber(invoiceNumber);
      toast({
        title: "✅ تمت العملية بنجاح",
        description: `رقم الفاتورة: ${invoiceNumber}`,
      });

      // Reset
      setCart([]);
      setSelectedCustomer(null);
      setPaidAmount("");
      fetchProducts();
      fetchPOSSession();
      fetchSessionStats();

      // Print
      setTimeout(() => {
        if (window.confirm("هل تريد طباعة الفاتورة؟")) {
          handlePrint();
        }
      }, 500);
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إتمام العملية",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Sidebar: Session Settings (15%) */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            إعدادات الجلسة
          </h2>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* User Info */}
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-semibold">معلومات المستخدم</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">المستخدم:</span>
                </div>
                <p className="text-sm font-medium pl-6">
                  {currentUser?.email?.split('@')[0] || 'غير محدد'}
                </p>
                <div className="flex items-center gap-2 text-sm mt-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">الوقت:</span>
                </div>
                <p className="text-sm font-medium pl-6">
                  {currentTime.toLocaleTimeString('ar-SA', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-semibold">معلومات الجلسة</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {posSession ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">رقم:</span>
                    </div>
                    <p className="text-sm font-medium pl-6 text-primary">
                      {posSession.session_number}
                    </p>
                    <div className="flex items-center gap-2 text-sm mt-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">بدأت:</span>
                    </div>
                    <p className="text-sm font-medium pl-6">
                      {new Date(posSession.opened_at).toLocaleTimeString('ar-SA', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    <div className="flex items-center gap-2 text-sm mt-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">رصيد افتتاحي:</span>
                    </div>
                    <p className="text-sm font-medium pl-6 text-green-600">
                      {posSession.opening_cash?.toFixed(2) || '0.00'} ر.س
                    </p>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">لا توجد جلسة نشطة</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session Actions */}
            <div className="space-y-2">
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={() => setShowSessionDialog(true)}
                disabled={!!posSession}
              >
                <TrendingUp className="h-4 w-4 ml-2" />
                بدء جلسة جديدة
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowSessionDialog(true)}
                disabled={!posSession}
              >
                <LogOut className="h-4 w-4 ml-2" />
                إنهاء الجلسة
              </Button>
            </div>

            <Separator className="my-4" />

            {/* Quick Stats */}
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-semibold">إحصائيات سريعة</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">عدد الفواتير:</span>
                  <span className="font-bold text-primary">{sessionStats.invoices}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">إجمالي المبيعات:</span>
                  <span className="font-bold text-green-600">{sessionStats.total.toFixed(2)} ر.س</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">متوسط الفاتورة:</span>
                  <span className="font-medium">
                    {sessionStats.invoices > 0 
                      ? (sessionStats.total / sessionStats.invoices).toFixed(2)
                      : '0.00'} ر.س
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>

      {/* Center Section: Products and Search (55%) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">💊 نقطة البيع - الصيدلية</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date().toLocaleDateString('ar-SA', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            {!posSession && (
              <Badge variant="outline" className="border-orange-500 text-orange-600">
                <AlertTriangle className="h-3 w-3 ml-1" />
                جلسة غير نشطة
              </Badge>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم أو الباركود... (اضغط / للتركيز)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 h-12 text-base bg-background"
                autoFocus
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[220px] h-12 bg-background">
                <SelectValue placeholder="كل الفئات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>كل الفئات</span>
                  </div>
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Customer Selection */}
        <div className="p-4 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-4">
            <Select
              value={selectedCustomer?.id || "walk-in"}
              onValueChange={(value) => {
                if (value === "walk-in") {
                  setSelectedCustomer(null);
                } else {
                  const customer = customers.find((c) => c.id === value);
                  setSelectedCustomer(customer || null);
                }
              }}
            >
              <SelectTrigger className="w-[300px] h-10 bg-card">
                <SelectValue placeholder="عميل عابر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>عميل عابر</span>
                  </div>
                </SelectItem>
                {customers.slice(0, 50).map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{customer.name}</span>
                      <span className="text-xs text-muted-foreground">{customer.phone}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCustomer && (
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-card rounded-md">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">رصيد:</span>
                  <span className="font-bold text-foreground">{selectedCustomer.balance.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-card rounded-md">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-muted-foreground">نقاط:</span>
                  <span className="font-bold text-yellow-600">{selectedCustomer.loyalty_points}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products Grid - 4×6 */}
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-4 gap-3 pb-4">
            {filteredProducts.length === 0 ? (
              <div className="col-span-4 flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Package className="h-20 w-20 mb-3 opacity-20" />
                <p className="font-medium text-lg">لا توجد منتجات</p>
                <p className="text-sm">جرب تغيير معايير البحث</p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isOutOfStock = product.quantity === 0;
                const isLowStock = product.quantity > 0 && product.quantity <= 10;
                const hasDiscount = product.allow_discount && product.default_discount_percentage > 0;
                const isExpiringSoon = product.expiry_date && 
                  new Date(product.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                return (
                  <Card
                    key={product.id}
                    className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-95 ${
                      isOutOfStock ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() => !isOutOfStock && addToCart(product)}
                  >
                    {/* Product Image */}
                    <div className="aspect-square bg-gradient-to-br from-muted to-background relative overflow-hidden rounded-t-lg">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-16 w-16 text-muted-foreground/20" />
                        </div>
                      )}

                      {/* Status Badges */}
                      <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1">
                        {hasDiscount && (
                          <Badge className="bg-red-500 text-white text-xs shadow-lg">
                            -{product.default_discount_percentage}%
                          </Badge>
                        )}
                        {isExpiringSoon && !isOutOfStock && (
                          <Badge className="bg-orange-500 text-white text-xs shadow-lg">
                            <Calendar className="h-3 w-3 ml-1" />
                            قرب انتهاء
                          </Badge>
                        )}
                        {isLowStock && !isOutOfStock && (
                          <Badge className="bg-yellow-500 text-white text-xs shadow-lg">
                            قليل
                          </Badge>
                        )}
                        {isOutOfStock && (
                          <Badge variant="destructive" className="text-xs shadow-lg">
                            منتهي
                          </Badge>
                        )}
                      </div>

                      {/* Stock Indicator */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                        <div className="flex items-center justify-between text-white text-xs">
                          <span>متوفر</span>
                          <span className="font-bold">{product.quantity}</span>
                        </div>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-3">
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[40px]">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xl font-bold text-primary">{product.price.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">ر.س</p>
                        </div>
                        {!isOutOfStock && (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Plus className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Sidebar: Cart (30%) */}
      <div className="w-[30%] bg-card border-l border-border flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg">السلة</h2>
                <p className="text-xs text-muted-foreground">
                  {cart.length} {cart.length === 1 ? "منتج" : "منتجات"}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ShoppingCart className="h-12 w-12" />
                </div>
                <p className="font-medium text-lg">السلة فارغة</p>
                <p className="text-sm">ابدأ بإضافة المنتجات</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <Card key={index} className="p-3 hover:shadow-md transition-shadow">
                    {/* Item Header */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm line-clamp-2">{item.product_name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.unit_price.toFixed(2)} ر.س
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(index)}
                        className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Expiry Warning */}
                    {item.expiry_date && (
                      <div className="mb-2 p-1.5 bg-orange-50 dark:bg-orange-950 rounded text-xs flex items-center gap-1 text-orange-600">
                        <Calendar className="h-3 w-3" />
                        <span>انتهاء: {new Date(item.expiry_date).toLocaleDateString('ar-SA')}</span>
                      </div>
                    )}

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                        className="text-center h-8 w-16 font-semibold"
                        min="1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Discount */}
                    {item.allow_discount && (
                      <div className="mb-2 p-2 bg-muted/50 rounded flex items-center gap-2">
                        <Percent className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          type="number"
                          value={item.discount_percentage}
                          onChange={(e) => updateDiscount(index, parseFloat(e.target.value) || 0)}
                          className="text-center h-7 flex-1 text-xs"
                          min="0"
                          max={item.max_discount_percentage}
                          step="0.1"
                          placeholder="خصم %"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">
                          (حد {item.max_discount_percentage}%)
                        </span>
                      </div>
                    )}

                    {/* Item Summary */}
                    <div className="space-y-1 pt-2 border-t">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">المجموع:</span>
                        <span className="font-medium">{(item.quantity * item.unit_price).toFixed(2)} ر.س</span>
                      </div>
                      {item.discount_amount > 0 && (
                        <div className="flex justify-between text-xs text-orange-600">
                          <span>خصم ({item.discount_percentage}%):</span>
                          <span>-{item.discount_amount.toFixed(2)} ر.س</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm pt-1">
                        <span>الصافي:</span>
                        <span className="text-primary">{item.line_total.toFixed(2)} ر.س</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Payment Section */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-border bg-muted/30">
            {/* Totals Summary */}
            <Card className="p-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المجموع الفرعي:</span>
                  <span className="font-medium">{totals.subtotal.toFixed(2)} ر.س</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>الخصم:</span>
                    <span className="font-medium">-{totals.discount.toFixed(2)} ر.س</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الضريبة ({taxRate}%):</span>
                  <span className="font-medium">{totals.taxAmount.toFixed(2)} ر.س</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-2xl font-bold">
                  <span>الإجمالي:</span>
                  <span className="text-primary">{totals.total.toFixed(2)} ر.س</span>
                </div>
              </div>
            </Card>

            {/* Payment Method */}
            <div className="mb-3">
              <label className="text-sm font-medium mb-2 block">طريقة الدفع</label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger className="h-10 bg-card">
                  <SelectValue placeholder="اختر طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>{method.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Paid Amount & Change */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-sm font-medium mb-2 block">المبلغ المدفوع</label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={totals.total.toFixed(2)}
                  className="text-lg font-semibold h-11 bg-card"
                  step="0.01"
                />
              </div>
              {paidAmount && changeAmount >= 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">المبلغ المرتجع:</span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {changeAmount.toFixed(2)} ر.س
                    </span>
                  </div>
                </div>
              )}
              {paidAmount && changeAmount < 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">المبلغ غير كافٍ:</span>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">
                      {Math.abs(changeAmount).toFixed(2)} ر.س
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Checkout Button */}
            <Button
              onClick={handleCheckout}
              disabled={isProcessing || (paidAmount && changeAmount < 0)}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 ml-2" />
                  إتمام البيع
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Hidden Receipt for Printing */}
      <div className="hidden">
        <POSReceipt
          ref={receiptRef}
          invoiceNumber={lastInvoiceNumber}
          invoiceDate={new Date().toISOString().split("T")[0]}
          items={cart.map(item => ({
            name: item.product_name,
            quantity: item.quantity,
            price: item.unit_price,
            discount: item.discount_amount,
            total: item.line_total,
          }))}
          subtotal={totals.subtotal}
          discount={totals.discount}
          taxAmount={totals.taxAmount}
          totalAmount={totals.total}
          paymentMethod={paymentMethods.find(p => p.id === paymentMethodId)?.name || ""}
          customerName={selectedCustomer?.name || "عميل عابر"}
        />
      </div>

      {/* Session Dialog */}
      <POSSessionDialog
        open={showSessionDialog}
        onOpenChange={setShowSessionDialog}
        currentSession={posSession}
        onSessionUpdate={() => {
          fetchPOSSession();
          fetchSessionStats();
        }}
      />
    </div>
  );
};

export default POS;
