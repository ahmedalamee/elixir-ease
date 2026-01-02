import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Edit, Trash2, RefreshCw, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function EcommerceCategories() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    description: "",
    parent_id: "",
    sort_order: "0",
    is_active: true,
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["ecommerce-categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecommerce_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: productCounts } = useQuery({
    queryKey: ["ecommerce-product-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecommerce_products")
        .select("category_id");
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((p) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingCategory) {
        const { error } = await supabase
          .from("ecommerce_categories")
          .update(data)
          .eq("id", editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ecommerce_categories").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-categories"] });
      toast.success(editingCategory ? "تم تحديث الفئة" : "تم إضافة الفئة");
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || "فشل حفظ الفئة");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ecommerce_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-categories"] });
      toast.success("تم حذف الفئة");
    },
    onError: () => {
      toast.error("فشل حذف الفئة - قد تحتوي على منتجات");
    },
  });

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingCategory(null);
    setFormData({
      name: "",
      name_en: "",
      description: "",
      parent_id: "",
      sort_order: "0",
      is_active: true,
    });
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      name_en: category.name_en || "",
      description: category.description || "",
      parent_id: category.parent_id || "",
      sort_order: category.sort_order?.toString() || "0",
      is_active: category.is_active,
    });
    setShowAddDialog(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم الفئة");
      return;
    }

    saveMutation.mutate({
      name: formData.name,
      name_en: formData.name_en || null,
      description: formData.description || null,
      parent_id: formData.parent_id || null,
      sort_order: parseInt(formData.sort_order) || 0,
      is_active: formData.is_active,
    });
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    const parent = categories?.find((c) => c.id === parentId);
    return parent?.name;
  };

  return (
    <div className="container mx-auto py-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">فئات المتجر الإلكتروني</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة فئة
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الفئة</TableHead>
                <TableHead>الاسم بالإنجليزية</TableHead>
                <TableHead>الفئة الأب</TableHead>
                <TableHead>عدد المنتجات</TableHead>
                <TableHead>الترتيب</TableHead>
                <TableHead>الحالة</TableHead>
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
              ) : categories?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    لا توجد فئات
                  </TableCell>
                </TableRow>
              ) : (
                categories?.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FolderTree className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{category.name_en || "-"}</TableCell>
                    <TableCell>
                      {getParentName(category.parent_id) || (
                        <span className="text-muted-foreground">فئة رئيسية</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {productCounts?.[category.id] || 0} منتج
                      </Badge>
                    </TableCell>
                    <TableCell>{category.sort_order}</TableCell>
                    <TableCell>
                      <Badge variant={category.is_active ? "default" : "secondary"}>
                        {category.is_active ? "نشط" : "غير نشط"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(category.id)}
                          disabled={(productCounts?.[category.id] || 0) > 0}
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

      {/* Add/Edit Category Dialog */}
      <Dialog open={showAddDialog} onOpenChange={handleCloseDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "تعديل فئة" : "إضافة فئة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم الفئة *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: أدوية"
              />
            </div>

            <div className="space-y-2">
              <Label>الاسم بالإنجليزية</Label>
              <Input
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                placeholder="e.g. Medicines"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label>الفئة الأب</Label>
              <Select
                value={formData.parent_id}
                onValueChange={(v) => setFormData({ ...formData, parent_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر فئة أب (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون فئة أب</SelectItem>
                  {categories
                    ?.filter((c) => c.id !== editingCategory?.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>الترتيب</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label>فئة نشطة</Label>
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
