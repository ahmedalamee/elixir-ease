import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, FileText, CheckCircle2, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ReturnableInvoice {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  has_returns: boolean;
  days_since_invoice: number;
}

interface ReturnableItem {
  item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  returned_qty: number;
  returnable_qty: number;
  unit_cost: number;
}

interface ReturnItem extends ReturnableItem {
  return_quantity: number;
  condition: 'good' | 'damaged' | 'expired';
}

const PurchaseReturns = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [notes, setNotes] = useState("");
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  
  const queryClient = useQueryClient();

  // جلب المرتجعات
  const { data: returns, isLoading } = useQuery({
    queryKey: ["purchase-returns", searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("purchase_returns")
        .select(`
          *,
          suppliers (name),
          purchase_invoices (pi_number)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`return_number.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // جلب الفواتير المؤهلة للإرجاع
  const { data: returnableInvoices } = useQuery({
    queryKey: ["returnable-purchase-invoices", invoiceSearch],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_returnable_purchase_invoices", {
        p_search: invoiceSearch || null,
      });
      if (error) throw error;
      return data as ReturnableInvoice[];
    },
    enabled: showCreateDialog,
  });

  // جلب عناصر الفاتورة المختارة
  const { data: invoiceItems } = useQuery({
    queryKey: ["purchase-invoice-items", selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) return [];
      const { data, error } = await supabase
        .from("pi_items")
        .select(`
          id,
          item_id,
          qty_invoiced,
          unit_cost,
          products (id, name)
        `)
        .eq("pi_id", selectedInvoiceId);
      
      if (error) throw error;
      
      return data.map((item: any) => ({
        item_id: item.id,
        product_id: item.item_id,
        product_name: item.products?.name || 'منتج غير معروف',
        quantity: item.qty_invoiced,
        returned_qty: 0,
        returnable_qty: item.qty_invoiced,
        unit_cost: item.unit_cost,
      })) as ReturnableItem[];
    },
    enabled: !!selectedInvoiceId,
  });

  // إنشاء مرتجع جديد
  const createReturnMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInvoiceId || returnItems.length === 0) {
        throw new Error("يرجى اختيار فاتورة وإضافة منتجات للمرتجع");
      }

      if (!returnReason.trim()) {
        throw new Error("يرجى إدخال سبب الإرجاع");
      }

      // جلب بيانات الفاتورة للحصول على supplier_id و warehouse_id
      const { data: invoice, error: invoiceError } = await supabase
        .from("purchase_invoices")
        .select("supplier_id, warehouse_id")
        .eq("id", selectedInvoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const subtotal = returnItems.reduce((sum, item) => sum + (item.unit_cost * item.return_quantity), 0);
      const taxAmount = subtotal * 0.15; // VAT 15%
      const totalAmount = subtotal + taxAmount;

      // توليد رقم المرتجع
      const { data: maxReturn } = await supabase
        .from("purchase_returns")
        .select("return_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const nextNumber = maxReturn?.return_number
        ? parseInt(maxReturn.return_number.replace("PR-", "")) + 1
        : 1;
      const returnNumber = `PR-${String(nextNumber).padStart(6, "0")}`;

      // إنشاء المرتجع
      const { data: returnData, error: returnError } = await supabase
        .from("purchase_returns")
        .insert([{
          return_number: returnNumber,
          return_type: returnItems.length === invoiceItems?.length ? 'full' : 'partial',
          purchase_invoice_id: selectedInvoiceId,
          supplier_id: invoice.supplier_id,
          warehouse_id: invoice.warehouse_id,
          return_date: new Date().toISOString().split('T')[0],
          reason: returnReason,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          refund_amount: totalAmount,
          status: 'draft',
          notes,
        }])
        .select()
        .single();

      if (returnError) throw returnError;

      // إضافة بنود المرتجع
      const items = returnItems.map((item, index) => ({
        return_id: returnData.id,
        pi_item_id: item.item_id,
        item_id: item.product_id,
        quantity: item.return_quantity,
        unit_cost: item.unit_cost,
        line_total: item.unit_cost * item.return_quantity,
        condition: item.condition,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_return_items")
        .insert(items);

      if (itemsError) throw itemsError;

      return returnData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
      toast.success("تم إنشاء المرتجع بنجاح");
      resetForm();
      setShowCreateDialog(false);
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إنشاء المرتجع: ${error.message}`);
    },
  });

  // ترحيل المرتجع
  const postReturnMutation = useMutation({
    mutationFn: async (returnId: string) => {
      const { data, error } = await supabase.rpc("post_purchase_return", {
        p_return_id: returnId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      const result = data as { debit_note_number?: string; total_cost_reversed?: number };
      toast.success(
        `تم ترحيل المرتجع بنجاح${result?.debit_note_number ? ` - إشعار مدين: ${result.debit_note_number}` : ''}`
      );
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
    },
    onError: (error: any) => {
      toast.error(`فشل ترحيل المرتجع: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedInvoiceId("");
    setInvoiceSearch("");
    setReturnReason("");
    setNotes("");
    setReturnItems([]);
  };

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setReturnItems([]);
  };

  const handleAddItem = (item: ReturnableItem) => {
    if (returnItems.find(i => i.item_id === item.item_id)) {
      toast.error("هذا المنتج مضاف بالفعل");
      return;
    }
    setReturnItems([...returnItems, { ...item, return_quantity: item.returnable_qty, condition: 'good' }]);
  };

  const handleUpdateItemQuantity = (itemId: string, quantity: number) => {
    setReturnItems(items => 
      items.map(item => 
        item.item_id === itemId 
          ? { ...item, return_quantity: Math.min(Math.max(1, quantity), item.returnable_qty) }
          : item
      )
    );
  };

  const handleUpdateItemCondition = (itemId: string, condition: 'good' | 'damaged' | 'expired') => {
    setReturnItems(items => 
      items.map(item => 
        item.item_id === itemId ? { ...item, condition } : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setReturnItems(items => items.filter(item => item.item_id !== itemId));
  };

  const calculateTotal = () => {
    return returnItems.reduce((sum, item) => sum + (item.unit_cost * item.return_quantity), 0);
  };

  const calculateTax = () => {
    return calculateTotal() * 0.15;
  };

  const calculateGrandTotal = () => {
    return calculateTotal() + calculateTax();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: "secondary", label: "مسودة" },
      posted: { variant: "default", label: "مرحل" },
      cancelled: { variant: "destructive", label: "ملغي" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
              <FileText className="h-6 w-6" />
              مرتجعات المشتريات
            </CardTitle>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              إنشاء مرتجع جديد
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم المرتجع..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="posted">مرحل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم المرتجع</TableHead>
                  <TableHead>الإشعار المدين</TableHead>
                  <TableHead>فاتورة الشراء</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ المسترد</TableHead>
                  <TableHead>التكلفة المعكوسة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns?.map((returnItem: any) => (
                  <TableRow key={returnItem.id}>
                    <TableCell className="font-medium">{returnItem.return_number}</TableCell>
                    <TableCell className="text-primary font-medium">
                      {returnItem.debit_note_number || '-'}
                    </TableCell>
                    <TableCell>{returnItem.purchase_invoices?.pi_number}</TableCell>
                    <TableCell>{returnItem.suppliers?.name}</TableCell>
                    <TableCell>{new Date(returnItem.return_date).toLocaleDateString("ar-SA")}</TableCell>
                    <TableCell className="font-medium">{returnItem.refund_amount?.toFixed(2)} ر.س</TableCell>
                    <TableCell className="text-muted-foreground">
                      {returnItem.total_cost_reversed ? `${returnItem.total_cost_reversed.toFixed(2)} ر.س` : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(returnItem.status)}</TableCell>
                    <TableCell>
                      {returnItem.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => postReturnMutation.mutate(returnItem.id)}
                          disabled={postReturnMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          ترحيل
                        </Button>
                      )}
                      {returnItem.journal_entry_id && (
                        <Badge variant="outline" className="mr-2">
                          قيد محاسبي
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {returns?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد مرتجعات مشتريات
              </div>
            )}
          </CardContent>
        </Card>

        {/* نموذج إنشاء مرتجع */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء مرتجع مشتريات جديد</DialogTitle>
              <DialogDescription>
                اختر فاتورة الشراء الأصلية وحدد المنتجات المراد إرجاعها
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* اختيار الفاتورة */}
              <div className="space-y-3">
                <Label>البحث عن فاتورة الشراء الأصلية</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="ابحث برقم الفاتورة أو اسم المورد..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                  />
                  <Button variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                {returnableInvoices && returnableInvoices.length > 0 && (
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {returnableInvoices.map((invoice) => (
                      <div
                        key={invoice.invoice_id}
                        className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-accent ${
                          selectedInvoiceId === invoice.invoice_id ? 'bg-accent' : ''
                        }`}
                        onClick={() => handleSelectInvoice(invoice.invoice_id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{invoice.invoice_number}</p>
                            <p className="text-sm text-muted-foreground">{invoice.supplier_name}</p>
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{invoice.total_amount.toFixed(2)} ر.س</p>
                            <p className="text-sm text-muted-foreground">{invoice.invoice_date}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* عناصر الفاتورة */}
              {selectedInvoiceId && invoiceItems && invoiceItems.length > 0 && (
                <div className="space-y-3">
                  <Label>المنتجات المتاحة للإرجاع</Label>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>المنتج</TableHead>
                          <TableHead>الكمية الأصلية</TableHead>
                          <TableHead>المتاح للإرجاع</TableHead>
                          <TableHead>التكلفة</TableHead>
                          <TableHead>الإجراء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.map((item) => (
                          <TableRow key={item.item_id}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="font-medium">{item.returnable_qty}</TableCell>
                            <TableCell>{item.unit_cost.toFixed(2)} ر.س</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddItem(item)}
                                disabled={returnItems.some(i => i.item_id === item.item_id)}
                              >
                                <Plus className="h-4 w-4 ml-1" />
                                إضافة
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* المنتجات المضافة للمرتجع */}
              {returnItems.length > 0 && (
                <div className="space-y-3">
                  <Label>المنتجات المحددة للإرجاع</Label>
                  <div className="border rounded-md p-4 space-y-3">
                    {returnItems.map((item) => (
                      <div key={item.item_id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            التكلفة: {item.unit_cost.toFixed(2)} ر.س
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => handleUpdateItemQuantity(item.item_id, item.return_quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              value={item.return_quantity}
                              onChange={(e) => handleUpdateItemQuantity(item.item_id, parseInt(e.target.value) || 1)}
                              className="w-16 text-center"
                              min={1}
                              max={item.returnable_qty}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => handleUpdateItemQuantity(item.item_id, item.return_quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <Select 
                            value={item.condition} 
                            onValueChange={(value) => handleUpdateItemCondition(item.item_id, value as any)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="good">سليم</SelectItem>
                              <SelectItem value="damaged">تالف</SelectItem>
                              <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="font-medium w-24 text-left">
                            {(item.unit_cost * item.return_quantity).toFixed(2)} ر.س
                          </p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleRemoveItem(item.item_id)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* الإجماليات */}
                    <div className="border-t pt-3 mt-3 space-y-2">
                      <div className="flex justify-between">
                        <span>المجموع الفرعي:</span>
                        <span>{calculateTotal().toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between">
                        <span>الضريبة (15%):</span>
                        <span>{calculateTax().toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>الإجمالي:</span>
                        <span>{calculateGrandTotal().toFixed(2)} ر.س</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* سبب الإرجاع */}
              <div className="space-y-2">
                <Label>سبب الإرجاع *</Label>
                <Textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="أدخل سبب إرجاع المنتجات..."
                  className="min-h-20"
                />
              </div>

              {/* ملاحظات */}
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              {/* أزرار الإجراء */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { resetForm(); setShowCreateDialog(false); }}>
                  إلغاء
                </Button>
                <Button
                  onClick={() => createReturnMutation.mutate()}
                  disabled={createReturnMutation.isPending || returnItems.length === 0 || !returnReason.trim()}
                >
                  {createReturnMutation.isPending ? "جارٍ الحفظ..." : "إنشاء المرتجع"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PurchaseReturns;
