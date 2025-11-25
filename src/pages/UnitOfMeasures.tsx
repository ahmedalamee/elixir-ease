import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Ruler, Plus, Edit, Trash2 } from "lucide-react";

interface UOM {
  id: string;
  name: string;
  name_en?: string;
  symbol?: string;
  uom_type?: string;
  created_at: string;
}

const UnitOfMeasures = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUOM, setEditingUOM] = useState<UOM | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    symbol: "",
    uom_type: "piece" as any,
  });

  useEffect(() => {
    checkAuth();
    fetchUOMs();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchUOMs = async () => {
    try {
      const { data, error } = await supabase
        .from("uoms")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setUoms(data || []);
    } catch (error) {
      console.error("Error fetching UOMs:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل وحدات القياس",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUOM) {
        const { error } = await supabase
          .from("uoms")
          .update(formData)
          .eq("id", editingUOM.id);

        if (error) throw error;
        toast({ title: "✅ تم تحديث وحدة القياس بنجاح" });
      } else {
        const { error } = await supabase
          .from("uoms")
          .insert([formData]);

        if (error) throw error;
        toast({ title: "✅ تم إضافة وحدة القياس بنجاح" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchUOMs();
    } catch (error: any) {
      toast({
        title: "❌ خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (uom: UOM) => {
    setEditingUOM(uom);
    setFormData({
      name: uom.name,
      name_en: uom.name_en || "",
      symbol: uom.symbol || "",
      uom_type: uom.uom_type || "piece" as any,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف وحدة القياس؟ قد يؤثر ذلك على المنتجات المرتبطة.")) return;

    try {
      const { error } = await supabase
        .from("uoms")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "✅ تم حذف وحدة القياس بنجاح" });
      fetchUOMs();
    } catch (error: any) {
      toast({
        title: "❌ خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_en: "",
      symbol: "",
      uom_type: "piece" as any,
    });
    setEditingUOM(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Ruler className="h-8 w-8" />
            إدارة وحدات القياس
          </h1>
          <p className="text-muted-foreground mt-2">
            إدارة وحدات القياس المستخدمة في المنتجات (كجم، لتر، حبة، علبة، إلخ)
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>قائمة وحدات القياس</CardTitle>
                <CardDescription>جميع وحدات القياس المسجلة في النظام</CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm} className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة وحدة قياس
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingUOM ? "تعديل وحدة القياس" : "إضافة وحدة قياس جديدة"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">
                          الاسم (عربي) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="مثال: كيلوجرام"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name_en">الاسم (إنجليزي)</Label>
                        <Input
                          id="name_en"
                          value={formData.name_en}
                          onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                          placeholder="Kilogram"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="symbol">
                        الرمز <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="symbol"
                        value={formData.symbol}
                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                        placeholder="مثال: كجم أو kg"
                        required
                      />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        إلغاء
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? "جاري الحفظ..." : editingUOM ? "تحديث" : "إضافة"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم (عربي)</TableHead>
                  <TableHead>الاسم (English)</TableHead>
                  <TableHead>الرمز</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uoms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      لا توجد وحدات قياس مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  uoms.map((uom) => (
                    <TableRow key={uom.id}>
                      <TableCell className="font-medium">{uom.name}</TableCell>
                      <TableCell>{uom.name_en || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{uom.symbol}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {uom.uom_type || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(uom)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(uom.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
      </div>
    </div>
  );
};

export default UnitOfMeasures;
