import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, FileText, Eye, Check, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function PurchaseInvoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [grns, setGRNs] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<any[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  
  // Form states
  const [invoiceSource, setInvoiceSource] = useState<'grn' | 'po' | 'direct'>('grn');
  const [grnId, setGrnId] = useState('');
  const [poId, setPoId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [selectedTaxId, setSelectedTaxId] = useState('');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchInvoices();
    fetchPostedGRNs();
    fetchApprovedPOs();
    fetchSuppliers();
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    const { data } = await supabase.from('taxes').select('*').eq('is_active', true);
    setTaxes(data || []);
    if (data && data.length > 0) setSelectedTaxId(data[0].tax_code);
  };

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from('purchase_invoices')
      .select(`*, suppliers(name, code)`)
      .order('created_at', { ascending: false });
    setInvoices(data || []);
  };

  const fetchPostedGRNs = async () => {
    const { data } = await supabase
      .from('goods_receipts')
      .select(`*, suppliers(name, code), purchase_orders(po_number)`)
      .eq('status', 'posted')
      .order('created_at', { ascending: false });
    setGRNs(data || []);
  };

  const fetchApprovedPOs = async () => {
    const { data } = await supabase
      .from('purchase_orders')
      .select(`*, suppliers(name, code)`)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    setPurchaseOrders(data || []);
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, code, phone, email')
      .eq('is_active', true)
      .order('name');
    setSuppliers(data || []);
  };

  const fetchGRNItems = async (grnId: string) => {
    const { data } = await supabase
      .from('grn_items')
      .select(`*, products(name, default_tax_id)`)
      .eq('grn_id', grnId);
    
    if (data) {
      setItems(data.map((item: any) => ({
        grn_item_id: item.id,
        item_id: item.item_id,
        uom_id: item.uom_id,
        qty: item.qty_received,
        price: item.unit_cost,
        discount: 0,
        tax_id: item.products.default_tax_id || selectedTaxId,
        line_total: item.qty_received * item.unit_cost,
      })));
    }
  };

  const fetchPOItems = async (poId: string) => {
    const { data } = await supabase
      .from('po_items')
      .select(`*, products(name, default_tax_id)`)
      .eq('po_id', poId);
    
    if (data) {
      setItems(data.map((item: any) => ({
        po_item_id: item.id,
        item_id: item.item_id,
        uom_id: item.uom_id,
        qty: item.qty_ordered,
        price: item.price,
        discount: item.discount || 0,
        tax_id: item.products?.default_tax_id || selectedTaxId,
        line_total: item.net_amount,
      })));
    }
  };

  const handleCreateInvoice = async () => {
    if (!supplierInvoiceNo || !selectedTaxId) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    let finalSupplierId = supplierId;

    // Get supplier from GRN or PO if applicable
    if (invoiceSource === 'grn' && grnId) {
      const { data: grn } = await supabase
        .from('goods_receipts')
        .select('supplier_id')
        .eq('id', grnId)
        .single();
      if (grn) finalSupplierId = grn.supplier_id;
    } else if (invoiceSource === 'po' && poId) {
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('supplier_id')
        .eq('id', poId)
        .single();
      if (po) finalSupplierId = po.supplier_id;
    }

    if (!finalSupplierId) {
      toast.error('يرجى تحديد المورد');
      return;
    }

    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const taxAmount = subtotal * 0.15;
    const totalAmount = subtotal + taxAmount;
    
    const { count } = await supabase.from('purchase_invoices').select('*', { count: 'exact', head: true });
    const piNumber = `PI-${String((count || 0) + 1).padStart(6, '0')}`;

    const { data: user } = await supabase.auth.getUser();

    const { data: pi, error } = await supabase
      .from('purchase_invoices')
      .insert({
        pi_number: piNumber,
        supplier_invoice_no: supplierInvoiceNo,
        supplier_id: finalSupplierId,
        invoice_date: invoiceDate,
        subtotal,
        tax_amount: taxAmount || 0,
        total_amount: totalAmount,
        status: 'draft',
        created_by: user?.user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('خطأ في إنشاء الفاتورة');
      console.error(error);
      return;
    }

    const itemsWithPI = items.map((item) => ({ pi_id: pi.id, ...item }));
    await supabase.from('pi_items').insert(itemsWithPI);

    toast.success('تم إنشاء فاتورة الشراء بنجاح');
    setIsDialogOpen(false);
    resetForm();
    fetchInvoices();
  };

  const handlePostInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase.rpc('post_purchase_invoice' as any, { p_pi_id: invoiceId });
      if (error) throw error;
      toast.success('تم ترحيل الفاتورة بنجاح');
      fetchInvoices();
      if (isViewDialogOpen) setIsViewDialogOpen(false);
    } catch (error: any) {
      toast.error(`خطأ: ${error.message}`);
    }
  };

  const handleViewInvoice = async (invoice: any) => {
    setSelectedInvoice(invoice);
    const { data } = await supabase
      .from('pi_items')
      .select(`*, products(name)`)
      .eq('pi_id', invoice.id);
    setSelectedInvoiceItems(data || []);
    setIsViewDialogOpen(true);
  };

  const resetForm = () => {
    setGrnId('');
    setPoId('');
    setSupplierId('');
    setSupplierInvoiceNo('');
    setInvoiceDate(format(new Date(), 'yyyy-MM-dd'));
    setItems([]);
    setInvoiceSource('grn');
  };

  const filteredInvoices = invoices.filter(invoice => {
    let matches = true;
    
    if (statusFilter !== 'all') {
      matches = matches && invoice.status === statusFilter;
    }
    
    if (supplierFilter !== 'all') {
      matches = matches && invoice.supplier_id === supplierFilter;
    }
    
    if (searchTerm) {
      matches = matches && (
        invoice.pi_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.supplier_invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return matches;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              فواتير الشراء
            </CardTitle>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              فاتورة جديدة
            </Button>
          </CardHeader>
          <CardContent>
            {/* Filters Section */}
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
                      placeholder="رقم الفاتورة أو المورد..."
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
                      <SelectItem value="posted">مرحّل</SelectItem>
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
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>عدد النتائج: {filteredInvoices.length}</span>
                {(statusFilter !== 'all' || searchTerm || supplierFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatusFilter('all');
                      setSearchTerm('');
                      setSupplierFilter('all');
                    }}
                  >
                    إعادة تعيين الفلاتر
                  </Button>
                )}
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>رقم فاتورة المورد</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.pi_number}</TableCell>
                    <TableCell>{invoice.supplier_invoice_no}</TableCell>
                    <TableCell>
                      {invoice.suppliers?.name}
                      {invoice.suppliers?.code && (
                        <span className="text-muted-foreground text-xs ml-1">
                          ({invoice.suppliers.code})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(invoice.invoice_date), 'yyyy-MM-dd')}</TableCell>
                    <TableCell>{invoice.total_amount.toFixed(2)} ر.س</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded ${
                        invoice.status === 'posted' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status === 'posted' ? 'مرحّل' : 'مسودة'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleViewInvoice(invoice)}>
                        <Eye className="h-4 w-4 ml-1" />
                        عرض
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredInvoices.length === 0 && invoices.length > 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد نتائج مطابقة للفلاتر المحددة
              </div>
            )}
            {invoices.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد فواتير شراء حتى الآن
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Invoice Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>فاتورة شراء جديدة</DialogTitle>
            </DialogHeader>
            
            <Tabs value={invoiceSource} onValueChange={(v) => setInvoiceSource(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="grn">من استلام بضائع</TabsTrigger>
                <TabsTrigger value="po">من أمر شراء</TabsTrigger>
                <TabsTrigger value="direct">مباشرة</TabsTrigger>
              </TabsList>
              
              <TabsContent value="grn" className="space-y-4">
                <div>
                  <Label>استلام البضائع *</Label>
                  <Select value={grnId} onValueChange={(v) => { setGrnId(v); fetchGRNItems(v); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر استلام البضائع" />
                    </SelectTrigger>
                    <SelectContent>
                      {grns.map((grn) => (
                        <SelectItem key={grn.id} value={grn.id}>
                          {grn.grn_number} - {grn.suppliers?.name}
                          {grn.purchase_orders?.po_number && ` (${grn.purchase_orders.po_number})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              
              <TabsContent value="po" className="space-y-4">
                <div>
                  <Label>أمر الشراء *</Label>
                  <Select value={poId} onValueChange={(v) => { setPoId(v); fetchPOItems(v); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر أمر الشراء" />
                    </SelectTrigger>
                    <SelectContent>
                      {purchaseOrders.map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.po_number} - {po.suppliers?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              
              <TabsContent value="direct" className="space-y-4">
                <div>
                  <Label>المورد *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المورد" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                          {supplier.code && ` (${supplier.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>رقم فاتورة المورد *</Label>
                  <Input 
                    placeholder="رقم فاتورة المورد" 
                    value={supplierInvoiceNo} 
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)} 
                  />
                </div>
                <div>
                  <Label>التاريخ *</Label>
                  <Input 
                    type="date" 
                    value={invoiceDate} 
                    onChange={(e) => setInvoiceDate(e.target.value)} 
                  />
                </div>
              </div>
              <div>
                <Label>الضريبة *</Label>
                <Select value={selectedTaxId} onValueChange={setSelectedTaxId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الضريبة" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxes.map((tax) => (
                      <SelectItem key={tax.tax_code} value={tax.tax_code}>
                        {tax.name} ({tax.rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {items.length > 0 && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium mb-2">البنود المحملة: {items.length}</h4>
                  <div className="text-sm text-muted-foreground">
                    الإجمالي الفرعي: {items.reduce((sum, item) => sum + item.line_total, 0).toFixed(2)} ر.س
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>إلغاء</Button>
              <Button onClick={handleCreateInvoice}>حفظ الفاتورة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Invoice Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>تفاصيل فاتورة الشراء</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>رقم الفاتورة</Label>
                    <p className="font-medium">{selectedInvoice.pi_number}</p>
                  </div>
                  <div>
                    <Label>رقم فاتورة المورد</Label>
                    <p className="font-medium">{selectedInvoice.supplier_invoice_no}</p>
                  </div>
                  <div>
                    <Label>المورد</Label>
                    <p className="font-medium">{selectedInvoice.suppliers?.name}</p>
                  </div>
                  <div>
                    <Label>التاريخ</Label>
                    <p className="font-medium">
                      {format(new Date(selectedInvoice.invoice_date), 'yyyy-MM-dd')}
                    </p>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-4">البنود</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المنتج</TableHead>
                        <TableHead>الكمية</TableHead>
                        <TableHead>السعر</TableHead>
                        <TableHead>المجموع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoiceItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.products?.name}</TableCell>
                          <TableCell>{item.qty}</TableCell>
                          <TableCell>{item.price?.toFixed(2)} ر.س</TableCell>
                          <TableCell>{item.line_total?.toFixed(2)} ر.س</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="space-y-1">
                    <div className="text-sm">
                      الإجمالي الفرعي: {selectedInvoice.subtotal?.toFixed(2)} ر.س
                    </div>
                    <div className="text-sm">
                      الضريبة: {selectedInvoice.tax_amount?.toFixed(2)} ر.س
                    </div>
                    <div className="text-lg font-bold">
                      الإجمالي: {selectedInvoice.total_amount.toFixed(2)} ر.س
                    </div>
                  </div>
                  {selectedInvoice.status === 'draft' && (
                    <Button onClick={() => handlePostInvoice(selectedInvoice.id)}>
                      <Check className="h-4 w-4 ml-1" />
                      ترحيل الفاتورة
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}