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
import { Plus, FileText, Eye, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  warehouse_id: string;
  expected_date: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  suppliers?: { name: string };
  warehouses?: { name: string };
}

interface POItem {
  id?: string;
  item_id: string;
  uom_id: string;
  qty_ordered: number;
  price: number;
  discount: number;
  tax_code: string;
  net_amount: number;
  expected_date?: string;
  notes?: string;
}

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<any[]>([]);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<POItem[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchWarehouses();
    fetchProducts();
    fetchUOMs();
    fetchTaxes();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers(name),
        warehouses(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('خطأ في تحميل أوامر الشراء');
      console.error(error);
    } else {
      setOrders(data || []);
    }
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .order('name');
    setSuppliers(data || []);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase
      .from('warehouses')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setWarehouses(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, name_en')
      .eq('is_active', true)
      .order('name');
    setProducts(data || []);
  };

  const fetchUOMs = async () => {
    const { data } = await supabase
      .from('uoms')
      .select('*')
      .order('name');
    setUoms(data || []);
  };

  const fetchTaxes = async () => {
    const { data } = await supabase
      .from('taxes')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setTaxes(data || []);
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: 'مسودة',
      submitted: 'مقدم',
      approved: 'معتمد',
      partial: 'جزئي',
      completed: 'مكتمل',
      cancelled: 'ملغي'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || '';
  };

  const addNewItem = () => {
    setItems([
      ...items,
      {
        item_id: '',
        uom_id: '',
        qty_ordered: 1,
        price: 0,
        discount: 0,
        tax_code: '',
        net_amount: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate net amount
    const qty = newItems[index].qty_ordered;
    const price = newItems[index].price;
    const discount = newItems[index].discount || 0;
    const subtotal = qty * price;
    const discountAmount = subtotal * (discount / 100);
    newItems[index].net_amount = subtotal - discountAmount;
    
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.net_amount, 0);
    const taxAmount = subtotal * 0.15; // 15% VAT
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleCreateOrder = async () => {
    if (!supplierId || !warehouseId || items.length === 0) {
      toast.error('يرجى ملء جميع الحقول المطلوبة وإضافة بند واحد على الأقل');
      return;
    }

    const { subtotal, taxAmount, total } = calculateTotals();

    // Get next PO number
    const { data: lastPO } = await supabase
      .from('purchase_orders')
      .select('po_number')
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (lastPO && lastPO.length > 0) {
      const match = lastPO[0].po_number.match(/\d+/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }
    const poNumber = `PO-${String(nextNumber).padStart(6, '0')}`;

    const { data: user } = await supabase.auth.getUser();

    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: poNumber,
        supplier_id: supplierId,
        warehouse_id: warehouseId,
        expected_date: expectedDate || null,
        notes,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        status: 'draft',
        created_by: user?.user?.id,
      })
      .select()
      .single();

    if (poError) {
      toast.error('خطأ في إنشاء أمر الشراء');
      console.error(poError);
      return;
    }

    // Insert items
    const itemsWithPO = items.map((item, index) => ({
      po_id: po.id,
      line_no: index + 1,
      ...item,
    }));

    const { error: itemsError } = await supabase
      .from('po_items')
      .insert(itemsWithPO);

    if (itemsError) {
      toast.error('خطأ في إضافة بنود أمر الشراء');
      console.error(itemsError);
      return;
    }

    toast.success('تم إنشاء أمر الشراء بنجاح');
    setIsDialogOpen(false);
    resetForm();
    fetchOrders();
  };

  const handleApproveOrder = async (orderId: string) => {
    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'approved',
        approved_by: user?.user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      toast.error('خطأ في اعتماد أمر الشراء');
      console.error(error);
    } else {
      toast.success('تم اعتماد أمر الشراء');
      fetchOrders();
      if (isViewDialogOpen) {
        setIsViewDialogOpen(false);
      }
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId);

    if (error) {
      toast.error('خطأ في إلغاء أمر الشراء');
      console.error(error);
    } else {
      toast.success('تم إلغاء أمر الشراء');
      fetchOrders();
      if (isViewDialogOpen) {
        setIsViewDialogOpen(false);
      }
    }
  };

  const handleViewOrder = async (order: PurchaseOrder) => {
    setSelectedOrder(order);
    
    const { data, error } = await supabase
      .from('po_items')
      .select(`
        *,
        products(name, name_en),
        uoms(name, name_en)
      `)
      .eq('po_id', order.id)
      .order('line_no');

    if (error) {
      toast.error('خطأ في تحميل بنود الأمر');
      console.error(error);
    } else {
      setSelectedOrderItems(data || []);
      setIsViewDialogOpen(true);
    }
  };

  const resetForm = () => {
    setSupplierId('');
    setWarehouseId('');
    setExpectedDate('');
    setNotes('');
    setItems([]);
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              أوامر الشراء
            </CardTitle>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              أمر شراء جديد
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الأمر</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>المخزن</TableHead>
                  <TableHead>التاريخ المتوقع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المبلغ الإجمالي</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.po_number}</TableCell>
                    <TableCell>{order.suppliers?.name}</TableCell>
                    <TableCell>{order.warehouses?.name}</TableCell>
                    <TableCell>
                      {order.expected_date ? format(new Date(order.expected_date), 'yyyy-MM-dd') : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </TableCell>
                    <TableCell>{order.total_amount.toFixed(2)} ر.س</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)}>
                        <Eye className="h-4 w-4 ml-1" />
                        عرض
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {orders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد أوامر شراء حتى الآن
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Order Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>أمر شراء جديد</DialogTitle>
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
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المخزن *</Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المخزن" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>التاريخ المتوقع</Label>
                <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>

              <div className="border rounded p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">البنود</h3>
                  <Button size="sm" onClick={addNewItem}>
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة بند
                  </Button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-7 gap-2 items-end p-3 border rounded">
                      <div>
                        <Label className="text-xs">المنتج</Label>
                        <Select
                          value={item.item_id}
                          onValueChange={(value) => updateItem(index, 'item_id', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="اختر" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">الوحدة</Label>
                        <Select
                          value={item.uom_id}
                          onValueChange={(value) => updateItem(index, 'uom_id', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="اختر" />
                          </SelectTrigger>
                          <SelectContent>
                            {uoms.map((uom) => (
                              <SelectItem key={uom.id} value={uom.id}>
                                {uom.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">الكمية</Label>
                        <Input
                          type="number"
                          className="h-8"
                          value={item.qty_ordered}
                          onChange={(e) => updateItem(index, 'qty_ordered', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">السعر</Label>
                        <Input
                          type="number"
                          className="h-8"
                          value={item.price}
                          onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">خصم %</Label>
                        <Input
                          type="number"
                          className="h-8"
                          value={item.discount}
                          onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">الصافي</Label>
                        <Input
                          type="number"
                          className="h-8"
                          value={item.net_amount.toFixed(2)}
                          readOnly
                        />
                      </div>
                      <div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-full"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    لم يتم إضافة أي بنود. اضغط "إضافة بند" للبدء
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-end space-y-2">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>الإجمالي الفرعي:</span>
                      <span className="font-medium">{subtotal.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>الضريبة (15%):</span>
                      <span className="font-medium">{taxAmount.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>الإجمالي:</span>
                      <span>{total.toFixed(2)} ر.س</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreateOrder}>
                حفظ أمر الشراء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Order Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل أمر الشراء</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">رقم الأمر</Label>
                    <p className="font-medium">{selectedOrder.po_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">الحالة</Label>
                    <p>
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusLabel(selectedOrder.status)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">المورد</Label>
                    <p className="font-medium">{selectedOrder.suppliers?.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">المخزن</Label>
                    <p className="font-medium">{selectedOrder.warehouses?.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">التاريخ المتوقع</Label>
                    <p className="font-medium">
                      {selectedOrder.expected_date
                        ? format(new Date(selectedOrder.expected_date), 'yyyy-MM-dd')
                        : '-'}
                    </p>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                )}

                <div className="border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المنتج</TableHead>
                        <TableHead>الوحدة</TableHead>
                        <TableHead>الكمية</TableHead>
                        <TableHead>السعر</TableHead>
                        <TableHead>الخصم</TableHead>
                        <TableHead>الصافي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrderItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.products?.name}</TableCell>
                          <TableCell>{item.uoms?.name}</TableCell>
                          <TableCell>{item.qty_ordered}</TableCell>
                          <TableCell>{item.price.toFixed(2)}</TableCell>
                          <TableCell>{item.discount}%</TableCell>
                          <TableCell>{item.net_amount.toFixed(2)} ر.س</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>الإجمالي الفرعي:</span>
                        <span className="font-medium">{selectedOrder.subtotal.toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>الضريبة:</span>
                        <span className="font-medium">{selectedOrder.tax_amount.toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>الإجمالي:</span>
                        <span>{selectedOrder.total_amount.toFixed(2)} ر.س</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  {selectedOrder.status === 'draft' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleCancelOrder(selectedOrder.id)}
                      >
                        <X className="h-4 w-4 ml-1" />
                        إلغاء الأمر
                      </Button>
                      <Button onClick={() => handleApproveOrder(selectedOrder.id)}>
                        <Check className="h-4 w-4 ml-1" />
                        اعتماد الأمر
                      </Button>
                    </>
                  )}
                  {selectedOrder.status === 'approved' && (
                    <Button
                      variant="outline"
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                    >
                      <X className="h-4 w-4 ml-1" />
                      إلغاء الأمر
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
