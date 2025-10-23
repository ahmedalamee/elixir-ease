import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, Plus, Search, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface Brand {
  id: string;
  name: string;
  name_en: string | null;
  country: string | null;
  is_active: boolean;
}

const Brands = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    country: "",
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("manufacturers")
        .select("*")
        .order("name");

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error("Error fetching brands:", error);
      toast.error("حدث خطأ في تحميل العلامات التجارية");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBrand) {
        const { error } = await supabase
          .from("manufacturers")
          .update(formData)
          .eq("id", editingBrand.id);

        if (error) throw error;
        toast.success("تم تحديث العلامة التجارية بنجاح");
      } else {
        const { error } = await supabase
          .from("manufacturers")
          .insert([formData]);

        if (error) throw error;
        toast.success("تم إضافة العلامة التجارية بنجاح");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchBrands();
    } catch (error) {
      console.error("Error saving brand:", error);
      toast.error("حدث خطأ في حفظ العلامة التجارية");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه العلامة التجارية؟")) return;

    try {
      const { error } = await supabase
        .from("manufacturers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("تم حذف العلامة التجارية بنجاح");
      fetchBrands();
    } catch (error) {
      console.error("Error deleting brand:", error);
      toast.error("حدث خطأ في حذف العلامة التجارية");
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      name_en: brand.name_en || "",
      country: brand.country || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", name_en: "", country: "" });
    setEditingBrand(null);
  };

  const filteredBrands = brands.filter(brand => 
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (brand.name_en && brand.name_en.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-600">
          <span 
            className="cursor-pointer hover:text-primary"
            onClick={() => navigate("/product-settings")}
          >
            إعدادات المنتجات
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">العلامات التجارية</span>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>العلامات التجارية</CardTitle>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 ml-2" />
                أضف العلامة
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">بحث</h3>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="الاسم"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Button variant="outline" onClick={() => setSearchTerm("")}>
                  إلغاء الفلتر
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  بحث
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">النتائج</h3>
              {loading ? (
                <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
              ) : filteredBrands.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>لم يتم إضافة أي سجلات بعد</p>
                  <Button
                    className="mt-4 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      resetForm();
                      setIsDialogOpen(true);
                    }}
                  >
                    أضف العلامة
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">الاسم بالإنجليزية</TableHead>
                      <TableHead className="text-right">الدولة</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBrands.map((brand) => (
                      <TableRow key={brand.id}>
                        <TableCell>{brand.name}</TableCell>
                        <TableCell>{brand.name_en || "-"}</TableCell>
                        <TableCell>{brand.country || "-"}</TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-1 text-xs rounded ${
                            brand.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            {brand.is_active ? "نشط" : "غير نشط"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(brand)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(brand.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? "تعديل العلامة التجارية" : "علامة تجارية جديدة"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">الاسم *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="name_en">الاسم بالإنجليزية</Label>
              <Input
                id="name_en"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="country">الدولة</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                إلغاء
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                حفظ
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Brands;
