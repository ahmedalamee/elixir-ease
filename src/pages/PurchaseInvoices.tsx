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
import { toast } from 'sonner';
import { Plus, FileText, Eye, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function PurchaseInvoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [grns, setGRNs] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<any[]>([]);
  const [grnId, setGrnId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [selectedTaxId, setSelectedTaxId] = useState('');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchInvoices();
    fetchPostedGRNs();
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    const { data } = await supabase.from('taxes').select('*').eq('is_active', true);
    setTaxes(data || []);
    if (data && data.length > 0) setSelectedTaxId(data[0].id);
  };

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from('purchase_invoices')
      .select(`*, suppliers(name)`)
      .order('created_at', { ascending: false });
    setInvoices(data || []);
  };

  const fetchPostedGRNs = async () => {
    const { data } = await supabase
      .from('goods_receipts')
      .select(`*, suppliers(name), purchase_orders(po_number)`)
      .eq('status', 'posted')
      .order('created_at', { ascending: false });
    setGRNs(data || []);
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

  const handleCreateInvoice = async () => {
    if (!grnId || !supplierInvoiceNo || !selectedTaxId) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    const { data: grn } = await supabase
      .from('goods_receipts')
      .select('supplier_id')
      .eq('id', grnId)
      .single();

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
        supplier_id: grn?.supplier_id,
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
      return;
    }

    const itemsWithPI = items.map((item) => ({ pi_id: pi.id, ...item }));
    await supabase.from('pi_items').insert(itemsWithPI);

    toast.success('تم إنشاء فاتورة الشراء بنجاح');
    setIsDialogOpen(false);
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
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.pi_number}</TableCell>
                    <TableCell>{invoice.supplier_invoice_no}</TableCell>
                    <TableCell>{invoice.suppliers?.name}</TableCell>
                    <TableCell>{format(new Date(invoice.invoice_date), 'yyyy-MM-dd')}</TableCell>
                    <TableCell>{invoice.total_amount.toFixed(2)} ر.س</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded ${invoice.status === 'posted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
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
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>فاتورة شراء جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>رقم فاتورة المورد *</Label>
                <Input placeholder="رقم فاتورة المورد" value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} />
              </div>
              <div>
                <Label>التاريخ *</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
              <div>
                <Label>الضريبة *</Label>
                <Select value={selectedTaxId} onValueChange={setSelectedTaxId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الضريبة" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxes.map((tax) => (
                      <SelectItem key={tax.id} value={tax.id}>
                        {tax.name} ({tax.rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateInvoice}>حفظ الفاتورة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                    <p>{selectedInvoice.pi_number}</p>
                  </div>
                  <div>
                    <Label>الإجمالي</Label>
                    <p className="font-bold">{selectedInvoice.total_amount.toFixed(2)} ر.س</p>
                  </div>
                </div>
                {selectedInvoice.status === 'draft' && (
                  <Button onClick={() => handlePostInvoice(selectedInvoice.id)}>
                    <Check className="h-4 w-4 ml-1" />
                    ترحيل الفاتورة
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
