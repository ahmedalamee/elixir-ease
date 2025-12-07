import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { productSchema } from "@/lib/validation";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
} from "lucide-react";
import { ProductImageUpload, ProductImage } from "@/components/products";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

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
  base_uom_id?: string;
  category_id?: string;
  manufacturer_id?: string;
}

interface UOM {
  id: string;
  name: string;
  name_en?: string;
  symbol?: string;
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
}

interface Manufacturer {
  id: string;
  name: string;
  name_en?: string;
}

interface Tax {
  tax_code: string;
  name: string;
  name_en?: string;
  rate: number;
  is_active: boolean;
}

const Products = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    sku: "",
    barcode: "",
    price: "",
    cost_price: "",
    quantity: "",
    min_quantity: "10",
    reorder_level: "",
    expiry_date: "",
    alert_months_before_expiry: "3",
    description: "",
    base_uom_id: "",
    category_id: "",
    manufacturer_id: "",
    default_tax: "",
    discount_type: "percentage",
    discount_value: "",
    min_price: "",
    profit_margin: "",
    track_inventory: true,
    image_url: "",
  });

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
    try {
      const [productsRes, uomsRes, categoriesRes, manufacturersRes, taxesRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("uoms").select("*").order("name", { ascending: true }),
        supabase.from("categories").select("*").order("name", { ascending: true }),
        supabase.from("manufacturers").select("*").eq("is_active", true).order("name", { ascending: true }),
        supabase.from("taxes").select("*").eq("is_active", true),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (uomsRes.error) throw uomsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (manufacturersRes.error) throw manufacturersRes.error;
      if (taxesRes.error) throw taxesRes.error;

      setProducts(productsRes.data || []);
      setUoms(uomsRes.data || []);
      setCategories(categoriesRes.data || []);
      setManufacturers(manufacturersRes.data || []);
      setTaxes(taxesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل البيانات",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery) ||
      p.name_en?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchesManufacturer = !selectedManufacturer || p.manufacturer_id === selectedManufacturer;
    const matchesStatus = !selectedStatus || 
      (selectedStatus === "active" && p.is_active) ||
      (selectedStatus === "inactive" && !p.is_active);

    return matchesSearch && matchesCategory && matchesManufacturer && matchesStatus;
  });

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

      // Check for duplicate barcode/SKU
      if (validatedData.barcode) {
        const { data: existingProducts } = await supabase
          .from("products")
          .select("id, barcode")
          .eq("barcode", validatedData.barcode);

        if (existingProducts && existingProducts.length > 0) {
          // If editing, allow same barcode for the same product
          if (!editingProduct || existingProducts[0].id !== editingProduct.id) {
            toast({
              title: "خطأ",
              description: "الباركود موجود بالفعل لمنتج آخر",
              variant: "destructive",
            });
            return;
          }
        }
      }

      const productData: any = {
        ...validatedData,
        is_active: true,
        base_uom_id: formData.base_uom_id || null,
        category_id: formData.category_id || null,
        manufacturer_id: formData.manufacturer_id || null,
        sku: formData.sku.trim() || null,
        reorder_level: formData.reorder_level ? parseFloat(formData.reorder_level) : null,
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
      fetchData();
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
      sku: (product as any).sku || "",
      barcode: product.barcode || "",
      price: product.price.toString(),
      cost_price: product.cost_price.toString(),
      quantity: product.quantity.toString(),
      min_quantity: product.min_quantity.toString(),
      reorder_level: (product as any).reorder_level?.toString() || "",
      expiry_date: product.expiry_date || "",
      alert_months_before_expiry: "3",
      description: product.description || "",
      base_uom_id: product.base_uom_id || "",
      category_id: product.category_id || "",
      manufacturer_id: product.manufacturer_id || "",
      default_tax: "",
      discount_type: "percentage",
      discount_value: "",
      min_price: "",
      profit_margin: "",
      track_inventory: true,
      image_url: (product as any).image_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج?")) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "تم حذف المنتج بنجاح" });
      fetchData();
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
      sku: "",
      barcode: "",
      price: "",
      cost_price: "",
      quantity: "",
      min_quantity: "10",
      reorder_level: "",
      expiry_date: "",
      alert_months_before_expiry: "3",
      description: "",
      base_uom_id: "",
      category_id: "",
      manufacturer_id: "",
      default_tax: "",
      discount_type: "percentage",
      discount_value: "",
      min_price: "",
      profit_margin: "",
      track_inventory: true,
      image_url: "",
    });
    setEditingProduct(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">إدارة المنتجات</h2>
                <p className="text-muted-foreground">إضافة وتعديل وحذف المنتجات</p>
              </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-medical gap-2" onClick={resetForm}>
                  <Plus className="w-4 h-4" />
                  إضافة منتج جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="details">تفاصيل البند</TabsTrigger>
                      <TabsTrigger value="pricing">تفاصيل التسعير</TabsTrigger>
                      <TabsTrigger value="inventory">إدارة المخزون</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>
                            الاسم <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            required
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder="ادخل اسم المنتج بالعربية"
                            className="input-medical"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>الرقم التسلسلي SKU</Label>
                          <Input
                            value={formData.sku}
                            onChange={(e) =>
                              setFormData({ ...formData, sku: e.target.value })
                            }
                            placeholder="000001"
                            className="input-medical"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>الوصف</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                          }
                          placeholder="أدخل وصف المنتج"
                          className="input-medical min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>صورة المنتج</Label>
                        <ProductImageUpload
                          currentImageUrl={formData.image_url}
                          onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                          onImageRemoved={() => setFormData({ ...formData, image_url: "" })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>التصنيف</Label>
                          <Select
                            value={formData.category_id}
                            onValueChange={(value) =>
                              setFormData({ ...formData, category_id: value })
                            }
                          >
                            <SelectTrigger className="input-medical">
                              <SelectValue placeholder="اختر التصنيف" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>الماركة</Label>
                          <Select
                            value={formData.manufacturer_id}
                            onValueChange={(value) =>
                              setFormData({ ...formData, manufacturer_id: value })
                            }
                          >
                            <SelectTrigger className="input-medical">
                              <SelectValue placeholder="اختر الماركة" />
                            </SelectTrigger>
                            <SelectContent>
                              {manufacturers.map((man) => (
                                <SelectItem key={man.id} value={man.id}>
                                  {man.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="pricing" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>سعر الشراء</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.cost_price}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                cost_price: e.target.value,
                              })
                            }
                            placeholder="0.00"
                            className="input-medical"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            سعر البيع <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            required
                            value={formData.price}
                            onChange={(e) =>
                              setFormData({ ...formData, price: e.target.value })
                            }
                            placeholder="0.00"
                            className="input-medical"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>الضريبة 1</Label>
                          <Select
                            value={formData.default_tax}
                            onValueChange={(value) =>
                              setFormData({ ...formData, default_tax: value })
                            }
                          >
                            <SelectTrigger className="input-medical">
                              <SelectValue placeholder="اختر ضريبة" />
                            </SelectTrigger>
                            <SelectContent>
                              {taxes.map((tax) => (
                                <SelectItem key={tax.tax_code} value={tax.tax_code}>
                                  {tax.name} ({tax.rate}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>متقدم</Label>
                          <Input
                            disabled
                            placeholder="متقدم"
                            className="input-medical"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>نوع الخصم</Label>
                          <Select
                            value={formData.discount_type}
                            onValueChange={(value) =>
                              setFormData({ ...formData, discount_type: value })
                            }
                          >
                            <SelectTrigger className="input-medical">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="fixed">ر.س</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>الخصم</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.discount_value}
                            onChange={(e) =>
                              setFormData({ ...formData, discount_value: e.target.value })
                            }
                            placeholder="0"
                            className="input-medical"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>أقل سعر بيع</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.min_price}
                            onChange={(e) =>
                              setFormData({ ...formData, min_price: e.target.value })
                            }
                            placeholder="0.00"
                            className="input-medical"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>هامش الربح نسبة مئوية</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.profit_margin}
                            onChange={(e) =>
                              setFormData({ ...formData, profit_margin: e.target.value })
                            }
                            placeholder="0.00"
                            className="input-medical"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="inventory" className="space-y-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>باركود</Label>
                          <div className="flex gap-2">
                            <Input
                              value={formData.barcode}
                              onChange={(e) =>
                                setFormData({ ...formData, barcode: e.target.value })
                              }
                              placeholder="ادخل الباركود"
                              className="input-medical flex-1"
                            />
                            <Button type="button" variant="outline" size="icon">
                              <Package className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="font-semibold">إدارة المخزون</div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                              id="track_inventory"
                              checked={formData.track_inventory}
                              onCheckedChange={(checked) =>
                                setFormData({
                                  ...formData,
                                  track_inventory: checked as boolean,
                                })
                              }
                            />
                            <Label htmlFor="track_inventory" className="cursor-pointer">
                              تتبع المخزون
                            </Label>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>الكمية بالمخزون؟</Label>
                            <Input
                              type="number"
                              value={formData.quantity}
                              onChange={(e) =>
                                setFormData({ ...formData, quantity: e.target.value })
                              }
                              placeholder="0"
                              className="input-medical"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>تنبيه عند وصول الكمية إلى أقل من؟</Label>
                            <Input
                              type="number"
                              value={formData.min_quantity}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  min_quantity: e.target.value,
                                })
                              }
                              placeholder="0"
                              className="input-medical"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>نقطة إعادة الطلب</Label>
                            <Input
                              type="number"
                              value={formData.reorder_level}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  reorder_level: e.target.value,
                                })
                              }
                              placeholder="0"
                              className="input-medical"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>وحدة القياس</Label>
                            <Select
                              value={formData.base_uom_id}
                              onValueChange={(value) =>
                                setFormData({ ...formData, base_uom_id: value })
                              }
                            >
                              <SelectTrigger className="input-medical">
                                <SelectValue placeholder="اختر وحدة القياس" />
                              </SelectTrigger>
                              <SelectContent>
                                {uoms.map((uom) => (
                                  <SelectItem key={uom.id} value={uom.id}>
                                    {uom.name} {uom.symbol && `(${uom.symbol})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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
                          <div className="space-y-2">
                            <Label>فترة التنبيه (بالأشهر)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={formData.alert_months_before_expiry}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  alert_months_before_expiry: e.target.value,
                                })
                              }
                              placeholder="3"
                              className="input-medical"
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
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
            
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="البحث بكلمة مفتاحية - ادخل الاسم أو الكود"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 input-medical"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>التصنيف</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="input-medical">
                      <SelectValue placeholder="[جميع التصنيفات]" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع التصنيفات</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الماركة</Label>
                  <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
                    <SelectTrigger className="input-medical">
                      <SelectValue placeholder="[جميع الماركات]" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الماركات</SelectItem>
                      {manufacturers.map((man) => (
                        <SelectItem key={man.id} value={man.id}>
                          {man.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="input-medical">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="inactive">غير نشط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("");
                      setSelectedManufacturer("");
                      setSelectedStatus("");
                    }}
                  >
                    إلغاء الفلتر
                  </Button>
                  <Button className="flex-1 btn-medical">
                    بحث
                  </Button>
                </div>
              </div>
            </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="card-elegant">
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <ProductImage 
                    imageUrl={(product as any).image_url} 
                    productName={product.name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg truncate">{product.name}</h3>
                        {product.name_en && (
                          <p className="text-sm text-muted-foreground truncate">
                            {product.name_en}
                          </p>
                        )}
                      </div>
                      {product.quantity <= product.min_quantity && (
                        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
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
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Products;
