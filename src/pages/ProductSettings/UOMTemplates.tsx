import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronRight, Plus, Search, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface UOM {
  id: string;
  name: string;
  name_en: string;
  symbol: string;
  uom_type: string;
}

const UOMTemplates = () => {
  const navigate = useNavigate();
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUOMs();
  }, []);

  const fetchUOMs = async () => {
    try {
      const { data, error } = await supabase
        .from("uoms")
        .select("*")
        .order("name");

      if (error) throw error;
      setUoms(data || []);
    } catch (error) {
      console.error("Error fetching UOMs:", error);
      toast.error("حدث خطأ في تحميل قوالب الوحدات");
    } finally {
      setLoading(false);
    }
  };

  const filteredUOMs = uoms.filter(uom => 
    uom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (uom.name_en && uom.name_en.toLowerCase().includes(searchTerm.toLowerCase()))
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
          <span className="text-gray-900 font-medium">قوالب الوحدات</span>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>قوالب الوحدات</CardTitle>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => navigate("/product-settings/uom-templates/new")}
              >
                <Plus className="w-4 h-4 ml-2" />
                أضف قالب الوحدة
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
                <Button variant="outline">
                  إلغاء الفلتر
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  بحث
                </Button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">الترتيب حسب: اسم قالب الوحدة</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold mb-2">النتائج</h3>
              {loading ? (
                <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
              ) : filteredUOMs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لم يتم إضافة أي سجلات بعد
                </div>
              ) : (
                filteredUOMs.map((uom) => (
                  <div 
                    key={uom.id}
                    className="flex justify-between items-center p-4 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/product-settings/uom-templates/${uom.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                      <div>
                        <p className="font-medium">{uom.name}</p>
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          نشط
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UOMTemplates;
