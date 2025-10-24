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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Package, Eye, Check } from 'lucide-react';
import { format } from 'date-fns';

interface GoodsReceipt {
  id: string;
  grn_number: string;
  po_id?: string;
  supplier_id?: string;
  warehouse_id?: string;
  received_at: string;
  status: string;
  notes?: string;
  created_at: string;
  suppliers?: { name: string };
  warehouses?: { name: string };
  purchase_orders?: { po_number: string };
}

interface GRNItem {
  id?: string;
  grn_id?: string;
  po_item_id?: string;
  item_id: string;
  uom_id: string;
  qty_received: number;
  unit_cost: number;
  lot_no: string;
  expiry_date: string;
  notes?: string;
}

export default function GoodsReceipts() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);
  const [selectedReceiptItems, setSelectedReceiptItems] = useState<any[]>([]);

  // Form states
  const [poId, setPoId] = useState('');
  const [receivedAt, setReceivedAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<GRNItem[]>([]);
  const [selectedPO, setSelectedPO] = useState<any>(null);

  useEffect(() => {
    fetchReceipts();
    fetchApprovedPOs();
  }, []);

  const fetchReceipts = async () => {
    const { data, error } = await supabase
      .from('goods_receipts')
      .select(`
        *,
        suppliers(name),
        warehouses(name),
        purchase_orders(po_number)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('خطأ في تحميل استلامات البضائع');
      console.error(error);
    } else {
      setReceipts(data || []);
    }
  };

  const fetchApprovedPOs = async () => {
    const { data } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers(name),
        warehouses(name)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    setPurchaseOrders(data || []);
  };

  const fetchPOItems = async (poId: string) => {
    const { data: po } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers(name),
        warehouses(name)
      `)
      .eq('id', poId)
      .single();

    setSelectedPO(po);

    const { data: poItems } = await supabase
      .from('po_items')
      .select(`
        *,
        products(name, name_en),
        uoms(name, name_en)
      `)
      .eq('po_id', poId)
      .order('line_no');

    if (poItems) {
      const grnItems: GRNItem[] = poItems.map((item) => ({
        po_item_id: item.id,
        item_id: item.item_id,
        uom_id: item.uom_id,
        qty_received: item.qty_ordered - (item.qty_received || 0), // Remaining quantity
        unit_cost: item.price,
        lot_no: '',
        expiry_date: '',
        notes: '',
      }));
      setItems(grnItems);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: 'مسودة',
      received: 'مستلم',
      posted: 'مرحّل',
      cancelled: 'ملغي'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      received: 'bg-blue-100 text-blue-800',
      posted: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || '';
  };

  const updateItem = (index: number, field: keyof GRNItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleCreateReceipt = async () => {
    if (!poId || items.length === 0) {
      toast.error('يرجى اختيار أمر شراء والتأكد من وجود بنود');
      return;
    }

    // Validate that all items have lot numbers and expiry dates
    const invalidItems = items.filter(item => !item.lot_no || !item.expiry_date || item.qty_received <= 0);
    if (invalidItems.length > 0) {
      toast.error('يرجى ملء رقم الدفعة وتاريخ الانتهاء والكمية لجميع البنود');
      return;
    }

    // Generate GRN number
    const { count } = await supabase
      .from('goods_receipts')
      .select('*', { count: 'exact', head: true });
    const grnNumber = `GRN-${String((count || 0) + 1).padStart(6, '0')}`;

    const { data: user } = await supabase.auth.getUser();

    const { data: grn, error: grnError } = await supabase
      .from('goods_receipts')
      .insert({
        grn_number: grnNumber,
        po_id: poId,
        supplier_id: selectedPO?.supplier_id,
        warehouse_id: selectedPO?.warehouse_id,
        received_at: receivedAt,
        notes,
        status: 'draft',
        created_by: user?.user?.id,
      })
      .select()
      .single();

    if (grnError) {
      toast.error('خطأ في إنشاء استلام البضائع');
      console.error(grnError);
      return;
    }

    // Insert items
    const itemsWithGRN = items.map((item) => ({
      grn_id: grn.id,
      ...item,
    }));

    const { error: itemsError } = await supabase
      .from('grn_items')
      .insert(itemsWithGRN);

    if (itemsError) {
      toast.error('خطأ في إضافة بنود الاستلام');
      console.error(itemsError);
      return;
    }

    toast.success('تم إنشاء استلام البضائع بنجاح');
    setIsDialogOpen(false);
    resetForm();
    fetchReceipts();
  };

  const handlePostReceipt = async (receiptId: string) => {
    try {
      const { error } = await supabase.rpc('post_goods_receipt' as any, { p_grn_id: receiptId });
      if (error) throw error;
      toast.success('تم ترحيل الاستلام بنجاح');
      fetchReceipts();
      if (isViewDialogOpen) setIsViewDialogOpen(false);
    } catch (error: any) {
      toast.error(`خطأ: ${error.message}`);
    }
  };

  const handleViewReceipt = async (receipt: GoodsReceipt) => {
    setSelectedReceipt(receipt);

    const { data, error } = await supabase
      .from('grn_items')
      .select(`
        *,
        products:item_id(name, name_en),
        uoms:uom_id(name, name_en)
      `)
      .eq('grn_id', receipt.id);

    if (error) {
      toast.error('خطأ في تحميل بنود الاستلام');
      console.error(error);
    } else {
      setSelectedReceiptItems(data || []);
      setIsViewDialogOpen(true);
    }
  };

  const resetForm = () => {
    setPoId('');
    setReceivedAt(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
    setItems([]);
    setSelectedPO(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              استلام البضائع (GRN)
            </CardTitle>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              استلام جديد
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الاستلام</TableHead>
                  <TableHead>أمر الشراء</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>المخزن</TableHead>
                  <TableHead>تاريخ الاستلام</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.grn_number}</TableCell>
                    <TableCell>{receipt.purchase_orders?.po_number || '-'}</TableCell>
                    <TableCell>{receipt.suppliers?.name || '-'}</TableCell>
                    <TableCell>{receipt.warehouses?.name || '-'}</TableCell>
                    <TableCell>
                      {receipt.received_at ? format(new Date(receipt.received_at), 'yyyy-MM-dd') : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(receipt.status)}`}>
                        {getStatusLabel(receipt.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleViewReceipt(receipt)}>
                        <Eye className="h-4 w-4 ml-1" />
                        عرض
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {receipts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد استلامات بضائع حتى الآن
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Receipt Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>استلام بضائع جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>أمر الشراء *</Label>
                  <Select
                    value={poId}
                    onValueChange={(value) => {
                      setPoId(value);
                      fetchPOItems(value);
                    }}
                  >
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
                <div>
                  <Label>تاريخ الاستلام *</Label>
                  <Input
                    type="date"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                  />
                </div>
              </div>

              {selectedPO && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded">
                  <div>
                    <Label className="text-xs text-muted-foreground">المورد</Label>
                    <p className="font-medium">{selectedPO.suppliers?.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">المخزن</Label>
                    <p className="font-medium">{selectedPO.warehouses?.name}</p>
                  </div>
                </div>
              )}

              <div>
                <Label>ملاحظات</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>

              {items.length > 0 && (
                <div className="border rounded p-4">
                  <h3 className="font-medium mb-4">البنود المستلمة</h3>
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-6 gap-2 items-end p-3 border rounded">
                        <div>
                          <Label className="text-xs">الكمية المستلمة</Label>
                          <Input
                            type="number"
                            className="h-8"
                            value={item.qty_received}
                            onChange={(e) => updateItem(index, 'qty_received', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">التكلفة</Label>
                          <Input
                            type="number"
                            className="h-8"
                            value={item.unit_cost}
                            onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">رقم الدفعة *</Label>
                          <Input
                            className="h-8"
                            value={item.lot_no}
                            onChange={(e) => updateItem(index, 'lot_no', e.target.value)}
                            placeholder="LOT-001"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">تاريخ الانتهاء *</Label>
                          <Input
                            type="date"
                            className="h-8"
                            value={item.expiry_date}
                            onChange={(e) => updateItem(index, 'expiry_date', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">ملاحظات</Label>
                          <Input
                            className="h-8"
                            value={item.notes || ''}
                            onChange={(e) => updateItem(index, 'notes', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {items.length === 0 && poId && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  لا توجد بنود متاحة للاستلام في أمر الشراء المحدد
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreateReceipt}>
                حفظ الاستلام
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Receipt Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل استلام البضائع</DialogTitle>
            </DialogHeader>
            {selectedReceipt && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">رقم الاستلام</Label>
                    <p className="font-medium">{selectedReceipt.grn_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">الحالة</Label>
                    <p>
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(selectedReceipt.status)}`}>
                        {getStatusLabel(selectedReceipt.status)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">أمر الشراء</Label>
                    <p className="font-medium">{selectedReceipt.purchase_orders?.po_number || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">المورد</Label>
                    <p className="font-medium">{selectedReceipt.suppliers?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">المخزن</Label>
                    <p className="font-medium">{selectedReceipt.warehouses?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">تاريخ الاستلام</Label>
                    <p className="font-medium">
                      {selectedReceipt.received_at
                        ? format(new Date(selectedReceipt.received_at), 'yyyy-MM-dd')
                        : '-'}
                    </p>
                  </div>
                </div>

                {selectedReceipt.notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                    <p className="text-sm">{selectedReceipt.notes}</p>
                  </div>
                )}

                <div className="border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المنتج</TableHead>
                        <TableHead>الكمية</TableHead>
                        <TableHead>التكلفة</TableHead>
                        <TableHead>رقم الدفعة</TableHead>
                        <TableHead>تاريخ الانتهاء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReceiptItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.products?.name}</TableCell>
                          <TableCell>{item.qty_received}</TableCell>
                          <TableCell>{item.unit_cost?.toFixed(2)} ر.س</TableCell>
                          <TableCell>{item.lot_no}</TableCell>
                          <TableCell>
                            {item.expiry_date ? format(new Date(item.expiry_date), 'yyyy-MM-dd') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {selectedReceipt.status === 'draft' && (
                  <div className="flex gap-2 justify-end">
                    <Button onClick={() => handlePostReceipt(selectedReceipt.id)}>
                      <Check className="h-4 w-4 ml-1" />
                      ترحيل وتحديث المخزون
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
