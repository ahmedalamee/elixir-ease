import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  Barcode,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  name_en?: string;
  sku?: string;
  barcode?: string;
  generic_name?: string;
  strength?: string;
  form?: string;
  price: number;
  cost_price: number;
  quantity: number;
  min_quantity: number;
  manufacturer_id?: string;
  therapeutic_class_id?: string;
  base_uom_id?: string;
  sellable: boolean;
  is_controlled: boolean;
  status: string;
  expiry_date?: string;
  description?: string;
}

interface Manufacturer {
  id: string;
  name: string;
  name_en?: string;
}

interface TherapeuticClass {
  id: string;
  name: string;
  code?: string;
}

interface UOM {
  id: string;
  name: string;
  symbol: string;
}

interface ProductBatch {
  id: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  cost_price: number;
  is_expired: boolean;
}

const PRODUCT_FORMS = [
  { value: "tablet", label: "قرص" },
  { value: "capsule", label: "كبسولة" },
  { value: "syrup", label: "شراب" },
  { value: "injection", label: "حقن" },
  { value: "cream", label: "كريم" },
  { value: "ointment", label: "مرهم" },
  { value: "drops", label: "نقط" },
  { value: "inhaler", label: "بخاخ" },
  { value: "suppository", label: "لبوس" },
  { value: "powder", label: "بودرة" },
  { value: "solution", label: "محلول" },
  { value: "suspension", label: "معلق" },
  { value: "other", label: "أخرى" },
];

const ProductsAdvanced = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [therapeuticClasses, setTherapeuticClasses] = useState<TherapeuticClass[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    sku: "",
    barcode: "",
    generic_name: "",
    strength: "",
    form: "",
    price: "",
    cost_price: "",
    quantity: "",
    min_quantity: "10",
    manufacturer_id: "",
    therapeutic_class_id: "",
    base_uom_id: "",
    sellable: true,
    is_controlled: false,
    status: "active",
    expiry_date: "",
    description: "",
  });

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchData = async () => {
    try {
      const [productsRes, manufacturersRes, classesRes, uomsRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("manufacturers").select("*").eq("is_active", true),
        supabase.from("therapeutic_classes").select("*"),
        supabase.from("uoms").select("*"),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (manufacturersRes.error) throw manufacturersRes.error;
      if (classesRes.error) throw classesRes.error;
      if (uomsRes.error) throw uomsRes.error;

      setProducts(productsRes.data || []);
      setManufacturers(manufacturersRes.data || []);
      setTherapeuticClasses(classesRes.data || []);
      setUoms(uomsRes.data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchBatches = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from("product_batches")
        .select("*")
        .eq("product_id", productId)
        .order("expiry_date", { ascending: true });

      if (error) throw error;
      setBatches(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.includes(searchQuery) ||
      p.barcode?.includes(searchQuery) ||
      p.name_en?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const productData: any = {
        name: formData.name.trim(),
        name_en: formData.name_en.trim() || null,
        sku: formData.sku.trim() || null,
        barcode: formData.barcode.trim() || null,
        generic_name: formData.generic_name.trim() || null,
        strength: formData.strength.trim() || null,
        form: formData.form || null,
        price: parseFloat(formData.price),
        cost_price: parseFloat(formData.cost_price),
        quantity: parseInt(formData.quantity),
        min_quantity: parseInt(formData.min_quantity),
        manufacturer_id: formData.manufacturer_id || null,
        therapeutic_class_id: formData.therapeutic_class_id || null,
        base_uom_id: formData.base_uom_id || null,
        sellable: formData.sellable,
        is_controlled: formData.is_controlled,
        status: formData.status,
        expiry_date: formData.expiry_date || null,
        description: formData.description.trim() || null,
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
      fetchData();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      name_en: product.name_en || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      generic_name: product.generic_name || "",
      strength: product.strength || "",
      form: product.form || "",
      price: product.price.toString(),
      cost_price: product.cost_price.toString(),
      quantity: product.quantity.toString(),
      min_quantity: product.min_quantity.toString(),
      manufacturer_id: product.manufacturer_id || "",
      therapeutic_class_id: product.therapeutic_class_id || "",
      base_uom_id: product.base_uom_id || "",
      sellable: product.sellable,
      is_controlled: product.is_controlled,
      status: product.status,
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
      generic_name: "",
      strength: "",
      form: "",
      price: "",
      cost_price: "",
      quantity: "",
      min_quantity: "10",
      manufacturer_id: "",
      therapeutic_class_id: "",
      base_uom_id: "",
      sellable: true,
      is_controlled: false,
      status: "active",
      expiry_date: "",
      description: "",
    });
    setEditingProduct(null);
  };

  const viewBatches = (productId: string) => {
    setSelectedProductId(productId);
    fetchBatches(productId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">إدارة المنتجات المتقدمة</h2>
                <p className="text-muted-foreground">
                  إدارة كاملة للأصناف مع الدفعات والأسعار المتعددة
                </p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={resetForm}>
                    <Plus className="w-4 h-4" />
                    إضافة منتج جديد
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="max-w-4xl max-h-[90vh] overflow-y-auto"
                  dir="rtl"
                >
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Tabs defaultValue="basic" dir="rtl">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basic">المعلومات الأساسية</TabsTrigger>
                        <TabsTrigger value="medical">المعلومات الطبية</TabsTrigger>
                        <TabsTrigger value="pricing">الأسعار والمخزون</TabsTrigger>
                      </TabsList>

                      <TabsContent value="basic" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>اسم المنتج (عربي) *</Label>
                            <Input
                              required
                              value={formData.name}
                              onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>اسم المنتج (إنجليزي)</Label>
                            <Input
                              value={formData.name_en}
                              onChange={(e) =>
                                setFormData({ ...formData, name_en: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>رمز المنتج (SKU)</Label>
                            <Input
                              value={formData.sku}
                              onChange={(e) =>
                                setFormData({ ...formData, sku: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>الباركود</Label>
                            <Input
                              value={formData.barcode}
                              onChange={(e) =>
                                setFormData({ ...formData, barcode: e.target.value })
                              }
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
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="medical" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>الاسم العلمي</Label>
                            <Input
                              value={formData.generic_name}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  generic_name: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>التركيز</Label>
                            <Input
                              value={formData.strength}
                              onChange={(e) =>
                                setFormData({ ...formData, strength: e.target.value })
                              }
                              placeholder="مثال: 500mg"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>الشكل الصيدلاني</Label>
                            <Select
                              value={formData.form}
                              onValueChange={(value) =>
                                setFormData({ ...formData, form: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الشكل" />
                              </SelectTrigger>
                              <SelectContent>
                                {PRODUCT_FORMS.map((form) => (
                                  <SelectItem key={form.value} value={form.value}>
                                    {form.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>المصنّع</Label>
                            <Select
                              value={formData.manufacturer_id}
                              onValueChange={(value) =>
                                setFormData({ ...formData, manufacturer_id: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر المصنّع" />
                              </SelectTrigger>
                              <SelectContent>
                                {manufacturers.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>التصنيف العلاجي</Label>
                            <Select
                              value={formData.therapeutic_class_id}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  therapeutic_class_id: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر التصنيف" />
                              </SelectTrigger>
                              <SelectContent>
                                {therapeuticClasses.map((tc) => (
                                  <SelectItem key={tc.id} value={tc.id}>
                                    {tc.name} {tc.code && `(${tc.code})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>وحدة القياس الأساسية</Label>
                            <Select
                              value={formData.base_uom_id}
                              onValueChange={(value) =>
                                setFormData({ ...formData, base_uom_id: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الوحدة" />
                              </SelectTrigger>
                              <SelectContent>
                                {uoms.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.name} ({u.symbol})
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
                            <Label>سعر البيع (ر.س) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              required
                              value={formData.price}
                              onChange={(e) =>
                                setFormData({ ...formData, price: e.target.value })
                              }
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
                                setFormData({ ...formData, cost_price: e.target.value })
                              }
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
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>الحالة</Label>
                            <Select
                              value={formData.status}
                              onValueChange={(value) =>
                                setFormData({ ...formData, status: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">نشط</SelectItem>
                                <SelectItem value="inactive">غير نشط</SelectItem>
                                <SelectItem value="discontinued">متوقف</SelectItem>
                                <SelectItem value="pending">قيد الانتظار</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex gap-2 justify-end pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        إلغاء
                      </Button>
                      <Button type="submit">
                        {editingProduct ? "تحديث" : "إضافة"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="ابحث عن منتج (الاسم، SKU، الباركود)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">SKU</TableHead>
                    <TableHead className="text-right">الشكل</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">المخزون</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-bold">{product.name}</p>
                          {product.name_en && (
                            <p className="text-sm text-muted-foreground">
                              {product.name_en}
                            </p>
                          )}
                          {product.generic_name && (
                            <p className="text-xs text-muted-foreground">
                              {product.generic_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {product.sku && (
                            <Badge variant="outline">{product.sku}</Badge>
                          )}
                          {product.barcode && (
                            <Barcode className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.form &&
                          PRODUCT_FORMS.find((f) => f.value === product.form)
                            ?.label}
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {product.price.toFixed(2)} ر.س
                      </TableCell>
                      <TableCell>
                        <div
                          className={`font-bold ${
                            product.quantity <= product.min_quantity
                              ? "text-orange-500"
                              : ""
                          }`}
                        >
                          {product.quantity}
                          {product.quantity <= product.min_quantity && (
                            <AlertTriangle className="inline w-4 h-4 mr-1" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.status === "active" ? "default" : "secondary"
                          }
                        >
                          {product.status === "active" && "نشط"}
                          {product.status === "inactive" && "غير نشط"}
                          {product.status === "discontinued" && "متوقف"}
                          {product.status === "pending" && "قيد الانتظار"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewBatches(product.id)}
                          >
                            <Package className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">لا توجد منتجات</p>
              </div>
            )}
          </div>
        </Card>

        {selectedProductId && (
          <Card className="mt-6">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">
                دفعات المنتج (FEFO - الأقرب للانتهاء أولاً)
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الدفعة</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                    <TableHead className="text-right">سعر التكلفة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow
                      key={batch.id}
                      className={batch.is_expired ? "bg-red-50" : ""}
                    >
                      <TableCell className="font-medium">
                        {batch.batch_number}
                      </TableCell>
                      <TableCell>{batch.quantity}</TableCell>
                      <TableCell>
                        {new Date(batch.expiry_date).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>{batch.cost_price.toFixed(2)} ر.س</TableCell>
                      <TableCell>
                        {batch.is_expired ? (
                          <Badge variant="destructive">منتهي الصلاحية</Badge>
                        ) : (
                          <Badge variant="default">صالح</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {batches.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  لا توجد دفعات لهذا المنتج
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProductsAdvanced;
