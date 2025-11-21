import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { POSSessionDialog } from "@/components/pos/POSSessionDialog";
import { POSReceipt } from "@/components/pos/POSReceipt";
import { useReactToPrint } from "react-to-print";
import {
  ShoppingCart,
  Search,
  Trash2,
  Plus,
  Minus,
  Printer,
  DoorOpen,
  DoorClosed,
  AlertCircle,
  User,
  Package,
  Percent,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
  tax_code?: string;
}

interface CartItem extends Product {
  cartQuantity: number;
  discount_percentage: number;
  discount_amount: number;
  line_total: number;
  uom_id?: string;
}

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  name_en: string;
  is_active: boolean;
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

const POS = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchProducts(),
      fetchPaymentMethods(),
      fetchCurrentSession(),
      fetchCompanyInfo(),
      fetchCustomers(),
    ]);
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, barcode, price, quantity, allow_discount, max_discount_percentage, default_discount_percentage, base_uom_id, is_active")
        .eq("is_active", true)
        .gt("quantity", 0);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
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
        .select("*")
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

  const fetchCurrentSession = async () => {
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
      setCurrentSession(data);
    } catch (error) {
      console.error("Error fetching session:", error);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("company_profile")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching company info:", error);
        return;
      }
      setCompanyInfo(data);
    } catch (error) {
      console.error("Error fetching company info:", error);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery)
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      if (existingItem.cartQuantity >= product.quantity) {
        toast({
          title: "تحذير",
          description: "الكمية المطلوبة غير متوفرة في المخزون",
          variant: "destructive",
        });
        return;
      }
      updateQuantity(product.id, existingItem.cartQuantity + 1);
    } else {
      const discountPercentage = product.default_discount_percentage || 0;
      const itemPrice = product.price;
      const discountAmount = (itemPrice * discountPercentage) / 100;
      const lineTotal = itemPrice - discountAmount;

      setCart([
        ...cart,
        {
          ...product,
          cartQuantity: 1,
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
          line_total: lineTotal,
        },
      ]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (newQuantity > product.quantity) {
      toast({
        title: "تحذير",
        description: "الكمية المطلوبة غير متوفرة في المخزون",
        variant: "destructive",
      });
      return;
    }

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) => {
        if (item.id === productId) {
          const itemPrice = item.price * newQuantity;
          const discountAmount = (itemPrice * item.discount_percentage) / 100;
          const lineTotal = itemPrice - discountAmount;
          return {
            ...item,
            cartQuantity: newQuantity,
            discount_amount: discountAmount,
            line_total: lineTotal,
          };
        }
        return item;
      })
    );
  };

  const updateDiscount = (productId: string, discountPercentage: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (!product.allow_discount) {
      toast({
        title: "تحذير",
        description: "لا يُسمح بالخصم على هذا المنتج",
        variant: "destructive",
      });
      return;
    }

    if (discountPercentage > (product.max_discount_percentage || 0)) {
      toast({
        title: "تحذير",
        description: `أقصى خصم مسموح به ${product.max_discount_percentage}%`,
        variant: "destructive",
      });
      return;
    }

    setCart(
      cart.map((item) => {
        if (item.id === productId) {
          const itemPrice = item.price * item.cartQuantity;
          const discountAmount = (itemPrice * discountPercentage) / 100;
          const lineTotal = itemPrice - discountAmount;
          return {
            ...item,
            discount_percentage: discountPercentage,
            discount_amount: discountAmount,
            line_total: lineTotal,
          };
        }
        return item;
      })
    );
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  };

  const calculateTotalDiscount = () => {
    return cart.reduce((sum, item) => sum + item.discount_amount, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateTotalDiscount();
    const afterDiscount = subtotal - discount;
    const taxRate = 0.15;
    const taxAmount = afterDiscount * taxRate;
    return {
      subtotal,
      discount,
      afterDiscount,
      taxAmount,
      total: afterDiscount + taxAmount,
    };
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
  );

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "خطأ",
        description: "السلة فارغة",
        variant: "destructive",
      });
      return;
    }

    if (!currentSession) {
      toast({
        title: "خطأ",
        description: "يجب فتح جلسة نقدية أولاً",
        variant: "destructive",
      });
      setSessionDialogOpen(true);
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار طريقة الدفع",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const invoiceNumber = `INV-POS-${Date.now()}`;
      const totals = calculateTotal();

      // إنشاء فاتورة المبيعات
      const { data: invoiceData, error: invoiceError } = await (supabase as any)
        .from("sales_invoices")
        .insert({
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString(),
          customer_id: selectedCustomer?.id || null,
          subtotal: totals.subtotal,
          discount_amount: totals.discount,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          paid_amount: totals.total,
          payment_status: "paid",
          status: "posted",
          created_by: user?.id,
          posted_by: user?.id,
          posted_at: new Date().toISOString(),
          payment_method_id: selectedPaymentMethod,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // إضافة تفاصيل الفاتورة
      const invoiceItems = cart.map((item, index) => ({
        invoice_id: invoiceData.id,
        line_no: index + 1,
        item_id: item.id,
        uom_id: item.base_uom_id || null,
        quantity: item.cartQuantity,
        unit_price: item.price,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
        tax_percentage: 15,
        tax_amount: item.line_total * 0.15,
        line_total: item.line_total * 1.15,
      }));

      const { error: itemsError } = await supabase
        .from("sales_invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // تحديث المخزون بشكل آمن (يمنع race conditions)
      for (const item of cart) {
        const { data: result, error: stockError } = await (supabase as any)
          .rpc('decrement_product_quantity', {
            product_id: item.id,
            quantity_to_remove: item.cartQuantity
          });

        if (stockError || !result?.[0]?.success) {
          // التراجع عن الفاتورة في حالة فشل تحديث المخزون
          await supabase
            .from("sales_invoices")
            .delete()
            .eq("id", invoiceData.id);
          
          await supabase
            .from("sales_invoice_items")
            .delete()
            .eq("invoice_id", invoiceData.id);

          toast({
            title: "فشلت العملية",
            description: result?.[0]?.message || "فشل في تحديث المخزون",
            variant: "destructive",
          });
          return;
        }
      }

      // تحديث الجلسة النقدية
      await supabase
        .from("pos_sessions")
        .update({
          expected_cash: (currentSession.expected_cash || currentSession.opening_cash) + totals.total,
        })
        .eq("id", currentSession.id);

      // التكامل المحاسبي التلقائي مع معالجة أخطاء محسّنة
      let journalEntryCreated = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!journalEntryCreated && retryCount < maxRetries) {
        try {
          const { data: journalData, error: journalError } = await supabase.functions.invoke(
            'generate-journal-entry',
            {
              body: {
                document_type: "sales_invoice",
                document_id: invoiceData.id,
                document_number: invoiceNumber,
                document_date: new Date().toISOString().split('T')[0],
                amount: totals.total,
                customer_id: selectedCustomer?.id || null,
                payment_method: paymentMethods.find((pm) => pm.id === selectedPaymentMethod)?.code,
              },
            }
          );

          if (journalError) {
            console.error(`Journal entry attempt ${retryCount + 1} failed:`, journalError);
            retryCount++;
            
            if (retryCount >= maxRetries) {
              // بعد 3 محاولات فاشلة، نسجل خطأ ولكن لا نلغي الفاتورة
              console.error("Failed to create journal entry after max retries");
              toast({
                title: "تحذير",
                description: "تم إنشاء الفاتورة ولكن فشل التسجيل المحاسبي. سيتم المحاولة لاحقاً.",
                variant: "destructive",
              });
            } else {
              // انتظر قليلاً قبل إعادة المحاولة
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          } else if (journalData?.success) {
            journalEntryCreated = true;
            console.log("Journal entry created successfully:", journalData);
          } else {
            console.warn("Journal entry returned unsuccessful response:", journalData);
            retryCount++;
          }
        } catch (error) {
          console.error(`Error in journal entry attempt ${retryCount + 1}:`, error);
          retryCount++;
          
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }

      // حفظ آخر فاتورة للطباعة
      setLastInvoice({
        invoiceNumber,
        invoiceDate: new Date().toISOString(),
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.cartQuantity,
          price: item.price,
          discount: item.discount_amount,
          total: item.line_total * 1.15,
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.total,
        paymentMethod: paymentMethods.find((pm) => pm.id === selectedPaymentMethod)?.name || "",
        customerName: selectedCustomer?.name,
      });

      toast({
        title: "تمت العملية بنجاح",
        description: `رقم الفاتورة: ${invoiceNumber}`,
      });

      setCart([]);
      setSelectedCustomer(null);
      fetchProducts();
      fetchCurrentSession();

      // فتح خيار الطباعة
      setTimeout(() => {
        if (window.confirm("هل تريد طباعة الفاتورة؟")) {
          handlePrint();
        }
      }, 500);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Session Status */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {currentSession ? (
              <Alert className="flex-1">
                <DoorOpen className="h-4 w-4" />
                <AlertDescription>
                  جلسة مفتوحة: {currentSession.session_number} | المبلغ المتوقع:{" "}
                  {(currentSession.expected_cash || currentSession.opening_cash)?.toFixed(2)} ر.س
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive" className="flex-1">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>لا توجد جلسة مفتوحة - يجب فتح جلسة للبدء</AlertDescription>
              </Alert>
            )}
          </div>
          <Button
            variant={currentSession ? "destructive" : "default"}
            onClick={() => setSessionDialogOpen(true)}
            className="gap-2"
          >
            {currentSession ? (
              <>
                <DoorClosed className="w-4 h-4" />
                إغلاق الجلسة
              </>
            ) : (
              <>
                <DoorOpen className="w-4 h-4" />
                فتح جلسة
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer Selection */}
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <User className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">العميل</label>
                  <Select
                    value={selectedCustomer?.id || ""}
                    onValueChange={(value) => {
                      const customer = customers.find((c) => c.id === value);
                      setSelectedCustomer(customer || null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="عميل عابر (Walk-in)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">عميل عابر (Walk-in)</SelectItem>
                      {filteredCustomers.slice(0, 50).map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCustomer && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              {selectedCustomer && (
                <div className="mt-3 grid grid-cols-3 gap-4 p-3 bg-accent rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">الرصيد</p>
                    <p className="font-bold text-sm">{selectedCustomer.balance.toFixed(2)} ر.س</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">حد الائتمان</p>
                    <p className="font-bold text-sm">{selectedCustomer.credit_limit.toFixed(2)} ر.س</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">نقاط الولاء</p>
                    <p className="font-bold text-sm">{selectedCustomer.loyalty_points}</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Product Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ابحث عن منتج بالاسم أو الباركود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 text-lg h-12"
                autoFocus
              />
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95"
                  onClick={() => addToCart(product)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-base mb-1 line-clamp-2">{product.name}</h3>
                      <div className="flex items-center gap-2">
                        {product.allow_discount && product.default_discount_percentage! > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Percent className="w-3 h-3 mr-1" />
                            خصم {product.default_discount_percentage}%
                          </Badge>
                        )}
                        {product.quantity <= 10 && (
                          <Badge variant="destructive" className="text-xs">
                            قليل
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {product.price.toFixed(2)} <span className="text-sm">ر.س</span>
                      </p>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span className="text-sm font-bold">{product.quantity}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart Section */}
          <div className="space-y-4">
            <Card className="card-elegant sticky top-4">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">السلة</h2>
                <span className="mr-auto bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
                  {cart.length}
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">السلة فارغة</p>
                    <p className="text-sm">اختر المنتجات لإضافتها</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-accent/50 rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-base mb-1">{item.name}</h4>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">السعر:</span>
                              <span className="font-bold text-primary">
                                {item.price.toFixed(2)} ر.س
                              </span>
                            </div>
                            {item.discount_percentage > 0 && (
                              <div className="flex items-center gap-2 text-sm text-green-600">
                                <Percent className="w-3 h-3" />
                                <span>خصم {item.discount_percentage}%</span>
                                <span>(-{item.discount_amount.toFixed(2)} ر.س)</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">الإجمالي:</span>
                              <span className="font-bold">
                                {(item.line_total * 1.15).toFixed(2)} ر.س
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            onClick={() =>
                              updateQuantity(item.id, item.cartQuantity - 1)
                            }
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-12 text-center font-bold text-lg">
                            {item.cartQuantity}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            onClick={() =>
                              updateQuantity(item.id, item.cartQuantity + 1)
                            }
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        {item.allow_discount && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={item.max_discount_percentage || 100}
                              value={item.discount_percentage}
                              onChange={(e) =>
                                updateDiscount(item.id, parseFloat(e.target.value) || 0)
                              }
                              className="w-20 h-9 text-center"
                              placeholder="0%"
                            />
                            <Percent className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-3">
                    <div className="flex justify-between text-base">
                      <span className="text-muted-foreground">المجموع الفرعي:</span>
                      <span className="font-medium">{calculateTotal().subtotal.toFixed(2)} ر.س</span>
                    </div>
                    {calculateTotal().discount > 0 && (
                      <div className="flex justify-between text-base text-green-600">
                        <div className="flex items-center gap-1">
                          <Percent className="w-4 h-4" />
                          <span>الخصم:</span>
                        </div>
                        <span className="font-medium">-{calculateTotal().discount.toFixed(2)} ر.س</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base">
                      <span className="text-muted-foreground">الضريبة (15%):</span>
                      <span className="font-medium">{calculateTotal().taxAmount.toFixed(2)} ر.س</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-2xl font-bold">
                      <span>الإجمالي:</span>
                      <span className="text-primary">
                        {calculateTotal().total.toFixed(2)} ر.س
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">طريقة الدفع</label>
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

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 btn-medical"
                      onClick={handleCheckout}
                      disabled={!currentSession}
                    >
                      إتمام عملية البيع
                    </Button>
                    {lastInvoice && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePrint}
                        title="طباعة آخر فاتورة"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </>
              )}

              {cart.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>السلة فارغة</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Hidden Receipt for Printing */}
        {lastInvoice && (
          <div style={{ display: "none" }}>
            <POSReceipt
              ref={receiptRef}
              invoiceNumber={lastInvoice.invoiceNumber}
              invoiceDate={lastInvoice.invoiceDate}
              items={lastInvoice.items}
              subtotal={lastInvoice.subtotal}
              taxAmount={lastInvoice.taxAmount}
              totalAmount={lastInvoice.totalAmount}
              paymentMethod={lastInvoice.paymentMethod}
              companyInfo={companyInfo}
            />
          </div>
        )}

        {/* Session Dialog */}
        <POSSessionDialog
          open={sessionDialogOpen}
          onOpenChange={setSessionDialogOpen}
          currentSession={currentSession}
          onSessionUpdate={fetchCurrentSession}
        />
      </div>
    </div>
  );
};

export default POS;
