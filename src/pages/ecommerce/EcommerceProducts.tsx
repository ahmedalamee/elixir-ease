import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export default function EcommerceProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [formData, setFormData] = useState({
    product_id: "",
    category_id: "",
    retail_price: "",
    wholesale_price: "",
    description: "",
    is_featured: false,
    is_available: true,
    min_wholesale_qty: "1",
  });

  const { data: ecommerceProducts, isLoading } = useQuery({
    queryKey: ["ecommerce-products", search, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("ecommerce_products")
        .select(`
          *,
          product:products(id, name, name_en, barcode, sku),
          category:ecommerce_categories(id, name)
        `)
        .order("created_at", { ascending: false });

      if (categoryFilter !== "all") {
        query = query.eq("category_id", categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      if (search) {
        return data.filter((p: any) => 
          p.product?.name?.includes(search) || 
          p.product?.barcode?.includes(search) ||
          p.product?.sku?.includes(search)
        );
      }
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["ecommerce-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecommerce_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-for-ecommerce"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, name_en, barcode, sku, price")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingProduct) {
        const { error } = await supabase
          .from("ecommerce_products")
          .update(data)
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ecommerce_products").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-products"] });
      toast.success(editingProduct ? "تم تحديث المنتج" : "تم إضافة المنتج للمتجر");
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || "فشل حفظ المنتج");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ecommerce_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-products"] });
      toast.success("تم حذف المنتج من المتجر");
    },
    onError: () => {
      toast.error("فشل حذف المنتج");
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase
        .from("ecommerce_products")
        .update({ is_featured })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-products"] });
    },
  });

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingProduct(null);
    setFormData({
      product_id: "",
      category_id: "",
      retail_price: "",
      wholesale_price: "",
      description: "",
      is_featured: false,
      is_available: true,
      min_wholesale_qty: "1",
    });
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      product_id: product.product_id,
      category_id: product.category_id || "",
      retail_price: product.retail_price?.toString() || "",
      wholesale_price: product.wholesale_price?.toString() || "",
      description: product.description || "",
      is_featured: product.is_featured,
      is_available: product.is_available,
      min_wholesale_qty: product.min_wholesale_qty?.toString() || "1",
    });
    setShowAddDialog(true);
  };

  const handleSave = () => {
    if (!formData.product_id || !formData.retail_price) {
      toast.error("يرجى اختيار منتج وتحديد السعر");
      return;
    }

    saveMutation.mutate({
      product_id: formData.product_id,
      category_id: formData.category_id || null,
      retail_price: parseFloat(formData.retail_price),
      wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : null,
      description: formData.description || null,
      is_featured: formData.is_featured,
      is_available: formData.is_available,
      min_wholesale_qty: parseInt(formData.min_wholesale_qty) || 1,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">منتجات المتجر الإلكتروني</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة منتج
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الباركود..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المنتج</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead>سعر التجزئة</TableHead>
                <TableHead>سعر الجملة</TableHead>
                <TableHead>مميز</TableHead>
                <TableHead>متاح</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : ecommerceProducts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    لا توجد منتجات
                  </TableCell>
                </TableRow>
              ) : (
                ecommerceProducts?.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.product?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.product?.sku || product.product?.barcode}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category?.name || (
                        <span className="text-muted-foreground">بدون فئة</span>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(product.retail_price)}</TableCell>
                    <TableCell>
                      {product.wholesale_price ? formatCurrency(product.wholesale_price) : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          toggleFeaturedMutation.mutate({
                            id: product.id,
                            is_featured: !product.is_featured,
                          })
                        }
                      >
                        <Star
                          className={`h-4 w-4 ${
                            product.is_featured ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_available ? "default" : "secondary"}>
                        {product.is_available ? "متاح" : "غير متاح"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(product.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "تعديل منتج" : "إضافة منتج للمتجر"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>المنتج *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(v) => {
                  const prod = products?.find((p) => p.id === v);
                  setFormData({
                    ...formData,
                    product_id: v,
                    retail_price: prod?.price?.toString() || formData.retail_price,
                  });
                }}
                disabled={!!editingProduct}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر منتج" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((prod) => (
                    <SelectItem key={prod.id} value={prod.id}>
                      {prod.name} {prod.sku ? `(${prod.sku})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الفئة</Label>
              <Select
                value={formData.category_id}
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر فئة" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>سعر التجزئة *</Label>
                <Input
                  type="number"
                  value={formData.retail_price}
                  onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>سعر الجملة</Label>
                <Input
                  type="number"
                  value={formData.wholesale_price}
                  onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الحد الأدنى لطلب الجملة</Label>
              <Input
                type="number"
                value={formData.min_wholesale_qty}
                onChange={(e) => setFormData({ ...formData, min_wholesale_qty: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>وصف المنتج</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })}
                />
                <Label>منتج مميز</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(v) => setFormData({ ...formData, is_available: v })}
                />
                <Label>متاح للبيع</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
