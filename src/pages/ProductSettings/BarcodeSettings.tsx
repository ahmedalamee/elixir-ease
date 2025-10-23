import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

const BarcodeSettings = () => {
  const navigate = useNavigate();
  const [barcodeType, setBarcodeType] = useState("Code_128");
  const [enableWeightedBarcode, setEnableWeightedBarcode] = useState(false);

  const handleSave = () => {
    localStorage.setItem("barcodeType", barcodeType);
    localStorage.setItem("enableWeightedBarcode", enableWeightedBarcode.toString());
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
          <span className="text-gray-900 font-medium">إعدادات الباركود</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>إعدادات الباركود</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="barcodeType">نوع الباركود</Label>
                  <Select value={barcodeType} onValueChange={setBarcodeType}>
                    <SelectTrigger id="barcodeType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Code_128">Code 128</SelectItem>
                      <SelectItem value="EAN_13">EAN-13</SelectItem>
                      <SelectItem value="EAN_8">EAN-8</SelectItem>
                      <SelectItem value="UPC_A">UPC-A</SelectItem>
                      <SelectItem value="UPC_E">UPC-E</SelectItem>
                      <SelectItem value="Code_39">Code 39</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="weighted"
                    checked={enableWeightedBarcode}
                    onCheckedChange={(checked) => setEnableWeightedBarcode(checked as boolean)}
                  />
                  <Label 
                    htmlFor="weighted"
                    className="text-sm font-normal cursor-pointer"
                  >
                    تفعيل الباركود المتضمن الوزن
                  </Label>
                </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BarcodeSettings;
