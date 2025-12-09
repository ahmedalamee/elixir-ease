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
import { toast } from 'sonner';
import { Plus, FileText, Eye, Trash2, Check, X, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { InvoiceCurrencyPanel, InvoiceTotalsSummary } from '@/components/currency';
import { getExchangeRate, getBaseCurrencyCode } from '@/lib/currency';

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
  currency_code?: string;
  exchange_rate?: number;
  notes?: string;
  created_at: string;
  suppliers?: { name: string; currency_code?: string };
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
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<any[]>([]);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [items, setItems] = useState<POItem[]>([]);
  
  // Multi-currency state
  const [currencyCode, setCurrencyCode] = useState<string>('YER');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [baseCurrency, setBaseCurrency] = useState<string>('YER');

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchWarehouses();
    fetchProducts();
    fetchUOMs();
    fetchTaxes();
    loadDefaultWarehouse();
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
  
  // Handle currency change
  const handleCurrencyChange = useCallback((currency: string, rate: number) => {
    const effectiveRate = currency === baseCurrency ? 1 : rate;
    setCurrencyCode(currency);
    setExchangeRate(effectiveRate);
  }, [baseCurrency]);
  
  // Update currency when supplier changes
  useEffect(() => {
    const loadSupplierCurrency = async () => {
      if (supplierId) {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (supplier?.currency_code && supplier.currency_code !== baseCurrency) {
          try {
            const rate = await getExchangeRate(supplier.currency_code, baseCurrency);
            setCurrencyCode(supplier.currency_code);
            setExchangeRate(rate);
          } catch (error) {
            console.error('Error fetching exchange rate:', error);
            setCurrencyCode(baseCurrency);
            setExchangeRate(1);
          }
        } else {
          setCurrencyCode(supplier?.currency_code || baseCurrency);
          setExchangeRate(1);
        }
      }
    };
    loadSupplierCurrency();
  }, [supplierId, suppliers, baseCurrency]);

  const loadDefaultWarehouse = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'default_warehouse')
      .single();
    
    if (data?.setting_value && typeof data.setting_value === 'object' && 'warehouse_id' in data.setting_value) {
      setWarehouseId(data.setting_value.warehouse_id as string);
    }
  };

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, searchTerm, supplierFilter]);

  const filterOrders = () => {
    let filtered = [...orders];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filter by supplier
    if (supplierFilter !== 'all') {
      filtered = filtered.filter(order => order.supplier_id === supplierFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers(name, phone, email, contact_person),
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
      .select('id, name, code, phone, email, contact_person, payment_terms, currency_code')
      .eq('is_active', true)
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
      .eq('is_active', true)
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
        tax_code: null,
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

  const [taxRate, setTaxRate] = useState<number>(0.15);
  
  // Load tax rate on mount
  useEffect(() => {
    const loadTaxRate = async () => {
      try {
        const { data } = await supabase
          .from('taxes')
          .select('rate')
          .eq('is_active', true)
          .eq('tax_code', 'VAT15')
          .single();
        if (data) {
          setTaxRate(Number(data.rate) / 100);
        }
      } catch (error) {
        console.error('Error loading tax rate:', error);
      }
    };
    loadTaxRate();
  }, []);

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.net_amount, 0);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleCreateOrder = async () => {
    if (!supplierId || !warehouseId || items.length === 0) {
      toast.error('يرجى ملء جميع الحقول المطلوبة وإضافة بند واحد على الأقل');
      return;
    }

    // Validate all items have required fields
    const invalidItems = items.filter(item => 
      !item.item_id || !item.uom_id || item.qty_ordered <= 0 || item.price < 0
    );
    
    if (invalidItems.length > 0) {
      toast.error('يرجى ملء جميع حقول البنود (المنتج، الوحدة، الكمية، السعر)');
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

    // Calculate FC/BC amounts
    const effectiveRate = currencyCode === baseCurrency ? 1 : exchangeRate;
    const subtotalBC = subtotal * effectiveRate;
    const taxAmountBC = taxAmount * effectiveRate;
    const totalBC = total * effectiveRate;

    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: poNumber,
        supplier_id: supplierId,
        warehouse_id: warehouseId,
        expected_date: expectedDate || null,
        payment_terms: paymentTerms || null,
        notes,
        currency_code: currencyCode,
        exchange_rate: effectiveRate,
        subtotal,
        subtotal_fc: subtotal,
        subtotal_bc: subtotalBC,
        tax_amount: taxAmount,
        tax_amount_fc: taxAmount,
        tax_amount_bc: taxAmountBC,
        total_amount: total,
        total_amount_fc: total,
        total_amount_bc: totalBC,
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
      tax_code: item.tax_code || null, // Convert empty string to null
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
    setPaymentTerms('');
    setNotes('');
    setItems([]);
    setCurrencyCode(baseCurrency);
    setExchangeRate(1);
  };

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

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
                      placeholder="رقم الأمر أو اسم المورد..."
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
                      <SelectItem value="submitted">مقدم</SelectItem>
                      <SelectItem value="approved">معتمد</SelectItem>
                      <SelectItem value="partial">جزئي</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="cancelled">ملغي</SelectItem>
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
                <span>عدد النتائج: {filteredOrders.length}</span>
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
                {filteredOrders.map((order) => (
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

            {filteredOrders.length === 0 && orders.length > 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد نتائج مطابقة للفلاتر المحددة
              </div>
            )}
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
                          {supplier.name} {supplier.code && `(${supplier.code})`}
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

              {/* Supplier Info Card */}
              {selectedSupplier && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">جهة الاتصال:</span>
                        <p className="font-medium">{selectedSupplier.contact_person || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الهاتف:</span>
                        <p className="font-medium">{selectedSupplier.phone || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">البريد:</span>
                        <p className="font-medium">{selectedSupplier.email || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">شروط الدفع:</span>
                        <p className="font-medium">{selectedSupplier.payment_terms || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>التاريخ المتوقع</Label>
                  <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
                </div>
                <div>
                  <Label>شروط الدفع</Label>
                  <Input 
                    placeholder="مثال: 30 يوم" 
                    value={paymentTerms} 
                    onChange={(e) => setPaymentTerms(e.target.value)} 
                  />
                </div>
              </div>
              
              {/* Currency Selection */}
              <div>
                <InvoiceCurrencyPanel
                  currencyCode={currencyCode}
                  onCurrencyChange={handleCurrencyChange}
                  invoiceDate={expectedDate || format(new Date(), 'yyyy-MM-dd')}
                  isLocked={false}
                />
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
                    <div key={index} className="grid grid-cols-7 gap-2 items-end p-3 border rounded bg-card">
                      <div>
                        <Label className="text-xs">المنتج *</Label>
                        <Select
                          value={item.item_id}
                          onValueChange={(value) => updateItem(index, 'item_id', value)}
                          required
                        >
                          <SelectTrigger className={`h-8 ${!item.item_id ? 'border-destructive' : ''}`}>
                            <SelectValue placeholder="اختر المنتج" />
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
                        <Label className="text-xs">الوحدة *</Label>
                        <Select
                          value={item.uom_id}
                          onValueChange={(value) => updateItem(index, 'uom_id', value)}
                          required
                        >
                          <SelectTrigger className={`h-8 ${!item.uom_id ? 'border-destructive' : ''}`}>
                            <SelectValue placeholder="اختر الوحدة" />
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
                        <Label className="text-xs">الكمية *</Label>
                        <Input
                          type="number"
                          className={`h-8 ${item.qty_ordered <= 0 ? 'border-destructive' : ''}`}
                          value={item.qty_ordered}
                          min="0.01"
                          step="0.01"
                          onChange={(e) => updateItem(index, 'qty_ordered', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-xs">السعر *</Label>
                        <Input
                          type="number"
                          className={`h-8 ${item.price < 0 ? 'border-destructive' : ''}`}
                          value={item.price}
                          min="0"
                          step="0.01"
                          onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-xs">خصم %</Label>
                        <Input
                          type="number"
                          className="h-8"
                          value={item.discount}
                          min="0"
                          max="100"
                          step="0.01"
                          onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">الصافي</Label>
                        <Input
                          type="number"
                          className="h-8 bg-muted"
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
