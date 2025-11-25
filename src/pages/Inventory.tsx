import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, AlertTriangle, Calendar, Plus, Package, RotateCw, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface InventoryProduct {
  id: string;
  name: string;
  name_en: string | null;
  barcode: string | null;
  quantity: number;
  min_quantity: number;
  cost_price: number;
  price: number;
  expiry_date: string | null;
  is_active: boolean;
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

const Inventory = () => {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "expired">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    category_id: "",
    manufacturer_id: "",
    cost_price: "",
    price: "",
    default_tax: "",
    discount_type: "percentage",
    discount_value: "",
    min_price: "",
    profit_margin: "",
    barcode: "",
    track_inventory: true,
    quantity: "",
    min_quantity: "",
    reorder_level: "",
    base_uom_id: "",
    expiry_date: "",
    alert_months_before_expiry: "3",
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
        supabase.from("products").select("*").eq("is_active", true).order("quantity", { ascending: true }),
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
    } catch (error: any) {
      toast({
        title: "خطأ في تحميل البيانات",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return new Date(expiryDate) <= thirtyDaysFromNow && !isExpired(expiryDate);
  };

  const getStockStatus = (product: InventoryProduct) => {
    if (product.quantity === 0) {
      return { label: "نفذ", variant: "destructive" as const };
    }
    if (product.quantity <= product.min_quantity) {
      return { label: "منخفض", variant: "destructive" as const };
    }
    return { label: "متوفر", variant: "default" as const };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate required fields
      if (!formData.name || !formData.price) {
        toast({
          title: "خطأ",
          description: "الرجاء إدخال الاسم والسعر",
          variant: "destructive",
        });
        return;
      }

      // Check for duplicate barcode
      if (formData.barcode && formData.barcode.trim()) {
        const { data: existingProducts } = await supabase
          .from("products")
          .select("id, barcode")
          .eq("barcode", formData.barcode.trim());

        if (existingProducts && existingProducts.length > 0) {
          // Allow same barcode if editing the same product
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
        name: formData.name,
        sku: formData.sku || null,
        description: formData.description || null,
        category_id: formData.category_id || null,
        manufacturer_id: formData.manufacturer_id || null,
        cost_price: parseFloat(formData.cost_price) || 0,
        price: parseFloat(formData.price),
        barcode: formData.barcode || null,
        quantity: parseInt(formData.quantity) || 0,
        min_quantity: parseInt(formData.min_quantity) || 10,
        reorder_level: formData.reorder_level ? parseFloat(formData.reorder_level) : null,
        base_uom_id: formData.base_uom_id || null,
        expiry_date: formData.expiry_date || null,
        is_active: true,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast({ 
          title: "تم تحديث المنتج بنجاح",
          description: `تم تحديث ${formData.name}`
        });
      } else {
        const { error } = await supabase.from("products").insert([productData]);

        if (error) throw error;
        toast({ 
          title: "تم إضافة المنتج بنجاح",
          description: `تم إضافة ${formData.name} إلى المخزون`
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: InventoryProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: "",
      description: "",
      category_id: "",
      manufacturer_id: "",
      cost_price: product.cost_price.toString(),
      price: product.price.toString(),
      default_tax: "",
      discount_type: "percentage",
      discount_value: "",
      min_price: "",
      profit_margin: "",
      barcode: product.barcode || "",
      track_inventory: true,
      quantity: product.quantity.toString(),
      min_quantity: product.min_quantity.toString(),
      reorder_level: "",
      base_uom_id: "",
      expiry_date: product.expiry_date || "",
      alert_months_before_expiry: "3",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المنتج "${name}"؟`)) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ 
        title: "تم حذف المنتج بنجاح",
        description: `تم حذف ${name} من المخزون`
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "خطأ في الحذف",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      description: "",
      category_id: "",
      manufacturer_id: "",
      cost_price: "",
      price: "",
      default_tax: "",
      discount_type: "percentage",
      discount_value: "",
      min_price: "",
      profit_margin: "",
      barcode: "",
      track_inventory: true,
      quantity: "",
      min_quantity: "",
      reorder_level: "",
      base_uom_id: "",
      expiry_date: "",
      alert_months_before_expiry: "3",
    });
    setEditingProduct(null);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filter === "low") {
      return product.quantity <= product.min_quantity;
    }
    if (filter === "expired") {
      return isExpired(product.expiry_date) || isExpiringSoon(product.expiry_date);
    }
    return true;
  });

  const lowStockCount = products.filter(
    (p) => p.quantity <= p.min_quantity
  ).length;
  const expiredCount = products.filter(
    (p) => isExpired(p.expiry_date) || isExpiringSoon(p.expiry_date)
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                إجمالي المنتجات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                مخزون منخفض
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {lowStockCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-destructive" />
                منتهية أو قريبة الانتهاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {expiredCount}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>تقرير المخزون</CardTitle>
                <CardDescription>
                  متابعة حالة المخزون والمنتجات منتهية الصلاحية
                </CardDescription>
              </div>
              <Button 
                className="btn-medical gap-2"
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                إضافة
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث بالاسم أو الباركود..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="flex gap-2">
                <Badge
                  variant={filter === "all" ? "default" : "outline"}
                  className="cursor-pointer px-4 py-2"
                  onClick={() => setFilter("all")}
                >
                  الكل
                </Badge>
                <Badge
                  variant={filter === "low" ? "default" : "outline"}
                  className="cursor-pointer px-4 py-2"
                  onClick={() => setFilter("low")}
                >
                  مخزون منخفض
                </Badge>
                <Badge
                  variant={filter === "expired" ? "default" : "outline"}
                  className="cursor-pointer px-4 py-2"
                  onClick={() => setFilter("expired")}
                >
                  قريبة الانتهاء
                </Badge>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الباركود</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>الحد الأدنى</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ الانتهاء</TableHead>
                    <TableHead>القيمة الإجمالية</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product);
                    const expired = isExpired(product.expiry_date);
                    const expiringSoon = isExpiringSoon(product.expiry_date);

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>{product.barcode || "-"}</TableCell>
                        <TableCell>{product.quantity}</TableCell>
                        <TableCell>{product.min_quantity}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {product.expiry_date ? (
                            <div className="flex items-center gap-2">
                              {(expired || expiringSoon) && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                              <span
                                className={
                                  expired || expiringSoon
                                    ? "text-destructive"
                                    : ""
                                }
                              >
                                {new Date(product.expiry_date).toLocaleDateString(
                                  "ar-SA"
                                )}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {(product.cost_price * product.quantity).toFixed(2)}{" "}
                          ر.س
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product.id, product.name)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                        placeholder="ادخل اسم المنتج"
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
                          <RotateCw className="w-4 h-4" />
                        </Button>
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
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  إلغاء
                </Button>
                <Button type="submit" className="btn-medical">
                  حفظ
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Inventory;
