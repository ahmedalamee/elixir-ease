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
  Upload,
} from "lucide-react";
import { ExcelImportDialog, ColumnMapping } from "@/components/import";
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
  scientific_material_id?: string;
  preferred_supplier_id?: string;
  // Extended fields for display
  scientific_material_name?: string;
  alternatives_names?: string[];
  supplier_name?: string;
  // Stock summary fields
  total_stock?: number;
  locked_stock?: number;
  available_stock?: number;
  inbound_stock?: number;
  reserved_stock?: number;
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

interface ScientificMaterial {
  id: string;
  name: string;
  name_en?: string;
}

interface ProductAlternative {
  id: string;
  product_id: string;
  alternative_product_id: string;
}

const Products = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [scientificMaterials, setScientificMaterials] = useState<ScientificMaterial[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [selectedScientificMaterial, setSelectedScientificMaterial] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedStockStatus, setSelectedStockStatus] = useState("");
  const [suppliers, setSuppliers] = useState<{id: string; name: string}[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedAlternatives, setSelectedAlternatives] = useState<string[]>([]);

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
    scientific_material_id: "",
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
      const [productsRes, uomsRes, categoriesRes, manufacturersRes, taxesRes, scientificMaterialsRes, alternativesRes, stockSummaryRes, suppliersRes] = await Promise.all([
        supabase.from("products").select(`
          *,
          scientific_materials (id, name, name_en),
          suppliers:preferred_supplier_id (id, name)
        `).order("created_at", { ascending: false }),
        supabase.from("uoms").select("*").order("name", { ascending: true }),
        supabase.from("categories").select("*").order("name", { ascending: true }),
        supabase.from("manufacturers").select("*").eq("is_active", true).order("name", { ascending: true }),
        supabase.from("taxes").select("*").eq("is_active", true),
        supabase.from("scientific_materials").select("*").eq("is_active", true).order("name", { ascending: true }),
        supabase.from("product_alternatives").select(`
          product_id,
          alternative_product_id,
          products!product_alternatives_alternative_product_id_fkey (id, name)
        `),
        supabase.from("v_product_stock_summary").select("*"),
        supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (uomsRes.error) throw uomsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (manufacturersRes.error) throw manufacturersRes.error;
      if (taxesRes.error) throw taxesRes.error;
      if (scientificMaterialsRes.error) throw scientificMaterialsRes.error;

      // Build alternatives map for quick lookup
      const alternativesMap = new Map<string, string[]>();
      if (alternativesRes.data) {
        alternativesRes.data.forEach((alt: any) => {
          const productId = alt.product_id;
          const altName = alt.products?.name || '';
          if (!alternativesMap.has(productId)) {
            alternativesMap.set(productId, []);
          }
          if (altName) {
            alternativesMap.get(productId)!.push(altName);
          }
        });
      }

      // Build stock summary map
      const stockMap = new Map<string, any>();
      if (stockSummaryRes.data) {
        stockSummaryRes.data.forEach((stock: any) => {
          stockMap.set(stock.product_id, stock);
        });
      }

      // Enrich products with scientific material name, alternatives, and stock info
      const enrichedProducts = (productsRes.data || []).map((p: any) => {
        const stockInfo = stockMap.get(p.id);
        return {
          ...p,
          scientific_material_name: p.scientific_materials?.name || null,
          alternatives_names: alternativesMap.get(p.id) || [],
          supplier_name: p.suppliers?.name || null,
          total_stock: stockInfo?.total_stock || p.quantity || 0,
          locked_stock: stockInfo?.locked_stock || 0,
          available_stock: stockInfo?.available_stock || p.quantity || 0,
          inbound_stock: stockInfo?.inbound_stock || 0,
          reserved_stock: stockInfo?.reserved_stock || 0,
        };
      });

      setProducts(enrichedProducts);
      setUoms(uomsRes.data || []);
      setCategories(categoriesRes.data || []);
      setManufacturers(manufacturersRes.data || []);
      setTaxes(taxesRes.data || []);
      setScientificMaterials(scientificMaterialsRes.data || []);
      setSuppliers(suppliersRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل البيانات",
        variant: "destructive",
      });
    }
  };
  
  // Fetch alternatives when editing a product
  const fetchProductAlternatives = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from("product_alternatives")
        .select("alternative_product_id")
        .eq("product_id", productId);
      
      if (error) throw error;
      setSelectedAlternatives(data?.map(a => a.alternative_product_id) || []);
    } catch (error) {
      console.error("Error fetching alternatives:", error);
      setSelectedAlternatives([]);
    }
  };

  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query) ||
      p.name_en?.toLowerCase().includes(query) ||
      // Search by scientific material name
      p.scientific_material_name?.toLowerCase().includes(query) ||
      // Search by supplier name
      p.supplier_name?.toLowerCase().includes(query) ||
      // Search by alternatives names
      (p.alternatives_names && p.alternatives_names.some(alt => alt.toLowerCase().includes(query)));
    
    const matchesCategory = !selectedCategory || selectedCategory === "all" || p.category_id === selectedCategory;
    const matchesManufacturer = !selectedManufacturer || selectedManufacturer === "all" || p.manufacturer_id === selectedManufacturer;
    const matchesScientificMaterial = !selectedScientificMaterial || selectedScientificMaterial === "all" || p.scientific_material_id === selectedScientificMaterial;
    const matchesSupplier = !selectedSupplier || selectedSupplier === "all" || p.preferred_supplier_id === selectedSupplier;
    const matchesStatus = !selectedStatus || selectedStatus === "all" ||
      (selectedStatus === "active" && p.is_active) ||
      (selectedStatus === "inactive" && !p.is_active);
    
    // Stock status filter
    const matchesStockStatus = !selectedStockStatus || selectedStockStatus === "all" ||
      (selectedStockStatus === "low" && (p.available_stock || 0) <= (p.min_quantity || 0)) ||
      (selectedStockStatus === "locked" && (p.locked_stock || 0) > 0) ||
      (selectedStockStatus === "inbound" && (p.inbound_stock || 0) > 0) ||
      (selectedStockStatus === "out_of_stock" && (p.available_stock || 0) <= 0);

    return matchesSearch && matchesCategory && matchesManufacturer && matchesScientificMaterial && matchesSupplier && matchesStatus && matchesStockStatus;
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
        scientific_material_id: formData.scientific_material_id || null,
        sku: formData.sku.trim() || null,
        reorder_level: formData.reorder_level ? parseFloat(formData.reorder_level) : null,
      };

      let productId: string;

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        productId = editingProduct.id;
        
        // Update alternatives: delete existing and add new ones
        await supabase
          .from("product_alternatives")
          .delete()
          .eq("product_id", productId);
        
        toast({ title: "تم تحديث المنتج بنجاح" });
      } else {
        const { data: insertedProduct, error } = await supabase
          .from("products")
          .insert([productData])
          .select("id")
          .single();

        if (error) throw error;
        productId = insertedProduct.id;
        toast({ title: "تم إضافة المنتج بنجاح" });
      }

      // Add selected alternatives
      if (selectedAlternatives.length > 0) {
        const alternativesData = selectedAlternatives.map(altId => ({
          product_id: productId,
          alternative_product_id: altId,
        }));
        
        const { error: altError } = await supabase
          .from("product_alternatives")
          .insert(alternativesData);
        
        if (altError) {
          console.error("Error saving alternatives:", altError);
          toast({
            title: "تحذير",
            description: "تم حفظ المنتج ولكن فشل حفظ بعض البدائل",
            variant: "destructive",
          });
        }
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

  const handleEdit = async (product: Product) => {
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
      scientific_material_id: product.scientific_material_id || "",
      default_tax: "",
      discount_type: "percentage",
      discount_value: "",
      min_price: "",
      profit_margin: "",
      track_inventory: true,
      image_url: (product as any).image_url || "",
    });
    await fetchProductAlternatives(product.id);
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
      scientific_material_id: "",
      default_tax: "",
      discount_type: "percentage",
      discount_value: "",
      min_price: "",
      profit_margin: "",
      track_inventory: true,
      image_url: "",
    });
    setEditingProduct(null);
    setSelectedAlternatives([]);
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
              <div className="flex gap-2">
                <ExcelImportDialog
                  title="استيراد/تصدير المنتجات"
                  description="قم بتصدير المنتجات الحالية للتعديل عليها، أو استيراد منتجات جديدة"
                  templateFileName="products_template.xlsx"
                  allowUpdate={true}
                  columns={[
                    { excelColumn: "الباركود", dbColumn: "barcode", required: false, type: "string", label: "الباركود", isKey: true },
                    { excelColumn: "الاسم", dbColumn: "name", required: true, type: "string", label: "الاسم" },
                    { excelColumn: "الاسم الانجليزي", dbColumn: "name_en", required: false, type: "string", label: "الاسم الانجليزي" },
                    { excelColumn: "SKU", dbColumn: "sku", required: false, type: "string", label: "SKU" },
                    { excelColumn: "سعر البيع", dbColumn: "price", required: true, type: "number", label: "سعر البيع" },
                    { excelColumn: "سعر الشراء", dbColumn: "cost_price", required: true, type: "number", label: "سعر الشراء" },
                    { excelColumn: "الكمية", dbColumn: "quantity", required: false, type: "number", label: "الكمية" },
                    { excelColumn: "الحد الأدنى", dbColumn: "min_quantity", required: false, type: "number", label: "الحد الأدنى" },
                    { excelColumn: "تاريخ الانتهاء", dbColumn: "expiry_date", required: false, type: "date", label: "تاريخ الانتهاء" },
                    { excelColumn: "الوصف", dbColumn: "description", required: false, type: "string", label: "الوصف" },
                  ]}
                  onExport={async () => {
                    const { data, error } = await supabase
                      .from("products")
                      .select("barcode, name, name_en, sku, price, cost_price, quantity, min_quantity, expiry_date, description")
                      .order("name");
                    if (error) throw error;
                    return data || [];
                  }}
                  onImport={async (data) => {
                    let success = 0;
                    let failed = 0;
                    const errors: string[] = [];

                    for (const row of data) {
                      try {
                        const productData = {
                          name: row.name,
                          name_en: row.name_en || null,
                          barcode: row.barcode || null,
                          sku: row.sku || null,
                          price: row.price || 0,
                          cost_price: row.cost_price || 0,
                          quantity: row.quantity ?? 0,
                          min_quantity: row.min_quantity || 10,
                          expiry_date: row.expiry_date || null,
                          description: row.description || null,
                          is_active: true,
                        };

                        // Check if product exists by barcode or name
                        let existing = null;
                        if (productData.barcode) {
                          const { data: byBarcode } = await supabase
                            .from("products")
                            .select("id")
                            .eq("barcode", productData.barcode)
                            .maybeSingle();
                          existing = byBarcode;
                        }
                        
                        if (!existing) {
                          const { data: byName } = await supabase
                            .from("products")
                            .select("id")
                            .eq("name", productData.name)
                            .maybeSingle();
                          existing = byName;
                        }

                        if (existing) {
                          // Update existing - don't override quantity
                          const { quantity, ...updateData } = productData;
                          const { error } = await supabase
                            .from("products")
                            .update(updateData)
                            .eq("id", existing.id);
                          if (error) throw error;
                        } else {
                          // Insert new
                          const { error } = await supabase.from("products").insert([productData]);
                          if (error) throw error;
                        }
                        success++;
                      } catch (err: any) {
                        failed++;
                        errors.push(`${row.name}: ${err.message}`);
                      }
                    }

                    if (success > 0) fetchData();
                    return { success, failed, errors };
                  }}
                  triggerButton={
                    <Button variant="outline" className="gap-2">
                      <Upload className="w-4 h-4" />
                      استيراد/تصدير Excel
                    </Button>
                  }
                />
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

                      {/* Scientific Material Field */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>المادة العلمية / الفعالة</Label>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => window.open('/product-settings/scientific-materials', '_blank')}
                          >
                            إدارة المواد العلمية
                          </Button>
                        </div>
                        <Select
                          value={formData.scientific_material_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, scientific_material_id: value })
                          }
                        >
                          <SelectTrigger className="input-medical">
                            <SelectValue placeholder="اختر المادة العلمية" />
                          </SelectTrigger>
                          <SelectContent>
                            {scientificMaterials.map((mat) => (
                              <SelectItem key={mat.id} value={mat.id}>
                                {mat.name} {mat.name_en && `(${mat.name_en})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Product Alternatives Multi-Select */}
                      <div className="space-y-2">
                        <Label>البدائل المتاحة</Label>
                        <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-background">
                          {products
                            .filter(p => p.is_active && p.id !== editingProduct?.id)
                            .map((product) => (
                              <div key={product.id} className="flex items-center space-x-2 space-x-reverse py-1">
                                <Checkbox
                                  id={`alt-${product.id}`}
                                  checked={selectedAlternatives.includes(product.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedAlternatives([...selectedAlternatives, product.id]);
                                    } else {
                                      setSelectedAlternatives(selectedAlternatives.filter(id => id !== product.id));
                                    }
                                  }}
                                />
                                <Label htmlFor={`alt-${product.id}`} className="cursor-pointer text-sm">
                                  {product.name} {product.barcode && `(${product.barcode})`}
                                </Label>
                              </div>
                            ))}
                          {products.filter(p => p.is_active && p.id !== editingProduct?.id).length === 0 && (
                            <p className="text-muted-foreground text-sm">لا توجد منتجات متاحة للإختيار كبدائل</p>
                          )}
                        </div>
                        {selectedAlternatives.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            تم اختيار {selectedAlternatives.length} بديل/بدائل
                          </p>
                        )}
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                  <Label>المورد</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger className="input-medical">
                      <SelectValue placeholder="[جميع الموردين]" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الموردين</SelectItem>
                      {suppliers.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>المادة العلمية</Label>
                  <Select value={selectedScientificMaterial} onValueChange={setSelectedScientificMaterial}>
                    <SelectTrigger className="input-medical">
                      <SelectValue placeholder="[جميع المواد العلمية]" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المواد العلمية</SelectItem>
                      {scientificMaterials.map((mat) => (
                        <SelectItem key={mat.id} value={mat.id}>
                          {mat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>حالة المخزون</Label>
                  <Select value={selectedStockStatus} onValueChange={setSelectedStockStatus}>
                    <SelectTrigger className="input-medical">
                      <SelectValue placeholder="[الكل]" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="low">مخزون منخفض</SelectItem>
                      <SelectItem value="locked">مخزون محجوز</SelectItem>
                      <SelectItem value="inbound">في الطريق</SelectItem>
                      <SelectItem value="out_of_stock">نفذ المخزون</SelectItem>
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
              </div>

              <div className="flex items-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("");
                    setSelectedManufacturer("");
                    setSelectedScientificMaterial("");
                    setSelectedSupplier("");
                    setSelectedStockStatus("");
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
                        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>

                {product.barcode && (
                  <p className="text-sm text-muted-foreground">
                    الباركود: {product.barcode}
                  </p>
                )}

                {/* Scientific Material Display */}
                {product.scientific_material_name && (
                  <div className="bg-muted/50 rounded-md px-2 py-1">
                    <p className="text-xs text-muted-foreground">المادة العلمية</p>
                    <p className="text-sm font-medium text-foreground">{product.scientific_material_name}</p>
                  </div>
                )}

                {/* Alternatives Display */}
                {product.alternatives_names && product.alternatives_names.length > 0 && (
                  <div className="bg-accent/30 rounded-md px-2 py-1">
                    <p className="text-xs text-muted-foreground">البدائل المتاحة</p>
                    <p className="text-sm text-foreground truncate" title={product.alternatives_names.join(', ')}>
                      {product.alternatives_names.slice(0, 2).join(', ')}
                      {product.alternatives_names.length > 2 && ` +${product.alternatives_names.length - 2}`}
                    </p>
                  </div>
                )}

                {/* Stock Summary Display */}
                <div className="grid grid-cols-4 gap-2 text-center bg-muted/30 rounded-md p-2">
                  <div>
                    <p className="text-xs text-muted-foreground">الإجمالي</p>
                    <p className="font-bold text-foreground">{product.total_stock || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">المتاح</p>
                    <p className={`font-bold ${(product.available_stock || 0) <= product.min_quantity ? 'text-destructive' : 'text-green-600'}`}>
                      {product.available_stock || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">محجوز</p>
                    <p className={`font-bold ${(product.locked_stock || 0) > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {product.locked_stock || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">في الطريق</p>
                    <p className={`font-bold ${(product.inbound_stock || 0) > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
                      {product.inbound_stock || 0}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">سعر البيع</p>
                    <p className="text-lg font-bold text-primary">
                      {product.price.toFixed(2)} ر.س
                    </p>
                  </div>
                  {product.supplier_name && (
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">المورد</p>
                      <p className="text-sm text-foreground">{product.supplier_name}</p>
                    </div>
                  )}
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
