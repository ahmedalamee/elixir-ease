import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface Tax {
  tax_code: string;
  name: string;
  rate: number;
}

const DefaultTaxes = () => {
  const navigate = useNavigate();
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [selectedTax1, setSelectedTax1] = useState("");
  const [selectedTax2, setSelectedTax2] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    try {
      const { data, error } = await supabase
        .from("taxes")
        .select("tax_code, name, rate")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setTaxes(data || []);
    } catch (error) {
      console.error("Error fetching taxes:", error);
      toast.error("حدث خطأ في تحميل الضرائب");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    // حفظ الإعدادات في localStorage أو قاعدة البيانات
    localStorage.setItem("defaultTax1", selectedTax1);
    localStorage.setItem("defaultTax2", selectedTax2);
    toast.success("تم حفظ الإعدادات بنجاح");
  };

  const handleCancel = () => {
    navigate("/product-settings");
  };

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
          <span className="text-gray-900 font-medium">الضرائب الافتراضية</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>إعدادات الضرائب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="tax1">الضريبة 1</Label>
                    <Select value={selectedTax1} onValueChange={setSelectedTax1}>
                      <SelectTrigger id="tax1">
                        <SelectValue placeholder="اختار اسم الضريبه" />
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

                  <div>
                    <Label htmlFor="tax2">الضريبة 2</Label>
                    <Select value={selectedTax2} onValueChange={setSelectedTax2}>
                      <SelectTrigger id="tax2">
                        <SelectValue placeholder="اختار اسم الضريبه" />
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
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleSave}
                  >
                    حفظ
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCancel}
                  >
                    إلغاء
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DefaultTaxes;
