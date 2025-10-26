import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const NewSalesInvoice = () => {
  const navigate = useNavigate();
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("سيتم إضافة وظيفة حفظ الفاتورة قريباً");
  };

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">إنشاء فاتورة مبيعات جديدة</CardTitle>
          <Button variant="outline" onClick={() => navigate("/sales/invoices")}>
            رجوع
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">العميل</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">عميل 1</SelectItem>
                    <SelectItem value="2">عميل 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">تاريخ الفاتورة</Label>
                <Input
                  id="date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">بنود الفاتورة</h3>
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>لم يتم إضافة بنود بعد</p>
                <Button type="button" variant="outline" className="mt-4">
                  إضافة بند
                </Button>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => navigate("/sales/invoices")}>
                إلغاء
              </Button>
              <Button type="submit">
                حفظ الفاتورة
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewSalesInvoice;
