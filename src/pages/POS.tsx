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
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  quantity: number;
}

interface CartItem extends Product {
  cartQuantity: number;
  uom_id?: string;
  tax_code?: string;
}

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  name_en: string;
  is_active: boolean;
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
        .select("*")
        .eq("is_active", true)
        .gt("quantity", 0);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
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
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, cartQuantity: 1 }]);
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
      cart.map((item) =>
        item.id === productId ? { ...item, cartQuantity: newQuantity } : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  };

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
      const subtotal = calculateTotal();
      const taxRate = 0.15; // 15% VAT
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      // إنشاء فاتورة المبيعات
      const { data: invoiceData, error: invoiceError } = await (supabase as any)
        .from("sales_invoices")
        .insert({
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString(),
          customer_id: null, // Walk-in customer
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          payment_status: "paid",
          status: "posted",
          created_by: user?.id,
          posted_by: user?.id,
          posted_at: new Date().toISOString(),
          pos_session_id: currentSession.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // إضافة تفاصيل الفاتورة
      const invoiceItems = cart.map((item, index) => ({
        si_id: invoiceData.id,
        line_no: index + 1,
        item_id: item.id,
        uom_id: item.uom_id || null,
        qty: item.cartQuantity,
        price: item.price,
        discount: 0,
        tax_code: item.tax_code || null,
        line_total: item.price * item.cartQuantity,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("si_items")
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
          await (supabase as any)
            .from("sales_invoices")
            .delete()
            .eq("id", invoiceData.id);
          
          await (supabase as any)
            .from("si_items")
            .delete()
            .eq("si_id", invoiceData.id);

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
          expected_cash: (currentSession.expected_cash || currentSession.opening_cash) + totalAmount,
        })
        .eq("id", currentSession.id);

      // التكامل المحاسبي التلقائي
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-journal-entry`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              document_type: "sales_invoice",
              document_id: invoiceData.id,
              document_number: invoiceNumber,
              entity_id: null,
              entity_type: "customer",
              subtotal,
              tax_amount: taxAmount,
              total_amount: totalAmount,
            }),
          }
        );

        if (!response.ok) {
          console.error("Failed to generate journal entry");
        }
      } catch (error) {
        console.error("Error calling journal entry function:", error);
      }

      // حفظ آخر فاتورة للطباعة
      setLastInvoice({
        invoiceNumber,
        invoiceDate: new Date().toISOString(),
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.cartQuantity,
          price: item.price,
          total: item.price * item.cartQuantity,
        })),
        subtotal,
        taxAmount,
        totalAmount,
        paymentMethod: paymentMethods.find((pm) => pm.id === selectedPaymentMethod)?.name || "",
      });

      toast({
        title: "تمت العملية بنجاح",
        description: `رقم الفاتورة: ${invoiceNumber}`,
      });

      setCart([]);
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
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ابحث عن منتج بالاسم أو الباركود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 input-medical"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="card-elegant cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => addToCart(product)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        الباركود: {product.barcode}
                      </p>
                      <p className="text-lg font-bold text-primary">
                        {product.price.toFixed(2)} ر.س
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground">المخزون</p>
                      <p className="text-lg font-bold">{product.quantity}</p>
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
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{item.name}</h4>
                      <p className="text-sm text-primary font-bold">
                        {item.price.toFixed(2)} ر.س
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.id, item.cartQuantity - 1)
                        }
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-bold">
                        {item.cartQuantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.id, item.cartQuantity + 1)
                        }
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {cart.length > 0 && (
                <>
                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>الإجمالي</span>
                      <span className="text-primary">
                        {calculateTotal().toFixed(2)} ر.س
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
