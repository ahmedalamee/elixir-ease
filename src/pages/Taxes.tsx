import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Receipt } from "lucide-react";

interface Tax {
  tax_code: string;
  name: string;
  name_en: string | null;
  rate: number;
  is_active: boolean;
  is_inclusive: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

const Taxes = () => {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<Tax>>({
    tax_code: "",
    name: "",
    name_en: "",
    rate: 15,
    is_active: true,
    is_inclusive: false,
    start_date: new Date().toISOString().split('T')[0],
    end_date: "2099-12-31",
  });

  useEffect(() => {
    checkAuth();
    fetchTaxes();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
    
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", session?.user.id).single();
    setIsAdmin(data?.role === "admin");
  };

  const fetchTaxes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("taxes")
      .select("*")
      .order("tax_code");

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setTaxes(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.tax_code || !formData.name || formData.rate === undefined) {
      toast({ title: "خطأ", description: "الرجاء ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    setLoading(true);
    
    const dataToSubmit = {
      tax_code: formData.tax_code,
      name: formData.name,
      rate: formData.rate,
      name_en: formData.name_en || null,
      is_active: formData.is_active ?? true,
      is_inclusive: formData.is_inclusive ?? false,
      start_date: formData.start_date || new Date().toISOString().split('T')[0],
      end_date: formData.end_date || "2099-12-31",
    };

    const { error } = editingTax
      ? await supabase.from("taxes").update(dataToSubmit).eq("tax_code", editingTax.tax_code)
      : await supabase.from("taxes").insert([dataToSubmit]);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم بنجاح", description: editingTax ? "تم تحديث الضريبة" : "تم إضافة الضريبة" });
      setDialogOpen(false);
      resetForm();
      fetchTaxes();
    }
    setLoading(false);
  };

  const handleDelete = async (tax_code: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الضريبة؟")) return;

    setLoading(true);
    const { error } = await supabase.from("taxes").delete().eq("tax_code", tax_code);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحذف بنجاح" });
      fetchTaxes();
    }
    setLoading(false);
  };

  const openDialog = (tax?: Tax) => {
    if (tax) {
      setEditingTax(tax);
      setFormData(tax);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTax(null);
    setFormData({
      tax_code: "",
      name: "",
      name_en: "",
      rate: 15,
      is_active: true,
      is_inclusive: false,
      start_date: new Date().toISOString().split('T')[0],
      end_date: "2099-12-31",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-6 w-6" />
                  إدارة الضرائب
                </CardTitle>
                <CardDescription>إضافة وتعديل وحذف أنواع الضرائب</CardDescription>
              </div>
              {isAdmin && (
                <Button onClick={() => openDialog()}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة ضريبة
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading && taxes.length === 0 ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الاسم الإنجليزي</TableHead>
                    <TableHead>النسبة (%)</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ البداية</TableHead>
                    <TableHead>تاريخ النهاية</TableHead>
                    {isAdmin && <TableHead>الإجراءات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxes.map((tax) => (
                    <TableRow key={tax.tax_code}>
                      <TableCell className="font-medium">{tax.tax_code}</TableCell>
                      <TableCell>{tax.name}</TableCell>
                      <TableCell>{tax.name_en || "-"}</TableCell>
                      <TableCell>{tax.rate}%</TableCell>
                      <TableCell>
                        <Badge variant={tax.is_inclusive ? "default" : "secondary"}>
                          {tax.is_inclusive ? "شاملة" : "إضافية"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tax.is_active ? "default" : "secondary"}>
                          {tax.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(tax.start_date).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell>{new Date(tax.end_date).toLocaleDateString('ar-SA')}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDialog(tax)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(tax.tax_code)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTax ? "تعديل ضريبة" : "إضافة ضريبة جديدة"}</DialogTitle>
            <DialogDescription>أدخل بيانات الضريبة</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax_code">كود الضريبة *</Label>
                <Input
                  id="tax_code"
                  value={formData.tax_code}
                  onChange={(e) => setFormData({ ...formData, tax_code: e.target.value })}
                  placeholder="مثال: VAT"
                  disabled={!!editingTax}
                />
              </div>
              <div>
                <Label htmlFor="rate">النسبة (%) *</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                  placeholder="15"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="name">الاسم بالعربي *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ضريبة القيمة المضافة"
              />
            </div>

            <div>
              <Label htmlFor="name_en">الاسم بالإنجليزي</Label>
              <Input
                id="name_en"
                value={formData.name_en || ""}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                placeholder="Value Added Tax"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">تاريخ البداية</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_date">تاريخ النهاية</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">نشط</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_inclusive"
                  checked={formData.is_inclusive}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_inclusive: checked })}
                />
                <Label htmlFor="is_inclusive">شاملة (مدرجة في السعر)</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {editingTax ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Taxes;
