import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const EcommerceBanners = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    title_en: "",
    image_url: "",
    link_url: "",
    display_order: 0,
    is_active: true,
  });
  const queryClient = useQueryClient();

  const { data: banners, isLoading } = useQuery({
    queryKey: ["ecommerce-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecommerce_banners")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingBanner) {
        const { error } = await supabase
          .from("ecommerce_banners")
          .update(data)
          .eq("id", editingBanner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ecommerce_banners")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-banners"] });
      toast.success(editingBanner ? "تم تحديث البانر" : "تم إضافة البانر");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("حدث خطأ");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ecommerce_banners")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-banners"] });
      toast.success("تم حذف البانر");
    },
    onError: () => {
      toast.error("حدث خطأ في الحذف");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("ecommerce_banners")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-banners"] });
      toast.success("تم تحديث الحالة");
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingBanner(null);
    setFormData({
      title: "",
      title_en: "",
      image_url: "",
      link_url: "",
      display_order: 0,
      is_active: true,
    });
  };

  const handleEdit = (banner: any) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || "",
      title_en: banner.title_en || "",
      image_url: banner.image_url || "",
      link_url: banner.link_url || "",
      display_order: banner.display_order || 0,
      is_active: banner.is_active ?? true,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.image_url) {
      toast.error("يرجى إدخال العنوان ورابط الصورة");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <main className="flex-1 p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">البانرات الإعلانية</h1>
              <p className="text-muted-foreground">إدارة إعلانات المتجر الإلكتروني</p>
            </div>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة بانر
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>قائمة البانرات</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الصورة</TableHead>
                      <TableHead>العنوان</TableHead>
                      <TableHead>العنوان (EN)</TableHead>
                      <TableHead>الترتيب</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {banners?.map((banner) => (
                      <TableRow key={banner.id}>
                        <TableCell>
                          {banner.image_url ? (
                            <img
                              src={banner.image_url}
                              alt={banner.title}
                              className="w-20 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-20 h-12 bg-muted rounded flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{banner.title}</TableCell>
                        <TableCell>{banner.title_en || "-"}</TableCell>
                        <TableCell>{banner.display_order}</TableCell>
                        <TableCell>
                          <Switch
                            checked={banner.is_active ?? true}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: banner.id, is_active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {banner.link_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(banner.link_url!, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(banner)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("هل أنت متأكد من حذف هذا البانر؟")) {
                                  deleteMutation.mutate(banner.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!banners || banners.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          لا توجد بانرات
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Add/Edit Dialog */}
          <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBanner ? "تعديل البانر" : "إضافة بانر جديد"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>العنوان *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="عنوان البانر"
                  />
                </div>
                <div className="space-y-2">
                  <Label>العنوان (English)</Label>
                  <Input
                    value={formData.title_en}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    placeholder="Banner title"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رابط الصورة *</Label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رابط البانر</Label>
                  <Input
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://example.com/page"
                    dir="ltr"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الترتيب</Label>
                    <Input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) =>
                        setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نشط</Label>
                    <div className="pt-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, is_active: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  إلغاء
                </Button>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default EcommerceBanners;
