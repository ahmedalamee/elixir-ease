import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  FlaskConical,
  CheckCircle,
  XCircle,
  Package,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface ScientificMaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMaterialsUpdated?: () => void;
  onMaterialCreated?: (materialId: string) => void;
}

const ScientificMaterialsDialog = ({
  open,
  onOpenChange,
  onMaterialsUpdated,
  onMaterialCreated,
}: ScientificMaterialsDialogProps) => {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<ScientificMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<ScientificMaterial | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<ScientificMaterial | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    description: "",
    is_active: true,
  });

  const fetchMaterials = useCallback(async () => {
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
        if (id) {
          countMap.set(id, (countMap.get(id) || 0) + 1);
        }
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
  }, [toast]);

  useEffect(() => {
    if (open) {
      fetchMaterials();
    }
  }, [open, fetchMaterials]);

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
        const { data: newMaterial, error } = await supabase
          .from("scientific_materials")
          .insert([payload])
          .select("id")
          .single();

        if (error) throw error;
        toast({ title: "تم إضافة المادة العلمية بنجاح" });
        
        // Notify parent about the new material
        if (newMaterial && onMaterialCreated) {
          onMaterialCreated(newMaterial.id);
        }
      }

      setIsAddEditOpen(false);
      resetForm();
      fetchMaterials();
      onMaterialsUpdated?.();
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
    setIsAddEditOpen(true);
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
      onMaterialsUpdated?.();
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
      onMaterialsUpdated?.();
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" 
          dir="rtl"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FlaskConical className="h-6 w-6 text-primary" />
              إدارة المواد العلمية
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              <Card>
                <CardContent className="p-3 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">إجمالي</p>
                    <p className="text-lg font-bold">{materials.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">نشط</p>
                    <p className="text-lg font-bold">{totalActive}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">غير نشط</p>
                    <p className="text-lg font-bold">{totalInactive}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">مرتبطة</p>
                    <p className="text-lg font-bold">{totalLinked}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters & Add Button */}
            <div className="flex flex-col md:flex-row gap-3">
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
              <Button 
                className="gap-2" 
                onClick={() => {
                  resetForm();
                  setIsAddEditOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                إضافة مادة
              </Button>
            </div>

            {/* Table */}
            <ScrollArea className="flex-1 border rounded-md">
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
                      <TableHead className="text-center">المنتجات</TableHead>
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
                        <TableCell className="text-center">
                          <Badge variant={material.product_count ? "default" : "secondary"}>
                            {material.product_count || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={material.is_active}
                              onCheckedChange={() => handleToggleStatus(material)}
                            />
                            <Badge variant={material.is_active ? "default" : "secondary"}>
                              {material.is_active ? "نشط" : "غير نشط"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(material)}
                              title="تعديل"
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
                                  ? "لا يمكن حذف مادة مرتبطة بمنتجات"
                                  : "حذف"
                              }
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Material Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={(open) => {
        setIsAddEditOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md" dir="rtl">
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
              <Label htmlFor="is_active_form">الحالة</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {formData.is_active ? "نشط" : "غير نشط"}
                </span>
                <Switch
                  id="is_active_form"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddEditOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit">
                {editingMaterial ? "حفظ التغييرات" : "إضافة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المادة العلمية "{materialToDelete?.name}"؟
              <br />
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ScientificMaterialsDialog;
