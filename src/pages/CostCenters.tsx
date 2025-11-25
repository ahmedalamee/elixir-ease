import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Building2, Edit, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const CostCenters = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    name_en: "",
    description: "",
    budget_amount: 0,
  });

  const { data: centers, isLoading } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .order("code");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("cost_centers").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إضافة مركز التكلفة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`فشل في إضافة مركز التكلفة: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("cost_centers")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث مركز التكلفة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`فشل في تحديث مركز التكلفة: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cost_centers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف مركز التكلفة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
    },
    onError: (error: any) => {
      toast.error(`فشل في حذف مركز التكلفة: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      name_en: "",
      description: "",
      budget_amount: 0,
    });
    setEditingCenter(null);
  };

  const handleSubmit = () => {
    if (editingCenter) {
      updateMutation.mutate({ id: editingCenter.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (center: any) => {
    setEditingCenter(center);
    setFormData({
      code: center.code,
      name: center.name,
      name_en: center.name_en || "",
      description: center.description || "",
      budget_amount: center.budget_amount || 0,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8">جارٍ التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              مراكز التكلفة
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 ml-2" />
                  مركز تكلفة جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingCenter ? "تعديل مركز التكلفة" : "إضافة مركز تكلفة جديد"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>الكود *</Label>
                      <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="CC-001"
                      />
                    </div>
                    <div>
                      <Label>الاسم *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="اسم مركز التكلفة"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>الاسم بالإنجليزية</Label>
                    <Input
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      placeholder="Cost Center Name"
                    />
                  </div>
                  <div>
                    <Label>الموازنة التقديرية</Label>
                    <Input
                      type="number"
                      value={formData.budget_amount}
                      onChange={(e) =>
                        setFormData({ ...formData, budget_amount: parseFloat(e.target.value) })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>الوصف</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="وصف مركز التكلفة..."
                      rows={3}
                    />
                  </div>
                  <Button className="w-full" onClick={handleSubmit}>
                    {editingCenter ? "تحديث" : "إضافة"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الموازنة</TableHead>
                  <TableHead>الفعلي</TableHead>
                  <TableHead>الانحراف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centers?.map((center: any) => {
                  const variance = center.budget_amount - center.actual_amount;
                  const variancePercent =
                    center.budget_amount > 0
                      ? ((variance / center.budget_amount) * 100).toFixed(1)
                      : "0";

                  return (
                    <TableRow key={center.id}>
                      <TableCell className="font-mono">{center.code}</TableCell>
                      <TableCell className="font-medium">{center.name}</TableCell>
                      <TableCell>{center.budget_amount?.toFixed(2)} ر.س</TableCell>
                      <TableCell>{center.actual_amount?.toFixed(2)} ر.س</TableCell>
                      <TableCell
                        className={variance >= 0 ? "text-green-600" : "text-red-600"}
                      >
                        {variance.toFixed(2)} ({variancePercent}%)
                      </TableCell>
                      <TableCell>
                        <Badge variant={center.is_active ? "default" : "secondary"}>
                          {center.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(center)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف مركز التكلفة؟")) {
                                deleteMutation.mutate(center.id);
                              }
                            }}
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

            {centers?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد مراكز تكلفة
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CostCenters;
