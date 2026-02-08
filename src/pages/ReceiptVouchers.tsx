import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Eye, Banknote, Paperclip, AlertTriangle, History } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import { RecordCollectionDialog } from "@/components/receipts/RecordCollectionDialog";
import { CollectionHistory } from "@/components/receipts/CollectionHistory";
import { ReceiptAttachments } from "@/components/receipts/ReceiptAttachments";
import { CustomerPendingWarning } from "@/components/receipts/CustomerPendingWarning";

interface Receipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  customer_id: string | null;
  original_amount: number;
  collected_amount: number;
  remaining_amount: number;
  collection_status: string;
  status: string;
  description: string;
  notes: string | null;
  currency_code: string;
  received_from: string;
  customers?: { name: string; phone: string | null };
  cash_boxes?: { box_name: string };
}

interface CustomerWarning {
  customer_id: string;
  pending_receipts_limit: number;
  remaining_receipts_balance: number;
  credit_limit: number;
  invoices_balance: number;
  total_exposure: number;
  exceeds_pending_limit: boolean;
  exceeds_credit_limit: boolean;
  warnings: string[];
}

const ReceiptVouchers = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCollectionDialogOpen, setIsCollectionDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  
  // Form state
  const [customerId, setCustomerId] = useState("");
  const [cashBoxId, setCashBoxId] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [originalAmount, setOriginalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [receivedFrom, setReceivedFrom] = useState("");
  const [currencyCode, setCurrencyCode] = useState("YER");

  // Fetch receipts
  const { data: receipts, isLoading } = useQuery({
    queryKey: ["receipt-vouchers", searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("cash_receipts")
        .select(`
          *,
          customers (name, phone),
          cash_boxes (box_name)
        `)
        .order("receipt_date", { ascending: false });

      if (searchTerm) {
        query = query.or(`receipt_number.ilike.%${searchTerm}%,received_from.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("collection_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Receipt[];
    },
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ["customers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, currency_code, pending_receipts_limit, balance")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch cash boxes
  const { data: cashBoxes } = useQuery({
    queryKey: ["cash-boxes-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_boxes")
        .select("id, box_name, currency_code")
        .eq("is_active", true)
        .order("box_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch currencies
  const { data: currencies } = useQuery({
    queryKey: ["currencies-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currencies")
        .select("code, name, symbol")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Check customer pending warning
  const { data: customerWarning } = useQuery<CustomerWarning | null>({
    queryKey: ["customer-pending-warning", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data, error } = await supabase.rpc("check_customer_pending_receipts_warning", {
        p_customer_id: customerId,
      });
      if (error) throw error;
      return data as unknown as CustomerWarning;
    },
    enabled: !!customerId,
  });

  // Create receipt mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!cashBoxId || !originalAmount || !receivedFrom) {
        throw new Error("الرجاء ملء جميع الحقول المطلوبة");
      }

      // Generate receipt number
      const { count } = await supabase
        .from("cash_receipts")
        .select("*", { count: "exact", head: true });
      const receiptNumber = `RCV-${String((count || 0) + 1).padStart(6, "0")}`;

      const receiptData = {
        receipt_number: receiptNumber,
        receipt_date: receiptDate,
        cash_box_id: cashBoxId,
        customer_id: customerId || null,
        received_from: receivedFrom,
        amount: parseFloat(originalAmount),
        original_amount: parseFloat(originalAmount),
        collected_amount: 0,
        collection_status: "OPEN",
        currency_code: currencyCode,
        description: description,
        notes: notes || null,
        status: "draft",
      };

      const { data, error } = await supabase
        .from("cash_receipts")
        .insert(receiptData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("تم إنشاء سند القبض بنجاح");
      queryClient.invalidateQueries({ queryKey: ["receipt-vouchers"] });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء سند القبض");
    },
  });

  // Post receipt mutation
  const postMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      const { error } = await supabase
        .from("cash_receipts")
        .update({ status: "posted", posted_at: new Date().toISOString() })
        .eq("id", receiptId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم ترحيل سند القبض بنجاح");
      queryClient.invalidateQueries({ queryKey: ["receipt-vouchers"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء ترحيل سند القبض");
    },
  });

  const resetForm = () => {
    setCustomerId("");
    setCashBoxId("");
    setReceiptDate(new Date().toISOString().split("T")[0]);
    setOriginalAmount("");
    setDescription("");
    setNotes("");
    setReceivedFrom("");
    setCurrencyCode("YER");
  };

  const handleCustomerChange = (value: string) => {
    setCustomerId(value);
    const customer = customers?.find(c => c.id === value);
    if (customer) {
      setReceivedFrom(customer.name);
      if (customer.currency_code) {
        setCurrencyCode(customer.currency_code);
      }
    }
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsViewDialogOpen(true);
  };

  const handleOpenCollection = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsCollectionDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COLLECTED":
        return <Badge className="bg-green-500">محصّل بالكامل</Badge>;
      case "PARTIALLY_COLLECTED":
        return <Badge className="bg-amber-500">محصّل جزئياً</Badge>;
      case "OPEN":
        return <Badge variant="secondary">مفتوح</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCollectionProgress = (receipt: Receipt) => {
    if (receipt.original_amount === 0) return 0;
    return (receipt.collected_amount / receipt.original_amount) * 100;
  };

  const formatCurrency = (amount: number, currency: string = "YER") => {
    return amount.toLocaleString("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " " + (currency === "YER" ? "ر.ي" : currency === "SAR" ? "ر.س" : currency);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6" dir="rtl">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">جاري التحميل...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6" dir="rtl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">سندات القبض</CardTitle>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="ml-2 h-4 w-4" />
                سند قبض جديد
              </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم السند أو اسم المستلم منه..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="حالة التحصيل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="OPEN">مفتوح</SelectItem>
                  <SelectItem value="PARTIALLY_COLLECTED">محصّل جزئياً</SelectItem>
                  <SelectItem value="COLLECTED">محصّل بالكامل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {receipts && receipts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم السند</TableHead>
                    <TableHead>العميل / المستلم منه</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المبلغ الأصلي</TableHead>
                    <TableHead>المحصّل</TableHead>
                    <TableHead>المتبقي</TableHead>
                    <TableHead>نسبة التحصيل</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                      <TableCell>
                        {receipt.customers?.name || receipt.received_from}
                        {receipt.customers?.phone && (
                          <span className="block text-xs text-muted-foreground">
                            {receipt.customers.phone}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(receipt.receipt_date).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(receipt.original_amount, receipt.currency_code)}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(receipt.collected_amount, receipt.currency_code)}
                      </TableCell>
                      <TableCell className="text-orange-600">
                        {formatCurrency(receipt.remaining_amount, receipt.currency_code)}
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <Progress value={getCollectionProgress(receipt)} className="h-2" />
                          <span className="text-xs text-muted-foreground">
                            {getCollectionProgress(receipt).toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(receipt.collection_status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReceipt(receipt)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {receipt.status === "posted" && receipt.collection_status !== "COLLECTED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenCollection(receipt)}
                            >
                              <Banknote className="h-4 w-4 ml-1" />
                              تحصيل
                            </Button>
                          )}
                          {receipt.status === "draft" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => postMutation.mutate(receipt.id)}
                              disabled={postMutation.isPending}
                            >
                              ترحيل
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">لا توجد سندات قبض</p>
                <p className="text-sm">قم بإنشاء سند قبض جديد للبدء</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Receipt Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء سند قبض جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات سند القبض. سيبقى السند مفتوحاً للتحصيل الجزئي.
              </DialogDescription>
            </DialogHeader>
            
            {customerWarning && customerWarning.exceeds_pending_limit && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>تحذير: تجاوز حد سندات القبض المعلقة</AlertTitle>
                <AlertDescription>
                  رصيد السندات المعلقة ({formatCurrency(customerWarning.remaining_receipts_balance)}) 
                  يتجاوز الحد المسموح ({formatCurrency(customerWarning.pending_receipts_limit)})
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>العميل</Label>
                  <Select value={customerId} onValueChange={handleCustomerChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العميل (اختياري)" />
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
                  <Label>المستلم منه *</Label>
                  <Input
                    value={receivedFrom}
                    onChange={(e) => setReceivedFrom(e.target.value)}
                    placeholder="اسم الشخص المستلم منه"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>الصندوق *</Label>
                  <Select value={cashBoxId} onValueChange={setCashBoxId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الصندوق" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashBoxes?.map((box) => (
                        <SelectItem key={box.id} value={box.id}>
                          {box.box_name} ({box.currency_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>التاريخ *</Label>
                  <Input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>المبلغ الأصلي *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={originalAmount}
                    onChange={(e) => setOriginalAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>العملة</Label>
                  <Select value={currencyCode} onValueChange={setCurrencyCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العملة" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies?.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>البيان *</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="سبب القبض..."
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات إضافية..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                إلغاء
              </Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? "جاري الحفظ..." : "حفظ سند القبض"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Receipt Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>تفاصيل سند القبض - {selectedReceipt?.receipt_number}</DialogTitle>
            </DialogHeader>
            
            {selectedReceipt && (
              <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">البيانات</TabsTrigger>
                  <TabsTrigger value="collections">
                    <History className="h-4 w-4 ml-1" />
                    سجل التحصيل
                  </TabsTrigger>
                  <TabsTrigger value="attachments">
                    <Paperclip className="h-4 w-4 ml-1" />
                    المرفقات
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">رقم السند</Label>
                      <p className="font-semibold">{selectedReceipt.receipt_number}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">التاريخ</Label>
                      <p>{new Date(selectedReceipt.receipt_date).toLocaleDateString("ar-SA")}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">العميل / المستلم منه</Label>
                      <p>{selectedReceipt.customers?.name || selectedReceipt.received_from}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">الصندوق</Label>
                      <p>{selectedReceipt.cash_boxes?.box_name}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">البيان</Label>
                      <p>{selectedReceipt.description}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">حالة التحصيل</Label>
                      <p>{getStatusBadge(selectedReceipt.collection_status)}</p>
                    </div>
                  </div>

                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">المبلغ الأصلي</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(selectedReceipt.original_amount, selectedReceipt.currency_code)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">المحصّل</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(selectedReceipt.collected_amount, selectedReceipt.currency_code)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">المتبقي</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {formatCurrency(selectedReceipt.remaining_amount, selectedReceipt.currency_code)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Progress value={getCollectionProgress(selectedReceipt)} className="h-3" />
                        <p className="text-center text-sm mt-1">
                          {getCollectionProgress(selectedReceipt).toFixed(1)}% تم تحصيله
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedReceipt.status === "posted" && selectedReceipt.collection_status !== "COLLECTED" && (
                    <div className="flex justify-center">
                      <Button onClick={() => { setIsViewDialogOpen(false); handleOpenCollection(selectedReceipt); }}>
                        <Banknote className="h-4 w-4 ml-2" />
                        تسجيل تحصيل جديد
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="collections">
                  <CollectionHistory receiptId={selectedReceipt.id} />
                </TabsContent>

                <TabsContent value="attachments">
                  <ReceiptAttachments receiptId={selectedReceipt.id} />
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Record Collection Dialog */}
        {selectedReceipt && (
          <RecordCollectionDialog
            open={isCollectionDialogOpen}
            onOpenChange={setIsCollectionDialogOpen}
            receipt={selectedReceipt}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["receipt-vouchers"] });
              setIsCollectionDialogOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ReceiptVouchers;
