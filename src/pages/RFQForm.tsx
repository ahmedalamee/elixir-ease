import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Save, Send } from "lucide-react";
import { useCreateRFQ, useGenerateRFQNumber, useRFQ } from "@/hooks/useRFQ";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  email: string | null;
}

interface PRItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  uom_name: string;
}

export default function RFQForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: rfqNumber } = useGenerateRFQNumber();
  const { data: existingRFQ } = useRFQ(id);
  const createRFQ = useCreateRFQ();

  const [formData, setFormData] = useState({
    rfq_number: "",
    title: "",
    description: "",
    deadline: "",
    notes: "",
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [prItems, setPRItems] = useState<PRItem[]>([]);
  const [selectedPRId, setSelectedPRId] = useState<string>("");
  const [prs, setPRs] = useState<{ id: string; pr_number: string }[]>([]);

  useEffect(() => {
    if (!isEdit && rfqNumber) {
      setFormData((prev) => ({ ...prev, rfq_number: rfqNumber }));
    }
  }, [rfqNumber, isEdit]);

  useEffect(() => {
    if (existingRFQ) {
      setFormData({
        rfq_number: existingRFQ.rfq_number,
        title: existingRFQ.title || "",
        description: existingRFQ.description || "",
        deadline: existingRFQ.deadline || "",
        notes: existingRFQ.notes || "",
      });
    }
  }, [existingRFQ]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name, email")
        .eq("is_active", true);
      if (data) setSuppliers(data);
    };

    const fetchPRs = async () => {
      const { data } = await supabase
        .from("purchase_requisitions")
        .select("id, pr_number")
        .eq("status", "approved");
      if (data) setPRs(data);
    };

    fetchSuppliers();
    fetchPRs();
  }, []);

  useEffect(() => {
    const fetchPRItems = async () => {
      if (!selectedPRId) {
        setPRItems([]);
        return;
      }
      const { data } = await supabase
        .from("purchase_requisition_items")
        .select(`
          id,
          product_id,
          quantity,
          products:product_id (name),
          unit_of_measures:uom_id (name)
        `)
        .eq("pr_id", selectedPRId);

      if (data) {
        setPRItems(
          data.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.products?.name || "",
            quantity: item.quantity,
            uom_name: item.unit_of_measures?.name || "",
          }))
        );
      }
    };
    fetchPRItems();
  }, [selectedPRId]);

  const toggleSupplier = (supplierId: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleSubmit = async (sendToSuppliers = false) => {
    if (!formData.rfq_number) {
      toast.error("رقم الطلب مطلوب");
      return;
    }
    if (selectedSuppliers.length === 0) {
      toast.error("يجب اختيار مورد واحد على الأقل");
      return;
    }

    try {
      await createRFQ.mutateAsync({
        rfq: {
          rfq_number: formData.rfq_number,
          title: formData.title,
          description: formData.description,
          deadline: formData.deadline || null,
          notes: formData.notes,
          pr_id: selectedPRId || null,
          status: sendToSuppliers ? "sent" : "draft",
        },
        supplierIds: selectedSuppliers,
      });
      navigate("/rfq");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/rfq")}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? "تعديل طلب عرض سعر" : "طلب عرض سعر جديد"}
          </h1>
          <p className="text-muted-foreground">
            إنشاء طلب عرض سعر وإرساله للموردين
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>بيانات الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رقم الطلب</Label>
                  <Input value={formData.rfq_number} disabled />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الانتهاء</Label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="عنوان طلب عرض السعر"
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="وصف تفصيلي للطلب"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="ملاحظات إضافية"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ربط بطلب شراء</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>اختر طلب شراء معتمد (اختياري)</Label>
                <select
                  className="w-full border rounded-md p-2"
                  value={selectedPRId}
                  onChange={(e) => setSelectedPRId(e.target.value)}
                >
                  <option value="">-- اختر طلب شراء --</option>
                  {prs.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.pr_number}
                    </option>
                  ))}
                </select>
              </div>

              {prItems.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">الوحدة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.uom_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>اختيار الموردين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="flex items-center gap-3 p-2 border rounded-md"
                  >
                    <Checkbox
                      checked={selectedSuppliers.includes(supplier.id)}
                      onCheckedChange={() => toggleSupplier(supplier.id)}
                    />
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {supplier.email || "لا يوجد بريد"}
                      </p>
                    </div>
                  </div>
                ))}
                {suppliers.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    لا يوجد موردين نشطين
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                تم اختيار {selectedSuppliers.length} مورد
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => handleSubmit(false)}
              disabled={createRFQ.isPending}
              variant="outline"
            >
              <Save className="ml-2 h-4 w-4" />
              حفظ كمسودة
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={createRFQ.isPending}
            >
              <Send className="ml-2 h-4 w-4" />
              حفظ وإرسال للموردين
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
