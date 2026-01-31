import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  FlaskConical,
  CheckCircle,
  XCircle,
  Package,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScientificMaterial {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

const ScientificMaterials = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [materials, setMaterials] = useState<ScientificMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<ScientificMaterial | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<ScientificMaterial | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    checkAuth();
    fetchMaterials();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      // Fetch materials
      const { data: materialsData, error: materialsError } = await supabase
        .from("scientific_materials")
        .select("*")
        .order("name", { ascending: true });

      if (materialsError) throw materialsError;

      // Get product counts for each material
      const { data: productCounts, error: countError } = await supabase
        .from("products")
        .select("scientific_material_id")
        .not("scientific_material_id", "is", null);

      if (countError) throw countError;

      // Count products per material
      const countMap = new Map<string, number>();
      productCounts?.forEach((p) => {
        const id = p.scientific_material_id;
        countMap.set(id, (countMap.get(id) || 0) + 1);
      });

      // Merge counts with materials
      const materialsWithCounts = (materialsData || []).map((m) => ({
        ...m,
        product_count: countMap.get(m.id) || 0,
      }));

      setMaterials(materialsWithCounts);
    } catch (error: any) {
      toast({
        title: "خطأ في جلب البيانات",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "خطأ",
        description: "اسم المادة العلمية مطلوب",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        name_en: formData.name_en.trim() || null,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from("scientific_materials")
          .update(payload)
          .eq("id", editingMaterial.id);

        if (error) throw error;
        toast({ title: "تم تحديث المادة العلمية بنجاح" });
      } else {
        const { error } = await supabase
          .from("scientific_materials")
          .insert([payload]);

        if (error) throw error;
        toast({ title: "تم إضافة المادة العلمية بنجاح" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchMaterials();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (material: ScientificMaterial) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      name_en: material.name_en || "",
      description: material.description || "",
      is_active: material.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (material: ScientificMaterial) => {
    setMaterialToDelete(material);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!materialToDelete) return;

    try {
      const { error } = await supabase
        .from("scientific_materials")
        .delete()
        .eq("id", materialToDelete.id);

      if (error) throw error;
      
      toast({ title: "تم حذف المادة العلمية بنجاح" });
      fetchMaterials();
    } catch (error: any) {
      toast({
        title: "خطأ في الحذف",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setMaterialToDelete(null);
    }
  };

  const handleToggleStatus = async (material: ScientificMaterial) => {
    try {
      const { error } = await supabase
        .from("scientific_materials")
        .update({ is_active: !material.is_active })
        .eq("id", material.id);

      if (error) throw error;

      toast({
        title: material.is_active ? "تم تعطيل المادة العلمية" : "تم تفعيل المادة العلمية",
      });
      fetchMaterials();
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
      description: "",
      is_active: true,
    });
    setEditingMaterial(null);
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.name_en && m.name_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && m.is_active) ||
      (statusFilter === "inactive" && !m.is_active);

    return matchesSearch && matchesStatus;
  });

  const totalActive = materials.filter((m) => m.is_active).length;
  const totalInactive = materials.filter((m) => !m.is_active).length;
  const totalLinked = materials.filter((m) => (m.product_count || 0) > 0).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FlaskConical className="h-8 w-8 text-primary" />
              إدارة المواد العلمية
            </h1>
            <p className="text-muted-foreground mt-1">
              إدارة المواد الفعالة للمنتجات الصيدلانية (Master Data)
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة مادة علمية
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingMaterial ? "تعديل المادة العلمية" : "إضافة مادة علمية جديدة"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم (عربي) *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: باراسيتامول"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_en">الاسم (إنجليزي)</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="Example: Paracetamol"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف مختصر للمادة العلمية..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">الحالة</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formData.is_active ? "نشط" : "غير نشط"}
                    </span>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit">
                    {editingMaterial ? "حفظ التغييرات" : "إضافة"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <FlaskConical className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المواد</p>
                <p className="text-2xl font-bold">{materials.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مواد نشطة</p>
                <p className="text-2xl font-bold">{totalActive}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-full">
                <XCircle className="h-6 w-6 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مواد غير نشطة</p>
                <p className="text-2xl font-bold">{totalInactive}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مرتبطة بمنتجات</p>
                <p className="text-2xl font-bold">{totalLinked}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو الوصف..."
                  className="pr-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  الكل
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                >
                  نشط
                </Button>
                <Button
                  variant={statusFilter === "inactive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("inactive")}
                >
                  غير نشط
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة المواد العلمية ({filteredMaterials.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
            ) : filteredMaterials.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد مواد علمية مطابقة للبحث
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم (عربي)</TableHead>
                    <TableHead>الاسم (إنجليزي)</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead className="text-center">المنتجات المرتبطة</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell dir="ltr" className="text-left">
                        {material.name_en || "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {material.description || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={material.product_count ? "default" : "secondary"}>
                          {material.product_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={material.is_active ? "default" : "secondary"}
                          className={material.is_active ? "bg-green-100 text-green-800" : ""}
                        >
                          {material.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(material)}
                            title={material.is_active ? "تعطيل" : "تفعيل"}
                          >
                            {material.is_active ? (
                              <XCircle className="h-4 w-4 text-gray-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(material)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(material)}
                            disabled={(material.product_count || 0) > 0}
                            title={
                              (material.product_count || 0) > 0
                                ? "لا يمكن الحذف - مرتبطة بمنتجات"
                                : "حذف"
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">ملاحظات هامة:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>لا يمكن حذف مادة علمية مرتبطة بمنتجات</li>
                <li>تعطيل المادة العلمية لا يؤثر على المنتجات المرتبطة بها</li>
                <li>المواد المعطلة لن تظهر في قائمة الاختيار عند إضافة منتج جديد</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المادة العلمية "{materialToDelete?.name}"؟
              <br />
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ScientificMaterials;
