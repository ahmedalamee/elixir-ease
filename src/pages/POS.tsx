import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { POSSessionDialog } from "@/components/pos/POSSessionDialog";
import { POSReceipt } from "@/components/pos/POSReceipt";
import { useReactToPrint } from "react-to-print";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  X,
  CheckCircle,
  CreditCard,
  Star,
  TrendingUp,
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
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  credit_limit: number;
  loyalty_points: number;
  segment: string;
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
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [posSession, setPosSession] = useState<any>(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState("");

  const taxRate = 15;

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  // Auth check
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
        .select(`
          id,
          name,
          barcode,
          price,
          quantity,
          allow_discount,
          max_discount_percentage,
          default_discount_percentage,
          base_uom_id,
          image_url,
          category_id
        `)
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
        .select("id, name, phone, balance, credit_limit, loyalty_points, segment")
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
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setPosSession(data);
    } catch (error) {
      console.error("Error fetching POS session:", error);
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

  // Filter customers
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm)
  );

  // Cart operations
  const addToCart = (product: Product) => {
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
        },
      ]);
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
    setCart([]);
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

      // Try to generate journal entry
      try {
        await supabase.functions.invoke("generate-journal-entry", {
          body: {
            document_type: "sales_invoice",
            document_id: invoiceData.id,
            document_number: invoiceNumber,
            document_date: new Date().toISOString().split("T")[0],
            amount: totals.total,
            customer_id: selectedCustomer?.id || null,
            payment_method: paymentMethods.find((pm) => pm.id === paymentMethodId)?.name,
          },
        });
      } catch (error) {
        console.error("Journal entry error:", error);
        // Don't fail the sale if journal entry fails
      }

      // Success
      setLastInvoiceNumber(invoiceNumber);
      toast({
        title: "تمت العملية بنجاح",
        description: `رقم الفاتورة: ${invoiceNumber}`,
      });

      // Reset
      setCart([]);
      setSelectedCustomer(null);
      fetchProducts();
      fetchPOSSession();

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
    <div className="h-screen flex flex-col bg-background">
      {/* Header - Compact */}
      <div className="border-b bg-card px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold">💊 نقطة بيع الصيدلية</h1>
              <p className="text-xs text-muted-foreground">
                الجلسة: {posSession?.session_number || "غير نشطة"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSessionDialog(true)}
              disabled={!posSession}
            >
              <Settings className="ml-2 h-4 w-4" />
              إدارة الجلسة
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Left Section - Products Display (60%) */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Search Bar */}
          <Card className="p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالاسم، الباركود، أو الاسم العلمي..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 h-11"
                  autoFocus
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px] h-11">
                  <SelectValue placeholder="كل الفئات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفئات</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Customer Info Bar */}
          <Card className="p-3">
            <div className="flex items-center gap-4">
              <div className="flex-1">
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
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="عميل عابر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>عميل عابر (Walk-in)</span>
                      </div>
                    </SelectItem>
                    {filteredCustomers.slice(0, 50).map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{customer.name}</span>
                          <span className="text-xs text-muted-foreground">{customer.phone}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCustomer && (
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">الرصيد</p>
                      <p className="font-semibold">{selectedCustomer.balance?.toFixed(2) || "0.00"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">الائتمان</p>
                      <p className="font-semibold">{selectedCustomer.credit_limit?.toFixed(2) || "0.00"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">النقاط</p>
                      <p className="font-semibold text-yellow-600">{selectedCustomer.loyalty_points || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Products Grid - 4x4 */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-4 gap-3 pb-4">
              {filteredProducts.length === 0 ? (
                <div className="col-span-4 text-center py-12">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">لا توجد منتجات</p>
                  <p className="text-sm text-muted-foreground">جرب تغيير معايير البحث</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all group overflow-hidden"
                    onClick={() => addToCart(product)}
                  >
                    {/* Product Image */}
                    <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      
                      {/* Badges */}
                      <div className="absolute top-2 left-2 right-2 flex justify-between gap-1">
                        {product.allow_discount && product.default_discount_percentage > 0 && (
                          <Badge className="bg-red-500 text-white text-xs shadow-sm">
                            {product.default_discount_percentage}% خصم
                          </Badge>
                        )}
                        {product.quantity <= 10 && product.quantity > 0 && (
                          <Badge variant="outline" className="bg-orange-500/90 text-white border-0 text-xs">
                            قليل
                          </Badge>
                        )}
                        {product.quantity === 0 && (
                          <Badge variant="destructive" className="text-xs">
                            منتهي
                          </Badge>
                        )}
                      </div>

                      {/* Stock Indicator */}
                      <div className="absolute bottom-2 right-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                        <div className="flex items-center justify-between text-white">
                          <span className="text-xs">متوفر:</span>
                          <span className="text-xs font-semibold">{product.quantity}</span>
                        </div>
                      </div>
                    </div>

                    {/* Product Info */}
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm mb-1 truncate group-hover:text-primary transition-colors line-clamp-2 min-h-[40px]">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex flex-col">
                          <p className="text-lg font-bold text-primary">
                            {product.price.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">ر.س</p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Section - Cart (40%) */}
        <div className="w-[450px] flex flex-col gap-4">
          {/* Cart Header */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">سلة المشتريات</h2>
                  <p className="text-xs text-muted-foreground">
                    {cart.length} {cart.length === 1 ? "منتج" : "منتجات"}
                  </p>
                </div>
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>

          {/* Cart Items */}
          <Card className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 p-4">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <div className="h-20 w-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium mb-1">السلة فارغة</p>
                  <p className="text-sm text-muted-foreground">ابدأ بإضافة المنتجات</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, index) => (
                    <Card key={index} className="p-3 hover:shadow-sm transition-shadow">
                      {/* Item Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{item.product_name}</h4>
                          <p className="text-xs text-muted-foreground">
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

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mb-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                          className="text-center h-8 w-16"
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
                        <div className="flex-1 text-left">
                          <p className="text-xs text-muted-foreground">الكمية</p>
                        </div>
                      </div>

                      {/* Discount Controls */}
                      {item.allow_discount && (
                        <div className="mb-3 p-2 bg-muted/50 rounded">
                          <div className="flex items-center gap-2">
                            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              type="number"
                              value={item.discount_percentage}
                              onChange={(e) => updateDiscount(index, parseFloat(e.target.value) || 0)}
                              className="text-center h-8 flex-1"
                              min="0"
                              max={item.max_discount_percentage}
                              step="0.1"
                              placeholder="خصم %"
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              (حد أقصى {item.max_discount_percentage}%)
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Item Summary */}
                      <div className="space-y-1 pt-3 border-t">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">المجموع:</span>
                          <span>{(item.quantity * item.unit_price).toFixed(2)} ر.س</span>
                        </div>
                        {item.discount_amount > 0 && (
                          <div className="flex justify-between text-xs text-orange-600">
                            <span>الخصم ({item.discount_percentage}%):</span>
                            <span>-{item.discount_amount.toFixed(2)} ر.س</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-sm pt-1">
                          <span>الصافي:</span>
                          <span className="text-primary">{item.line_total.toFixed(2)} ر.س</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Cart Footer - Payment Section */}
          {cart.length > 0 && (
            <Card className="p-4">
              {/* Totals Summary */}
              <div className="space-y-2 mb-4 pb-4 border-b">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المجموع الفرعي:</span>
                  <span className="font-medium">{totals.subtotal.toFixed(2)} ر.س</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-600">إجمالي الخصم:</span>
                    <span className="text-orange-600 font-medium">-{totals.discount.toFixed(2)} ر.س</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الضريبة ({taxRate}%):</span>
                  <span className="font-medium">{totals.taxAmount.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-2">
                  <span>الإجمالي النهائي:</span>
                  <span className="text-primary">{totals.total.toFixed(2)} ر.س</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  طريقة الدفع
                </label>
                <Select value={paymentMethodId || ""} onValueChange={setPaymentMethodId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          {method.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={clearCart}
                  disabled={isProcessing}
                >
                  <X className="ml-2 h-5 w-5" />
                  إلغاء
                </Button>
                <Button
                  className="flex-1 h-12 text-base"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || !paymentMethodId || isProcessing}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري المعالجة...
                    </span>
                  ) : (
                    <>
                      <CheckCircle className="ml-2 h-5 w-5" />
                      إتمام البيع
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <POSSessionDialog
        open={showSessionDialog}
        onOpenChange={setShowSessionDialog}
        currentSession={posSession}
        onSessionUpdate={fetchPOSSession}
      />

      <POSReceipt
        ref={receiptRef}
        invoiceNumber={lastInvoiceNumber}
        invoiceDate={new Date().toISOString()}
        items={cart.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.unit_price,
          discount: item.discount_amount,
          total: item.line_total + (item.line_total * taxRate / 100)
        }))}
        subtotal={totals.subtotal}
        discount={totals.discount}
        taxAmount={totals.taxAmount}
        totalAmount={totals.total}
        paymentMethod={paymentMethods.find(pm => pm.id === paymentMethodId)?.name || "نقدي"}
        customerName={selectedCustomer?.name}
      />
    </div>
  );
};

export default POS;
