import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import {
  ShoppingCart,
  Search,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  quantity: number;
}

interface CartItem extends Product {
  cartQuantity: number;
}

const POS = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");

  useEffect(() => {
    checkAuth();
    fetchProducts();
  }, []);

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

    try {
      const saleNumber = `SALE-${Date.now()}`;
      const totalAmount = calculateTotal();

      // إنشاء المبيعات
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .insert({
          sale_number: saleNumber,
          total_amount: totalAmount,
          final_amount: totalAmount,
          payment_method: paymentMethod,
          payment_status: "paid",
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // إضافة تفاصيل المبيعات
      const saleItems = cart.map((item) => ({
        sale_id: saleData.id,
        product_id: item.id,
        quantity: item.cartQuantity,
        unit_price: item.price,
        total: item.price * item.cartQuantity,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // تحديث المخزون
      for (const item of cart) {
        await supabase
          .from("products")
          .update({ quantity: item.quantity - item.cartQuantity })
          .eq("id", item.id);
      }

      toast({
        title: "تمت العملية بنجاح",
        description: `رقم الفاتورة: ${saleNumber}`,
      });

      setCart([]);
      fetchProducts();
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

                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={paymentMethod === "cash" ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => setPaymentMethod("cash")}
                    >
                      <Banknote className="w-4 h-4" />
                      نقداً
                    </Button>
                    <Button
                      variant={paymentMethod === "card" ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => setPaymentMethod("card")}
                    >
                      <CreditCard className="w-4 h-4" />
                      بطاقة
                    </Button>
                  </div>

                  <Button
                    className="w-full btn-medical"
                    onClick={handleCheckout}
                  >
                    إتمام عملية البيع
                  </Button>
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
      </div>
    </div>
  );
};

export default POS;
