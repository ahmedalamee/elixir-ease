import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Eye } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const CustomerPayments = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  
  // Payment form state
  const [customerId, setCustomerId] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState<{ invoice_id: string; allocated_amount: number }[]>([]);

  // Fetch payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ["customer-payments", searchTerm],
    queryFn: async () => {
      let query = (supabase as any)
        .from("customer_payments")
        .select(`
          *,
          customers (name, phone),
          payment_methods (name)
        `)
        .order("payment_date", { ascending: false });

      if (searchTerm) {
        query = query.or(`payment_number.ilike.%${searchTerm}%,reference_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");
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

  // Fetch unpaid invoices for selected customer
  const { data: unpaidInvoices } = useQuery({
    queryKey: ["unpaid-invoices", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await (supabase as any)
        .from("sales_invoices")
        .select("id, invoice_number, total_amount, paid_amount")
        .eq("customer_id", customerId)
        .neq("payment_status", "paid")
        .eq("status", "posted");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!customerId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!customerId || !paymentMethodId || !amount) {
        throw new Error("الرجاء ملء جميع الحقول المطلوبة");
      }

      const { data: userData } = await supabase.auth.getUser();

      // Generate payment number
      const { count } = await (supabase as any)
        .from("customer_payments")
        .select("*", { count: "exact", head: true });
      const paymentNumber = `PAY-${String((count || 0) + 1).padStart(6, "0")}`;

      const paymentData = {
        payment_number: paymentNumber,
        customer_id: customerId,
        payment_date: paymentDate,
        payment_method_id: paymentMethodId,
        amount: parseFloat(amount),
        reference_number: referenceNo || null,
        notes: notes || null,
        created_by: userData?.user?.id,
      };

      const { data: payment, error: paymentError } = await (supabase as any)
        .from("customer_payments")
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Insert allocations if any
      if (selectedInvoices.length > 0) {
        const allocations = selectedInvoices.map((inv) => ({
          payment_id: payment.id,
          invoice_id: inv.invoice_id,
          allocated_amount: inv.allocated_amount,
        }));

        const { error: allocError } = await (supabase as any)
          .from("customer_payment_allocations")
          .insert(allocations);

        if (allocError) throw allocError;
      }

      return payment;
    },
    onSuccess: () => {
      toast.success("تم حفظ الدفعة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["customer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      resetForm();
      setIsAddPaymentDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("Error saving payment:", error);
      toast.error(error.message || "حدث خطأ أثناء حفظ الدفعة");
    },
  });

  const resetForm = () => {
    setCustomerId("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethodId("");
    setAmount("");
    setReferenceNo("");
    setNotes("");
    setSelectedInvoices([]);
  };

  const handleAllocateToInvoice = (invoiceId: string, allocatedAmount: number) => {
    setSelectedInvoices((prev) => {
      const existing = prev.find((inv) => inv.invoice_id === invoiceId);
      if (existing) {
        return prev.map((inv) =>
          inv.invoice_id === invoiceId ? { ...inv, allocated_amount: allocatedAmount } : inv
        );
      }
      return [...prev, { invoice_id: invoiceId, allocated_amount: allocatedAmount }];
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">مدفوعات العملاء</CardTitle>
            <Button onClick={() => setIsAddPaymentDialogOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              دفعة جديدة
            </Button>
          </div>

          <div className="relative mt-4">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الدفعة أو المرجع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardHeader>

        <CardContent>
          {payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الدفعة</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>المرجع</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.payment_number}</TableCell>
                    <TableCell>{payment.customers?.name}</TableCell>
                    <TableCell>
                      {new Date(payment.payment_date).toLocaleDateString("ar-SA")}
                    </TableCell>
                    <TableCell>
                      {payment.amount.toLocaleString("ar-SA", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ر.س
                    </TableCell>
                    <TableCell>{payment.payment_methods?.name}</TableCell>
                    <TableCell>{payment.reference_number || "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-4">لا توجد مدفوعات حالياً</p>
              <p className="text-sm">قم بإضافة دفعة جديدة للبدء</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={isAddPaymentDialogOpen} onOpenChange={setIsAddPaymentDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة دفعة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>العميل *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>التاريخ *</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>طريقة الدفع *</Label>
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
                <Label>المبلغ *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>رقم المرجع</Label>
                <Input
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="رقم الإيصال أو الشيك..."
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أضف ملاحظات..."
                  rows={2}
                />
              </div>
            </div>

            {/* Unpaid Invoices */}
            {unpaidInvoices && unpaidInvoices.length > 0 && (
              <div className="space-y-2">
                <Label>توزيع الدفعة على الفواتير</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>الإجمالي</TableHead>
                      <TableHead>المدفوع</TableHead>
                      <TableHead>المتبقي</TableHead>
                      <TableHead>المبلغ المخصص</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidInvoices.map((invoice) => {
                      const remaining = invoice.total_amount - invoice.paid_amount;
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.invoice_number}</TableCell>
                          <TableCell>{invoice.total_amount.toFixed(2)}</TableCell>
                          <TableCell>{invoice.paid_amount.toFixed(2)}</TableCell>
                          <TableCell className="text-red-600">{remaining.toFixed(2)}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={remaining}
                              placeholder="0.00"
                              className="w-32"
                              onChange={(e) =>
                                handleAllocateToInvoice(invoice.id, parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddPaymentDialogOpen(false);
                resetForm();
              }}
            >
              إلغاء
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "جاري الحفظ..." : "حفظ الدفعة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerPayments;
