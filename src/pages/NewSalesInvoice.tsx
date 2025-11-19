import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Save, Search, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CustomerCombobox } from "@/components/customers/CustomerCombobox";
import { CustomerInfoCard } from "@/components/customers/CustomerInfoCard";

interface InvoiceItem {
  item_id: string;
  item_name: string;
  uom_id: string;
  qty: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  tax_code: string;
  tax_percentage: number;
  tax_amount: number;
  line_total: number;
}

const NewSalesInvoice = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Product Selection Dialog
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);
  const [productSearch, setProductSearch] = useState("");
  const [stockWarnings, setStockWarnings] = useState<Record<string, string>>({});

  // Note: Customer fetching now handled by CustomerCombobox component

  // Fetch warehouses
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("sellable", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch taxes
  const { data: taxes } = useQuery({
    queryKey: ["taxes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxes")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch payment methods
  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch stock levels for warehouse
  const { data: stockLevels } = useQuery({
    queryKey: ["stock-levels", warehouseId],
    queryFn: async () => {
      if (!warehouseId) return [];
      const { data, error } = await supabase
        .from("warehouse_stock")
        .select("item_id, qty_on_hand")
        .eq("warehouse_id", warehouseId);
      if (error) throw error;
      return data;
    },
    enabled: !!warehouseId,
  });

  // Filter products by search
  const filteredProducts = products?.filter((p) =>
    productSearch
      ? p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(productSearch.toLowerCase())
      : true
  );

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discount_amount, 0);
  const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
  const totalAmount = subtotal - totalDiscount + totalTax;

  const handleAddItem = () => {
    if (!selectedProductId) {
      toast.error("الرجاء اختيار منتج");
      return;
    }

    if (!warehouseId) {
      toast.error("الرجاء اختيار المستودع أولاً");
      return;
    }

    const product = products?.find((p) => p.id === selectedProductId);
    if (!product) return;

    // Check stock availability
    const stockLevel = stockLevels?.find((s) => s.item_id === selectedProductId);
    const availableQty = stockLevel?.qty_on_hand || 0;
    
    if (selectedQty > availableQty) {
      toast.error(`الكمية المتوفرة في المخزون: ${availableQty}`);
      return;
    }

    // Get default tax - use first active tax if available
    const defaultTax = taxes?.[0];
    const taxRate = defaultTax?.rate || 0;
    const taxCode = defaultTax?.tax_code || "";

    const unitPrice = product.price;
    const discountAmount = 0;
    const lineSubtotal = selectedQty * unitPrice - discountAmount;
    const taxAmount = lineSubtotal * (taxRate / 100);
    const lineTotal = lineSubtotal + taxAmount;

    const newItem: InvoiceItem = {
      item_id: product.id,
      item_name: product.name,
      uom_id: product.base_uom_id || "",
      qty: selectedQty,
      unit_price: unitPrice,
      discount_percentage: 0,
      discount_amount: discountAmount,
      tax_code: taxCode,
      tax_percentage: taxRate,
      tax_amount: taxAmount,
      line_total: lineTotal,
    };

    setItems([...items, newItem]);
    setIsAddItemDialogOpen(false);
    setSelectedProductId("");
    setSelectedQty(1);
    setProductSearch("");
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItemQty = (index: number, qty: number) => {
    const updatedItems = [...items];
    const item = updatedItems[index];
    const lineSubtotal = qty * item.unit_price - item.discount_amount;
    const taxAmount = lineSubtotal * (item.tax_percentage / 100);
    item.qty = qty;
    item.tax_amount = taxAmount;
    item.line_total = lineSubtotal + taxAmount;
    setItems(updatedItems);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!customerId || !warehouseId || items.length === 0) {
        throw new Error("الرجاء ملء جميع الحقول المطلوبة وإضافة بند واحد على الأقل");
      }

      // Generate invoice number using RPC function
      const { data: invoiceNumber, error: numberError } = await supabase.rpc(
        "generate_si_number"
      );

      if (numberError) {
        console.error("Error generating invoice number:", numberError);
        throw new Error("فشل في إنشاء رقم الفاتورة");
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser();

      // Create invoice object
      const invoiceData: any = {
        invoice_number: invoiceNumber,
        customer_id: customerId,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        warehouse_id: warehouseId,
        subtotal: subtotal - totalDiscount,
        discount_amount: totalDiscount,
        tax_amount: totalTax,
        total_amount: totalAmount,
        status: "draft",
        payment_status: "unpaid",
        paid_amount: 0,
        notes,
        created_by: userData?.user?.id,
      };

      // Insert invoice
      const { data: invoice, error: invoiceError } = await (supabase as any)
        .from("sales_invoices")
        .insert(invoiceData)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Insert invoice items
      const itemsToInsert = items.map((item, index) => ({
        invoice_id: invoice.id,
        line_no: index + 1,
        item_id: item.item_id,
        uom_id: item.uom_id,
        quantity: item.qty,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
        tax_percentage: item.tax_percentage,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("sales_invoice_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      return invoice;
    },
    onSuccess: (invoice) => {
      toast.success("تم حفظ الفاتورة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      navigate(`/sales/invoice/${invoice.id}`);
    },
    onError: (error: any) => {
      console.error("Error saving invoice:", error);
      toast.error(error.message || "حدث خطأ أثناء حفظ الفاتورة");
    },
  });

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">إنشاء فاتورة مبيعات جديدة</CardTitle>
            <Button variant="outline" onClick={() => navigate("/sales/invoices")}>
              رجوع
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* معلومات الفاتورة */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">العميل *</Label>
              <CustomerCombobox
                value={customerId}
                onValueChange={setCustomerId}
                placeholder="ابحث عن عميل..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse">المستودع *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستودع" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">تاريخ الفاتورة *</Label>
              <Input
                id="date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">تاريخ الاستحقاق</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">طريقة الدفع</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods?.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentAmount">المبلغ المدفوع</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* عرض معلومات العميل */}
          {customerId && customerId !== "walk-in" && (
            <CustomerInfoCard customerId={customerId} />
          )}

          {/* بنود الفاتورة */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">بنود الفاتورة</h3>
              <Button onClick={() => setIsAddItemDialogOpen(true)}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة بند
              </Button>
            </div>

            {items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>الخصم</TableHead>
                    <TableHead>الضريبة</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleUpdateItemQty(index, Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>{item.unit_price.toFixed(2)}</TableCell>
                      <TableCell>{item.discount_amount.toFixed(2)}</TableCell>
                      <TableCell>
                        {item.tax_percentage}% ({item.tax_amount.toFixed(2)})
                      </TableCell>
                      <TableCell className="font-bold">{item.line_total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>لم يتم إضافة بنود بعد</p>
              </div>
            )}
          </div>

          {/* الإجماليات */}
          {items.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="w-full md:w-1/3 space-y-2">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي:</span>
                    <span>{subtotal.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الخصم:</span>
                    <span className="text-red-600">-{totalDiscount.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الضريبة:</span>
                    <span>{totalTax.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>الإجمالي:</span>
                    <span>{totalAmount.toFixed(2)} ر.س</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ملاحظات */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              placeholder="أضف ملاحظات إضافية..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Payment Summary */}
          {paymentAmount > 0 && items.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p>
                    <strong>المبلغ الإجمالي:</strong> {totalAmount.toFixed(2)} ر.س
                  </p>
                  <p>
                    <strong>المبلغ المدفوع:</strong> {paymentAmount.toFixed(2)} ر.س
                  </p>
                  <p>
                    <strong>المتبقي:</strong>{" "}
                    <span className={paymentAmount >= totalAmount ? "text-green-600" : "text-orange-600"}>
                      {(totalAmount - paymentAmount).toFixed(2)} ر.س
                    </span>
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* الأزرار */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => navigate("/sales/invoices")}>
              إلغاء
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="ml-2 h-4 w-4" />
              {saveMutation.isPending ? "جاري الحفظ..." : "حفظ الفاتورة"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة منتج</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>بحث عن المنتج (الاسم أو الباركود)</Label>
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالاسم أو الباركود..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>المنتج</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنتج" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts?.map((product) => {
                    const stockLevel = stockLevels?.find((s) => s.item_id === product.id);
                    const availableQty = stockLevel?.qty_on_hand || 0;
                    return (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {product.price.toFixed(2)} ر.س (متوفر: {availableQty})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الكمية</Label>
              <Input
                type="number"
                min="1"
                value={selectedQty}
                onChange={(e) => setSelectedQty(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddItem}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewSalesInvoice;
