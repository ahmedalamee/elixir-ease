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
  BarChart3,
  X,
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

interface POSSession {
  id: string;
  session_number: string;
  opened_at: string;
  warehouse_id: string;
  opening_cash: number;
  status: string;
  total_sales?: number;
  invoice_count?: number;
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [currentSession, setCurrentSession] = useState<POSSession | null>(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState("");
  const [sessionStats, setSessionStats] = useState<{ total_sales: number; invoice_count: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const TAX_RATE = 15;

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
    if (currentSession) {
      fetchSessionStats();
    }
  }, [currentSession]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
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
        .select(
          "id, name, barcode, price, quantity, allow_discount, max_discount_percentage, default_discount_percentage, base_uom_id, image_url, category_id, expiry_date"
        )
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
        .order("name")
        .limit(100);

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
        setSelectedPaymentMethod(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const fetchPOSSession = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("pos_sessions")
        .select("*")
        .eq("cashier_id", user.id)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      setCurrentSession(data);
    } catch (error) {
      console.error("Error fetching POS session:", error);
    }
  };

  const fetchSessionStats = async () => {
    if (!currentSession) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("sales_invoices")
        .select("id, total_amount")
        .eq("created_by", user?.id)
        .gte("created_at", currentSession.opened_at)
        .eq("status", "posted");

      if (error) throw error;

      setSessionStats({
        invoice_count: data?.length || 0,
        total_sales: data?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0,
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
        description: `صلاحية المنتج انتهت في ${new Date(product.expiry_date).toLocaleDateString("ar-SA")}`,
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

  const clearCart = () => {
    if (cart.length > 0 && !window.confirm("هل أنت متأكد من حذف جميع المنتجات من السلة؟")) {
      return;
    }
    setCart([]);
    setSelectedCustomer(null);
    setPaidAmount("");
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const totalDiscount = cart.reduce((sum, item) => sum + item.discount_amount, 0);
  const afterDiscount = subtotal - totalDiscount;
  const tax = (afterDiscount * TAX_RATE) / 100;
  const grandTotal = afterDiscount + tax;
  const changeAmount = paidAmount ? parseFloat(paidAmount) - grandTotal : 0;

  // Checkout
  const handleCheckout = async () => {
    if (!currentSession) {
      toast({
        title: "لا توجد جلسة نشطة",
        description: "يرجى بدء جلسة جديدة أولاً",
        variant: "destructive",
      });
      setShowSessionDialog(true);
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "السلة فارغة",
        description: "يرجى إضافة منتجات للسلة",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: "يرجى اختيار طريقة الدفع",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get or create default customer
      let customerId = selectedCustomer?.id;

      if (!customerId) {
        const { data: defaultCustomer, error: customerError } = await supabase
          .from("customers")
          .select("id")
          .eq("name", "عميل عابر")
          .maybeSingle();

        if (!defaultCustomer) {
          const { data: newCustomer, error: createError } = await supabase
            .from("customers")
            .insert({
              name: "عميل عابر",
              phone: "0000000000",
              is_active: true,
            })
            .select("id")
            .single();

          if (createError) throw createError;
          customerId = newCustomer.id;
        } else {
          customerId = defaultCustomer.id;
        }
      }

      // Generate invoice number
      const { data: invoiceNumber, error: invoiceNumError } = await supabase.rpc(
        "generate_si_number"
      );

      if (invoiceNumError) throw invoiceNumError;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Create sales invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("sales_invoices")
        .insert({
          invoice_number: invoiceNumber,
          customer_id: customerId,
          invoice_date: new Date().toISOString().split("T")[0],
          subtotal: subtotal,
          discount_amount: totalDiscount,
          tax_amount: tax,
          total_amount: grandTotal,
          paid_amount: grandTotal,
          payment_status: "paid",
          status: "posted",
          payment_method_id: selectedPaymentMethod,
          warehouse_id: currentSession.warehouse_id,
          created_by: user?.id,
          posted_by: user?.id,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Insert invoice items
      const invoiceItems = cart.map((item, index) => ({
        invoice_id: invoice.id,
        line_no: index + 1,
        item_id: item.product_id,
        uom_id: item.uom_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
        tax_percentage: TAX_RATE,
        tax_amount: ((item.unit_price * item.quantity - item.discount_amount) * TAX_RATE) / 100,
        line_total: item.line_total,
      }));

      const { error: itemsError } = await supabase.from("sales_invoice_items").insert(invoiceItems);

      if (itemsError) throw itemsError;

      setLastInvoiceNumber(invoiceNumber);
      toast({
        title: "✅ تمت عملية البيع بنجاح",
        description: `رقم الفاتورة: ${invoiceNumber}`,
      });

      // Print receipt
      setTimeout(() => {
        handlePrint();
      }, 500);

      // Clear cart and refresh
      setCart([]);
      setSelectedCustomer(null);
      setPaidAmount("");
      await fetchPOSSession();
      await fetchSessionStats();
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "خطأ في عملية البيع",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSessionUpdate = async () => {
    await fetchPOSSession();
    await fetchSessionStats();
    setShowSessionDialog(false);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Sidebar - POS Menu */}
      <div className="w-72 bg-card border-r border-border flex flex-col overflow-hidden">
        {/* Logo Section */}
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">صيدلية النخيل</h1>
          <p className="text-sm text-muted-foreground mt-1">نظام نقطة البيع</p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            <Button variant="default" className="w-full justify-start text-right">
              <Package className="ml-2 h-5 w-5" />
              لوحة البيع الرئيسية
            </Button>

            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-right"
                onClick={() => setShowSessionDialog(true)}
              >
                <Settings className="ml-2 h-5 w-5" />
                إعدادات الجلسة
              </Button>

              <div className="pr-8 space-y-1">
                <Button variant="ghost" size="sm" className="w-full justify-start text-right text-xs">
                  معلومات المستخدم
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-right text-xs">
                  إدارة الورديات
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-right text-xs">
                  إعدادات الجهاز
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-right text-xs"
                  onClick={() => setShowSessionDialog(true)}
                >
                  إغلاق الجلسة
                </Button>
              </div>
            </div>

            <Button variant="ghost" className="w-full justify-start text-right">
              <BarChart3 className="ml-2 h-5 w-5" />
              التقارير والإحصائيات
            </Button>

            <Button variant="ghost" className="w-full justify-start text-right">
              <Settings className="ml-2 h-5 w-5" />
              إعدادات النظام
            </Button>
          </div>
        </nav>

        {/* Session Info */}
        {currentSession && (
          <div className="p-4 border-t border-border bg-accent/50">
            <h3 className="text-sm font-semibold text-foreground mb-3">الجلسة الحالية</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المستخدم:</span>
                <span className="text-foreground font-medium">أحمد الأمين</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الوردية:</span>
                <span className="text-foreground">صباحية</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">رقم الجلسة:</span>
                <span className="text-foreground font-medium text-[10px]">
                  {currentSession.session_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">وقت البدء:</span>
                <span className="text-foreground">
                  {new Date(currentSession.opened_at).toLocaleTimeString("ar-SA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {sessionStats && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">إجمالي المبيعات:</span>
                  <span className="text-foreground font-bold">
                    {sessionStats.total_sales.toFixed(2)} ر.س
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">عدد الفواتير:</span>
                  <span className="text-foreground">{sessionStats.invoice_count}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center - Products Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="ابحث بالاسم أو الباركود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={selectedCustomer?.id || "default"} onValueChange={(value) => {
              if (value === "default") {
                setSelectedCustomer(null);
              } else {
                const customer = customers.find((c) => c.id === value);
                setSelectedCustomer(customer || null);
              }
            }}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="اختر العميل" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="default">عميل عابر</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex gap-2 overflow-x-auto">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              كل الفئات
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-4 gap-4 p-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4">
                  <div className="aspect-square bg-accent rounded-lg mb-2 flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <h4 className="font-medium text-sm mb-1 line-clamp-2">{product.name}</h4>
                  <p className="text-lg font-bold text-primary mb-1">{product.price.toFixed(2)} ر.س</p>
                  <div className="flex items-center justify-between">
                    <Badge variant={product.quantity > 10 ? "default" : product.quantity > 0 ? "secondary" : "destructive"}>
                      المتاح: {product.quantity}
                    </Badge>
                    {product.expiry_date && new Date(product.expiry_date) <= new Date() && (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right Sidebar - Cart */}
      <div className="w-80 bg-card border-l border-border flex flex-col overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-lg font-bold">السلة</h2>
            <Badge>{cart.length} منتج</Badge>
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="icon" onClick={clearCart}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>السلة فارغة</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm flex-1">{item.product_name}</h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFromCart(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-medium w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-bold">{item.line_total.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>السعر: {item.unit_price.toFixed(2)} ر.س</span>
                      {item.discount_percentage > 0 && (
                        <span className="text-destructive">
                          خصم {item.discount_percentage}%
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t border-border">
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع الفرعي:</span>
                <span className="font-medium">{subtotal.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الخصم:</span>
                <span className="font-medium text-destructive">{totalDiscount.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الضريبة ({TAX_RATE}%):</span>
                <span className="font-medium">{tax.toFixed(2)} ر.س</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>الإجمالي:</span>
                <span className="text-primary">{grandTotal.toFixed(2)} ر.س</span>
              </div>
            </div>

            {/* Payment Section */}
            <div className="p-4 border-t border-border space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">طريقة الدفع:</label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">المبلغ المدفوع:</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>

              {paidAmount && changeAmount >= 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المبلغ المرتجع:</span>
                  <span className="font-bold text-green-600">{changeAmount.toFixed(2)} ر.س</span>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={isProcessing || !currentSession}
              >
                {isProcessing ? (
                  "جاري المعالجة..."
                ) : (
                  <>
                    <CheckCircle className="ml-2 h-5 w-5" />
                    إتمام البيع
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Session Dialog */}
      <POSSessionDialog
        open={showSessionDialog}
        onOpenChange={setShowSessionDialog}
        currentSession={currentSession}
        onSessionUpdate={handleSessionUpdate}
      />

      {/* Receipt (Hidden) */}
      <div className="hidden">
        <POSReceipt
          ref={receiptRef}
          invoiceNumber={lastInvoiceNumber}
          items={cart.map((item) => ({
            name: item.product_name,
            quantity: item.quantity,
            price: item.unit_price,
            discount: item.discount_amount,
            total: item.line_total,
          }))}
          subtotal={subtotal}
          discount={totalDiscount}
          taxAmount={tax}
          totalAmount={grandTotal}
          invoiceDate={new Date().toLocaleDateString("ar-SA")}
          paymentMethod={
            paymentMethods.find((m) => m.id === selectedPaymentMethod)?.name || ""
          }
          customerName={selectedCustomer?.name || "عميل عابر"}
        />
      </div>
    </div>
  );
};

export default POS;
