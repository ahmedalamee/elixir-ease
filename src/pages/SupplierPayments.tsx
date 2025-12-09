import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, CreditCard, Eye, Check, Search, Filter, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { InvoiceCurrencyPanel } from '@/components/currency';
import { getExchangeRate, getBaseCurrencyCode } from '@/lib/currency';
import { getCurrencySymbol } from '@/lib/tax';

interface SupplierPayment {
  id: string;
  payment_number: string;
  supplier_id: string;
  payment_date: string;
  currency_code: string;
  exchange_rate: number;
  amount_fc: number;
  amount_bc: number;
  payment_method: string;
  cash_box_id?: string;
  bank_account_id?: string;
  reference_number?: string;
  notes?: string;
  status: string;
  created_at: string;
  suppliers?: { name: string; code?: string };
  cash_boxes?: { box_name: string };
}

interface OutstandingInvoice {
  id: string;
  pi_number: string;
  invoice_date: string;
  total_amount: number;
  paid_amount: number;
  remaining: number;
  currency_code: string;
  selected: boolean;
  allocationAmount: number;
}

export default function SupplierPayments() {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [cashBoxes, setCashBoxes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<SupplierPayment | null>(null);
  const [selectedPaymentAllocations, setSelectedPaymentAllocations] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashBoxId, setCashBoxId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);

  // Multi-currency state
  const [currencyCode, setCurrencyCode] = useState<string>('YER');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [baseCurrency, setBaseCurrency] = useState<string>('YER');

  useEffect(() => {
    fetchPayments();
    fetchSuppliers();
    fetchCashBoxes();
    loadBaseCurrency();
  }, []);

  const loadBaseCurrency = async () => {
    try {
      const base = await getBaseCurrencyCode();
      setBaseCurrency(base);
    } catch (error) {
      console.error('Error loading base currency:', error);
    }
  };

  const handleCurrencyChange = useCallback((currency: string, rate: number) => {
    const effectiveRate = currency === baseCurrency ? 1 : rate;
    setCurrencyCode(currency);
    setExchangeRate(effectiveRate);
  }, [baseCurrency]);

  // Update currency when supplier changes
  useEffect(() => {
    const loadSupplierData = async () => {
      if (supplierId) {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (supplier) {
          const supplierCurrency = supplier.currency_code || baseCurrency;
          setCurrencyCode(supplierCurrency);
          
          if (supplierCurrency !== baseCurrency) {
            try {
              const rate = await getExchangeRate(supplierCurrency, baseCurrency, paymentDate);
              setExchangeRate(rate);
            } catch (error) {
              console.error('Error fetching exchange rate:', error);
              setExchangeRate(1);
            }
          } else {
            setExchangeRate(1);
          }

          // Fetch outstanding invoices for this supplier
          fetchOutstandingInvoices(supplierId);
          
          // Filter cash boxes by currency
          filterCashBoxesByCurrency(supplierCurrency);
        }
      }
    };
    loadSupplierData();
  }, [supplierId, suppliers, baseCurrency, paymentDate]);

  const filterCashBoxesByCurrency = (currency: string) => {
    const filteredBoxes = cashBoxes.filter(box => 
      box.currency_code === currency || !box.currency_code
    );
    if (filteredBoxes.length > 0) {
      setCashBoxId(filteredBoxes[0].id);
    }
  };

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_payments')
        .select(`
          *,
          suppliers(name, code),
          cash_boxes(box_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      toast.error(`خطأ في تحميل المدفوعات: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, code, currency_code, balance')
      .eq('is_active', true)
      .order('name');
    setSuppliers(data || []);
  };

  const fetchCashBoxes = async () => {
    const { data } = await supabase
      .from('cash_boxes')
      .select('id, box_name, currency_code, current_balance')
      .eq('is_active', true)
      .order('box_name');
    setCashBoxes(data || []);
  };

  const fetchOutstandingInvoices = async (supplierId: string) => {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select('id, pi_number, invoice_date, total_amount, paid_amount, currency_code')
      .eq('supplier_id', supplierId)
      .eq('status', 'posted')
      .or('payment_status.eq.unpaid,payment_status.eq.partial')
      .order('invoice_date', { ascending: true });

    if (error) {
      console.error('Error fetching invoices:', error);
      return;
    }

    const invoices = (data || []).map(inv => ({
      ...inv,
      remaining: (inv.total_amount || 0) - (inv.paid_amount || 0),
      selected: false,
      allocationAmount: 0,
    }));

    setOutstandingInvoices(invoices);
  };

  const handleToggleInvoice = (invoiceId: string) => {
    setOutstandingInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        const newSelected = !inv.selected;
        return {
          ...inv,
          selected: newSelected,
          allocationAmount: newSelected ? inv.remaining : 0,
        };
      }
      return inv;
    }));
  };

  const handleAllocationChange = (invoiceId: string, amount: number) => {
    setOutstandingInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        const validAmount = Math.min(Math.max(0, amount), inv.remaining);
        return {
          ...inv,
          allocationAmount: validAmount,
          selected: validAmount > 0,
        };
      }
      return inv;
    }));
  };

  const getTotalAllocation = () => {
    return outstandingInvoices
      .filter(inv => inv.selected)
      .reduce((sum, inv) => sum + inv.allocationAmount, 0);
  };

  const generatePaymentNumber = async (): Promise<string> => {
    const { data } = await supabase.rpc('generate_supplier_payment_number');
    return data || `PAY-${Date.now()}`;
  };

  const handleCreatePayment = async () => {
    if (!supplierId) {
      toast.error('يرجى اختيار المورد');
      return;
    }

    if (paymentAmount <= 0) {
      toast.error('يرجى إدخال مبلغ الدفعة');
      return;
    }

    const totalAllocation = getTotalAllocation();
    if (totalAllocation > paymentAmount) {
      toast.error('مجموع التخصيصات أكبر من مبلغ الدفعة');
      return;
    }

    if (paymentMethod === 'cash' && !cashBoxId) {
      toast.error('يرجى اختيار الصندوق');
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentNumber = await generatePaymentNumber();
      const effectiveRate = currencyCode === baseCurrency ? 1 : exchangeRate;
      
      const { data: payment, error: paymentError } = await supabase
        .from('supplier_payments')
        .insert({
          payment_number: paymentNumber,
          supplier_id: supplierId,
          payment_date: paymentDate,
          currency_code: currencyCode,
          exchange_rate: effectiveRate,
          amount_fc: paymentAmount,
          amount_bc: paymentAmount * effectiveRate,
          payment_method: paymentMethod,
          cash_box_id: paymentMethod === 'cash' ? cashBoxId : null,
          reference_number: referenceNumber || null,
          notes: notes || null,
          status: 'draft',
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create allocations
      const allocations = outstandingInvoices
        .filter(inv => inv.selected && inv.allocationAmount > 0)
        .map(inv => ({
          payment_id: payment.id,
          invoice_id: inv.id,
          allocated_amount_fc: inv.allocationAmount,
          allocated_amount_bc: inv.allocationAmount * effectiveRate,
        }));

      if (allocations.length > 0) {
        const { error: allocError } = await supabase
          .from('supplier_payment_allocations')
          .insert(allocations);

        if (allocError) throw allocError;
      }

      toast.success('تم إنشاء الدفعة بنجاح');
      setIsDialogOpen(false);
      resetForm();
      fetchPayments();
    } catch (error: any) {
      toast.error(`خطأ في إنشاء الدفعة: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostPayment = async (paymentId: string) => {
    try {
      toast.loading('جاري ترحيل الدفعة...');

      const { data, error } = await supabase.rpc('post_supplier_payment', {
        p_payment_id: paymentId,
      });

      toast.dismiss();

      if (error) throw error;

      toast.success('تم ترحيل الدفعة بنجاح');
      fetchPayments();
      setIsViewDialogOpen(false);
    } catch (error: any) {
      toast.dismiss();
      toast.error(`خطأ في ترحيل الدفعة: ${error.message}`);
    }
  };

  const handleViewPayment = async (payment: SupplierPayment) => {
    setSelectedPayment(payment);

    const { data } = await supabase
      .from('supplier_payment_allocations')
      .select(`
        *,
        purchase_invoices(pi_number, invoice_date, total_amount)
      `)
      .eq('payment_id', payment.id);

    setSelectedPaymentAllocations(data || []);
    setIsViewDialogOpen(true);
  };

  const resetForm = () => {
    setSupplierId('');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setPaymentMethod('cash');
    setCashBoxId('');
    setReferenceNumber('');
    setNotes('');
    setPaymentAmount(0);
    setOutstandingInvoices([]);
    setCurrencyCode(baseCurrency);
    setExchangeRate(1);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'مسودة' },
      posted: { variant: 'default', label: 'مرحل' },
      cancelled: { variant: 'destructive', label: 'ملغي' },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredPayments = payments.filter(payment => {
    let matches = true;
    
    if (statusFilter !== 'all') {
      matches = matches && payment.status === statusFilter;
    }
    
    if (supplierFilter !== 'all') {
      matches = matches && payment.supplier_id === supplierFilter;
    }
    
    if (searchTerm) {
      matches = matches && (
        payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return matches;
  });

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              مدفوعات الموردين
            </CardTitle>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              دفعة جديدة
            </Button>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                <span>تصفية النتائج</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>البحث</Label>
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="رقم الدفعة أو المورد..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>الحالة</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="كل الحالات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الحالات</SelectItem>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="posted">مرحل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المورد</Label>
                  <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="كل الموردين" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الموردين</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الدفعة</TableHead>
                    <TableHead>المورد</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>العملة</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>المبلغ (ر.ي)</TableHead>
                    <TableHead>طريقة الدفع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.payment_number}</TableCell>
                      <TableCell>
                        {payment.suppliers?.name}
                        {payment.suppliers?.code && (
                          <span className="text-muted-foreground text-xs mr-1">
                            ({payment.suppliers.code})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(payment.payment_date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>{payment.currency_code}</TableCell>
                      <TableCell>
                        {payment.amount_fc?.toLocaleString()} {getCurrencySymbol(payment.currency_code)}
                      </TableCell>
                      <TableCell>
                        {payment.amount_bc?.toLocaleString()} ر.ي
                      </TableCell>
                      <TableCell>
                        {payment.payment_method === 'cash' ? 'نقدي' : 
                         payment.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 
                         payment.payment_method === 'check' ? 'شيك' : payment.payment_method}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleViewPayment(payment)}>
                          <Eye className="h-4 w-4 ml-1" />
                          عرض
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!isLoading && filteredPayments.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد مدفوعات
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Payment Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>دفعة مورد جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>المورد *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المورد" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name} {supplier.code && `(${supplier.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>تاريخ الدفع *</Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>

              {selectedSupplier && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded">
                  <div>
                    <Label className="text-xs text-muted-foreground">رصيد المورد</Label>
                    <p className="font-medium text-lg">{selectedSupplier.balance?.toLocaleString()} ر.ي</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">عملة المورد</Label>
                    <p className="font-medium">{selectedSupplier.currency_code || baseCurrency}</p>
                  </div>
                </div>
              )}

              {/* Currency Panel */}
              {supplierId && (
                <InvoiceCurrencyPanel
                  currencyCode={currencyCode}
                  onCurrencyChange={handleCurrencyChange}
                  invoiceDate={paymentDate}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>طريقة الدفع *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {paymentMethod === 'cash' && (
                  <div>
                    <Label>الصندوق *</Label>
                    <Select value={cashBoxId} onValueChange={setCashBoxId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الصندوق" />
                      </SelectTrigger>
                      <SelectContent>
                        {cashBoxes
                          .filter(box => box.currency_code === currencyCode || !box.currency_code)
                          .map((box) => (
                            <SelectItem key={box.id} value={box.id}>
                              {box.box_name} ({box.current_balance?.toLocaleString()})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>مبلغ الدفعة *</Label>
                  <Input
                    type="number"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>رقم المرجع</Label>
                  <Input
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="رقم الشيك أو التحويل"
                  />
                </div>
              </div>

              <div>
                <Label>ملاحظات</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Outstanding Invoices */}
              {outstandingInvoices.length > 0 && (
                <div className="border rounded p-4">
                  <h3 className="font-medium mb-4">الفواتير المستحقة</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">تخصيص</TableHead>
                        <TableHead>رقم الفاتورة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الإجمالي</TableHead>
                        <TableHead>المدفوع</TableHead>
                        <TableHead>المتبقي</TableHead>
                        <TableHead>مبلغ التخصيص</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outstandingInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <Checkbox
                              checked={invoice.selected}
                              onCheckedChange={() => handleToggleInvoice(invoice.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{invoice.pi_number}</TableCell>
                          <TableCell>{format(new Date(invoice.invoice_date), 'yyyy-MM-dd')}</TableCell>
                          <TableCell>{invoice.total_amount?.toLocaleString()}</TableCell>
                          <TableCell>{invoice.paid_amount?.toLocaleString()}</TableCell>
                          <TableCell className="font-medium text-destructive">
                            {invoice.remaining?.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="w-28 h-8"
                              value={invoice.allocationAmount || ''}
                              onChange={(e) => handleAllocationChange(invoice.id, Number(e.target.value))}
                              max={invoice.remaining}
                              disabled={!invoice.selected}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-4 flex justify-between items-center p-3 bg-muted rounded">
                    <div>
                      <span className="text-sm text-muted-foreground">مجموع التخصيصات:</span>
                      <span className="font-bold mr-2">{getTotalAllocation().toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">مبلغ الدفعة:</span>
                      <span className="font-bold mr-2">{paymentAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">الفرق:</span>
                      <span className={`font-bold mr-2 ${paymentAmount - getTotalAllocation() !== 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {(paymentAmount - getTotalAllocation()).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {supplierId && outstandingInvoices.length === 0 && (
                <div className="text-center py-4 text-muted-foreground border rounded">
                  لا توجد فواتير مستحقة لهذا المورد
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreatePayment} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                إنشاء الدفعة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Payment Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>تفاصيل الدفعة: {selectedPayment?.payment_number}</DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">المورد</Label>
                    <p className="font-medium">{selectedPayment.suppliers?.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">التاريخ</Label>
                    <p className="font-medium">{format(new Date(selectedPayment.payment_date), 'yyyy-MM-dd')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">المبلغ ({selectedPayment.currency_code})</Label>
                    <p className="font-medium text-lg">{selectedPayment.amount_fc?.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">المبلغ (ر.ي)</Label>
                    <p className="font-medium text-lg">{selectedPayment.amount_bc?.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">طريقة الدفع</Label>
                    <p className="font-medium">
                      {selectedPayment.payment_method === 'cash' ? 'نقدي' : 
                       selectedPayment.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'شيك'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">الحالة</Label>
                    <p>{getStatusBadge(selectedPayment.status)}</p>
                  </div>
                </div>

                {selectedPaymentAllocations.length > 0 && (
                  <div className="border rounded p-4">
                    <h3 className="font-medium mb-3">التخصيصات</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>رقم الفاتورة</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>إجمالي الفاتورة</TableHead>
                          <TableHead>المبلغ المخصص</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPaymentAllocations.map((alloc) => (
                          <TableRow key={alloc.id}>
                            <TableCell>{alloc.purchase_invoices?.pi_number}</TableCell>
                            <TableCell>
                              {alloc.purchase_invoices?.invoice_date && 
                                format(new Date(alloc.purchase_invoices.invoice_date), 'yyyy-MM-dd')}
                            </TableCell>
                            <TableCell>{alloc.purchase_invoices?.total_amount?.toLocaleString()}</TableCell>
                            <TableCell className="font-medium">{alloc.allocated_amount_bc?.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {selectedPayment.notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                    <p className="bg-muted p-2 rounded">{selectedPayment.notes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                إغلاق
              </Button>
              {selectedPayment?.status === 'draft' && (
                <Button onClick={() => handlePostPayment(selectedPayment.id)}>
                  <Check className="h-4 w-4 ml-2" />
                  ترحيل الدفعة
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
