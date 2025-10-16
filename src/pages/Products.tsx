import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { productSchema } from "@/lib/validation";
import { z } from "zod";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ArrowRight,
  Package,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  name: string;
  name_en?: string;
  barcode?: string;
  price: number;
  cost_price: number;
  quantity: number;
  min_quantity: number;
  expiry_date?: string;
  description?: string;
  is_active: boolean;
}

const Products = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    barcode: "",
    price: "",
    cost_price: "",
    quantity: "",
    min_quantity: "10",
    expiry_date: "",
    description: "",
  });

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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery) ||
      p.name_en?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate input data using zod schema
      const validatedData = productSchema.parse({
        name: formData.name.trim(),
        name_en: formData.name_en.trim() || null,
        barcode: formData.barcode.trim() || null,
        price: parseFloat(formData.price),
        cost_price: parseFloat(formData.cost_price),
        quantity: parseInt(formData.quantity),
        min_quantity: parseInt(formData.min_quantity),
        expiry_date: formData.expiry_date || null,
        description: formData.description.trim() || null,
      });

      const productData: any = {
        ...validatedData,
        is_active: true,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast({ title: "تم تحديث المنتج بنجاح" });
      } else {
        const { error } = await supabase.from("products").insert([productData]);

        if (error) throw error;
        toast({ title: "تم إضافة المنتج بنجاح" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "خطأ في التحقق من البيانات",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطأ",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      name_en: product.name_en || "",
      barcode: product.barcode || "",
      price: product.price.toString(),
      cost_price: product.cost_price.toString(),
      quantity: product.quantity.toString(),
      min_quantity: product.min_quantity.toString(),
      expiry_date: product.expiry_date || "",
      description: product.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج?")) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "تم حذف المنتج بنجاح" });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_en: "",
      barcode: "",
      price: "",
      cost_price: "",
      quantity: "",
      min_quantity: "10",
      expiry_date: "",
      description: "",
    });
    setEditingProduct(null);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Package className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">إدارة المنتجات</h1>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-medical gap-2" onClick={resetForm}>
                  <Plus className="w-4 h-4" />
                  إضافة منتج جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم المنتج (عربي) *</Label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="input-medical"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>اسم المنتج (إنجليزي)</Label>
                      <Input
                        value={formData.name_en}
                        onChange={(e) =>
                          setFormData({ ...formData, name_en: e.target.value })
                        }
                        className="input-medical"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الباركود</Label>
                      <Input
                        value={formData.barcode}
                        onChange={(e) =>
                          setFormData({ ...formData, barcode: e.target.value })
                        }
                        className="input-medical"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>سعر البيع (ر.س) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        className="input-medical"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>سعر التكلفة (ر.س) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        value={formData.cost_price}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cost_price: e.target.value,
                          })
                        }
                        className="input-medical"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الكمية *</Label>
                      <Input
                        type="number"
                        required
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData({ ...formData, quantity: e.target.value })
                        }
                        className="input-medical"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الحد الأدنى للمخزون *</Label>
                      <Input
                        type="number"
                        required
                        value={formData.min_quantity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            min_quantity: e.target.value,
                          })
                        }
                        className="input-medical"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ انتهاء الصلاحية</Label>
                      <Input
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            expiry_date: e.target.value,
                          })
                        }
                        className="input-medical"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>الوصف</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="input-medical"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button type="submit" className="btn-medical">
                      {editingProduct ? "تحديث" : "إضافة"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ابحث عن منتج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 input-medical"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="card-elegant">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{product.name}</h3>
                    {product.name_en && (
                      <p className="text-sm text-muted-foreground">
                        {product.name_en}
                      </p>
                    )}
                  </div>
                  {product.quantity <= product.min_quantity && (
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  )}
                </div>

                {product.barcode && (
                  <p className="text-sm text-muted-foreground">
                    الباركود: {product.barcode}
                  </p>
                )}

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">سعر البيع</p>
                    <p className="text-lg font-bold text-primary">
                      {product.price.toFixed(2)} ر.س
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">المخزون</p>
                    <p
                      className={`text-lg font-bold ${
                        product.quantity <= product.min_quantity
                          ? "text-orange-500"
                          : "text-foreground"
                      }`}
                    >
                      {product.quantity}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="w-4 h-4" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">لا توجد منتجات</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;
