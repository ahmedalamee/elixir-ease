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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, FileText, CheckCircle2, Minus } from "lucide-react";

interface ReturnableInvoice {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  total_amount: number;
  has_returns: boolean;
}

interface ReturnableItem {
  item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  returned_qty: number;
  returnable_qty: number;
  unit_price: number;
  discount_percentage: number;
  tax_percentage: number;
  line_total: number;
}

interface ReturnItem extends ReturnableItem {
  return_quantity: number;
  condition: 'good' | 'damaged' | 'expired';
}

const SalesReturns = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [returnType, setReturnType] = useState("full");
  const [returnReason, setReturnReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  
  const queryClient = useQueryClient();

  // جلب المرتجعات
  const { data: returns, isLoading } = useQuery({
    queryKey: ["sales-returns", searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("sales_returns")
        .select(`
          *,
          customers (name),
          sales_invoices (invoice_number),
          warehouses (name)
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
    queryKey: ["returnable-invoices", invoiceSearch],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_returnable_sales_invoices", {
        p_search: invoiceSearch || null,
      });
      if (error) throw error;
      return data as ReturnableInvoice[];
    },
    enabled: showCreateDialog,
  });

  // جلب عناصر الفاتورة المختارة
  const { data: invoiceItems } = useQuery({
    queryKey: ["invoice-items", selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) return [];
      const { data, error } = await supabase.rpc("get_returnable_invoice_items", {
        p_invoice_id: selectedInvoiceId,
      });
      if (error) throw error;
      return data as ReturnableItem[];
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

      const items = returnItems.map(item => ({
        invoice_item_id: item.item_id,
        item_id: item.product_id,
        quantity: item.return_quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage || 0,
        tax_percentage: item.tax_percentage || 0,
        line_total: (item.unit_price * item.return_quantity * (1 - (item.discount_percentage || 0) / 100)),
        condition: item.condition,
      }));

      const { data, error } = await supabase.rpc("create_sales_return", {
        p_sales_invoice_id: selectedInvoiceId,
        p_return_type: returnType,
        p_reason: returnReason,
        p_refund_method: refundMethod,
        p_items: items,
        p_notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
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
      const { data, error } = await supabase.rpc("post_sales_return", {
        p_return_id: returnId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("تم ترحيل المرتجع بنجاح");
      queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
    },
    onError: (error: any) => {
      toast.error(`فشل ترحيل المرتجع: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedInvoiceId("");
    setInvoiceSearch("");
    setReturnType("full");
    setReturnReason("");
    setRefundMethod("cash");
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
    return returnItems.reduce((sum, item) => {
      const itemTotal = item.unit_price * item.return_quantity * (1 - (item.discount_percentage || 0) / 100);
      return sum + itemTotal;
    }, 0);
  };

  const calculateTax = () => {
    return returnItems.reduce((sum, item) => {
      const itemTotal = item.unit_price * item.return_quantity * (1 - (item.discount_percentage || 0) / 100);
      const taxAmount = itemTotal * ((item.tax_percentage || 0) / 100);
      return sum + taxAmount;
    }, 0);
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
              مرتجعات المبيعات
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
                  <TableHead>الفاتورة الأصلية</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>المستودع</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ المسترد</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns?.map((returnItem: any) => (
                  <TableRow key={returnItem.id}>
                    <TableCell className="font-medium">{returnItem.return_number}</TableCell>
                    <TableCell>{returnItem.sales_invoices?.invoice_number}</TableCell>
                    <TableCell>{returnItem.customers?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{returnItem.warehouses?.name || 'غير محدد'}</TableCell>
                    <TableCell>{new Date(returnItem.return_date).toLocaleDateString("ar-SA")}</TableCell>
                    <TableCell className="font-medium">{returnItem.refund_amount?.toFixed(2)} ر.س</TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {returns?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد مرتجعات مبيعات
              </div>
            )}
          </CardContent>
        </Card>

        {/* نموذج إنشاء مرتجع */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء مرتجع مبيعات جديد</DialogTitle>
              <DialogDescription>
                اختر الفاتورة الأصلية وحدد المنتجات المراد إرجاعها
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* اختيار الفاتورة */}
              <div className="space-y-3">
                <Label>البحث عن الفاتورة الأصلية</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="ابحث برقم الفاتورة أو اسم العميل..."
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
                            <p className="text-sm text-muted-foreground">{invoice.customer_name}</p>
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
                          <TableHead>المرتجع سابقاً</TableHead>
                          <TableHead>المتاح للإرجاع</TableHead>
                          <TableHead>السعر</TableHead>
                          <TableHead>الإجراء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.map((item) => (
                          <TableRow key={item.item_id}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.returned_qty}</TableCell>
                            <TableCell className="font-medium">{item.returnable_qty}</TableCell>
                            <TableCell>{item.unit_price.toFixed(2)} ر.س</TableCell>
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
                      <div key={item.item_id} className="flex items-center gap-3 p-3 border rounded-md">
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            السعر: {item.unit_price.toFixed(2)} ر.س
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleUpdateItemQuantity(item.item_id, item.return_quantity - 1)}
                            disabled={item.return_quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={item.return_quantity}
                            onChange={(e) => handleUpdateItemQuantity(item.item_id, Number(e.target.value))}
                            className="w-20 text-center"
                            min={1}
                            max={item.returnable_qty}
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleUpdateItemQuantity(item.item_id, item.return_quantity + 1)}
                            disabled={item.return_quantity >= item.returnable_qty}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Select
                          value={item.condition}
                          onValueChange={(value: 'good' | 'damaged' | 'expired') => 
                            handleUpdateItemCondition(item.item_id, value)
                          }
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
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleRemoveItem(item.item_id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">المجموع الفرعي:</span>
                        <span className="font-medium">{calculateTotal().toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">الضريبة:</span>
                        <span className="font-medium">{calculateTax().toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>الإجمالي:</span>
                        <span>{calculateGrandTotal().toFixed(2)} ر.س</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* تفاصيل المرتجع */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>نوع المرتجع</Label>
                  <Select value={returnType} onValueChange={setReturnType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">إرجاع كامل</SelectItem>
                      <SelectItem value="partial">إرجاع جزئي</SelectItem>
                      <SelectItem value="exchange">استبدال</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>طريقة الاسترداد</Label>
                  <Select value={refundMethod} onValueChange={setRefundMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="credit">رصيد للعميل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>سبب الإرجاع <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="اذكر سبب الإرجاع... (إلزامي)"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  required
                  className={!returnReason && returnItems.length > 0 ? "border-destructive" : ""}
                />
                {!returnReason && returnItems.length > 0 && (
                  <p className="text-sm text-destructive mt-1">هذا الحقل إلزامي</p>
                )}
              </div>

              <div>
                <Label>ملاحظات إضافية</Label>
                <Textarea
                  placeholder="ملاحظات..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                  إلغاء
                </Button>
                <Button
                  onClick={() => createReturnMutation.mutate()}
                  disabled={!selectedInvoiceId || returnItems.length === 0 || !returnReason.trim() || createReturnMutation.isPending}
                >
                  {createReturnMutation.isPending ? "جارٍ الإنشاء..." : "إنشاء المرتجع"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SalesReturns;