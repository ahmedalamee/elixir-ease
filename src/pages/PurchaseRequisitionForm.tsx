import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Save, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useGeneratePRNumber,
  usePurchaseRequisition,
  usePRItems,
  useCreatePurchaseRequisition,
  useUpdatePurchaseRequisition,
  PRItemInput,
} from "@/hooks/usePurchaseRequisitions";
import { toast } from "sonner";

interface LineItem {
  id?: string;
  product_id: string;
  product_name: string;
  requested_qty: number;
  estimated_unit_cost_fc: number;
  notes?: string;
}

export default function PurchaseRequisitionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    pr_number: "",
    warehouse_id: "",
    priority: "normal",
    notes: "",
    currency_code: "YER",
    exchange_rate: 1,
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const { data: generatedNumber } = useGeneratePRNumber();
  const { data: existingPR, isLoading: loadingPR } = usePurchaseRequisition(id);
  const { data: existingItems } = usePRItems(id);
  const createPR = useCreatePurchaseRequisition();
  const updatePR = useUpdatePurchaseRequisition();

  useEffect(() => {
    fetchWarehouses();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (generatedNumber && !isEdit) {
      setFormData((prev) => ({ ...prev, pr_number: generatedNumber }));
    }
  }, [generatedNumber, isEdit]);

  useEffect(() => {
    if (existingPR && isEdit) {
      setFormData({
        pr_number: existingPR.pr_number,
        warehouse_id: existingPR.warehouse_id || "",
        priority: existingPR.priority || "normal",
        notes: existingPR.notes || "",
        currency_code: existingPR.currency_code || "YER",
        exchange_rate: existingPR.exchange_rate || 1,
      });
    }
  }, [existingPR, isEdit]);

  useEffect(() => {
    if (existingItems && isEdit) {
      setLineItems(
        existingItems.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.products?.name || "",
          requested_qty: item.requested_qty,
          estimated_unit_cost_fc: item.estimated_unit_cost_fc || 0,
          notes: item.notes,
        }))
      );
    }
  }, [existingItems, isEdit]);

  const fetchWarehouses = async () => {
    const { data } = await supabase
      .from("warehouses")
      .select("id, name")
      .eq("is_active", true);
    setWarehouses(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, cost_price")
      .eq("is_active", true);
    setProducts(data || []);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { product_id: "", product_name: "", requested_qty: 1, estimated_unit_cost_fc: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].product_name = product.name;
        updated[index].estimated_unit_cost_fc = product.cost_price || 0;
      }
    }

    setLineItems(updated);
  };

  const calculateTotals = () => {
    const subtotal_fc = lineItems.reduce((sum, item) => sum + item.requested_qty * item.estimated_unit_cost_fc, 0);
    const subtotal_bc = subtotal_fc * formData.exchange_rate;
    return { subtotal_fc, subtotal_bc };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.warehouse_id) {
      toast.error("يرجى اختيار المستودع");
      return;
    }

    if (lineItems.length === 0) {
      toast.error("يرجى إضافة منتج واحد على الأقل");
      return;
    }

    setLoading(true);

    try {
      const { subtotal_fc, subtotal_bc } = calculateTotals();
      
      const items: PRItemInput[] = lineItems.map((item) => ({
        product_id: item.product_id,
        requested_qty: item.requested_qty,
        estimated_unit_cost_fc: item.estimated_unit_cost_fc,
        line_total_fc: item.requested_qty * item.estimated_unit_cost_fc,
        line_total_bc: item.requested_qty * item.estimated_unit_cost_fc * formData.exchange_rate,
        notes: item.notes,
      }));

      const prData = {
        ...formData,
        subtotal_fc,
        subtotal_bc,
        discount_fc: 0,
        discount_bc: 0,
        tax_fc: 0,
        tax_bc: 0,
        total_fc: subtotal_fc,
        total_bc: subtotal_bc,
        status: "draft",
      };

      if (isEdit && id) {
        await updatePR.mutateAsync({
          id,
          pr: prData,
          items,
        });
        toast.success("تم تحديث طلب الشراء بنجاح");
      } else {
        await createPR.mutateAsync({
          pr: prData,
          items,
        });
        toast.success("تم إنشاء طلب الشراء بنجاح");
      }

      navigate("/purchases/requisitions");
    } catch (error) {
      console.error("Error saving PR:", error);
      toast.error("حدث خطأ أثناء حفظ طلب الشراء");
    } finally {
      setLoading(false);
    }
  };

  if (loadingPR && isEdit) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { subtotal_fc, subtotal_bc } = calculateTotals();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/purchases/requisitions")}>
          <ArrowRight className="h-4 w-4 ml-2" />
          رجوع
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? "تعديل طلب الشراء" : "طلب شراء جديد"}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? `تعديل الطلب رقم ${formData.pr_number}` : "إنشاء طلب شراء داخلي جديد"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>معلومات الطلب</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>رقم الطلب</Label>
              <Input value={formData.pr_number} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>المستودع</Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستودع" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الأولوية</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">عادي</SelectItem>
                  <SelectItem value="high">عالي</SelectItem>
                  <SelectItem value="urgent">عاجل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="أي ملاحظات إضافية..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>المنتجات المطلوبة</CardTitle>
            <Button type="button" variant="outline" onClick={addLineItem}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة منتج
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>سعر الوحدة التقديري</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>ملاحظات</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      لا توجد منتجات، اضغط "إضافة منتج" للبدء
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={item.product_id}
                          onValueChange={(value) => updateLineItem(index, "product_id", value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="اختر منتج" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.requested_qty}
                          onChange={(e) =>
                            updateLineItem(index, "requested_qty", parseInt(e.target.value) || 1)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.estimated_unit_cost_fc}
                          onChange={(e) =>
                            updateLineItem(index, "estimated_unit_cost_fc", parseFloat(e.target.value) || 0)
                          }
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {(item.requested_qty * item.estimated_unit_cost_fc).toLocaleString("ar-YE")} ر.ي
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.notes || ""}
                          onChange={(e) => updateLineItem(index, "notes", e.target.value)}
                          placeholder="ملاحظات"
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {lineItems.length > 0 && (
              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="text-xl font-bold">
                  الإجمالي: {subtotal_bc.toLocaleString("ar-YE")} ر.ي
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/purchases/requisitions")}
          >
            إلغاء
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            <Save className="h-4 w-4 ml-2" />
            {isEdit ? "حفظ التعديلات" : "حفظ الطلب"}
          </Button>
        </div>
      </form>
    </div>
  );
}
