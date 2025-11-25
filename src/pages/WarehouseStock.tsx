import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, ArrowRightLeft, Package, TrendingUp, Edit, Trash2 } from 'lucide-react';

interface ProductWarehouse {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  min_quantity: number;
  products?: { name: string; barcode?: string };
  warehouses?: { name: string; code: string };
}

interface Transfer {
  id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  transfer_date: string;
  status: string;
  notes?: string;
}

interface Adjustment {
  id: string;
  adjustment_number: string;
  warehouse_id: string;
  adjustment_date: string;
  adjustment_type: string;
  status: string;
  reason?: string;
}

export default function WarehouseStock() {
  const navigate = useNavigate();
  const [productWarehouses, setProductWarehouses] = useState<ProductWarehouse[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);

  const [transferForm, setTransferForm] = useState({
    from_warehouse_id: '',
    to_warehouse_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    warehouse_id: '',
    adjustment_type: 'count',
    adjustment_date: new Date().toISOString().split('T')[0],
    reason: '',
  });

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchData = async () => {
    try {
      const pwRes = await (supabase as any)
        .from('product_warehouses')
        .select(`
          *,
          products(name, barcode),
          warehouses(name, code)
        `)
        .order('created_at', { ascending: false });

      const transfersRes = await (supabase as any)
        .from('warehouse_transfers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      const adjustmentsRes = await (supabase as any)
        .from('stock_adjustments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      const productsRes = await supabase.from('products').select('*').eq('is_active', true).order('name');
      const warehousesRes = await supabase.from('warehouses').select('*').eq('is_active', true).order('name');

      if (pwRes.data) setProductWarehouses(pwRes.data as any);
      if (transfersRes.data) setTransfers(transfersRes.data as any);
      if (adjustmentsRes.data) setAdjustments(adjustmentsRes.data as any);
      if (productsRes.data) setProducts(productsRes.data);
      if (warehousesRes.data) setWarehouses(warehousesRes.data);
    } catch (error: any) {
      toast.error('خطأ في تحميل البيانات');
      console.error(error);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (transferForm.from_warehouse_id === transferForm.to_warehouse_id) {
      toast.error('لا يمكن التحويل إلى نفس المخزن');
      return;
    }

    try {
      const transferNumber = `TRF-${Date.now()}`;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await (supabase as any).from('warehouse_transfers').insert([{
        transfer_number: transferNumber,
        from_warehouse_id: transferForm.from_warehouse_id,
        to_warehouse_id: transferForm.to_warehouse_id,
        transfer_date: transferForm.transfer_date,
        notes: transferForm.notes,
        status: 'draft',
        created_by: session?.user.id,
      }]);

      if (error) throw error;

      toast.success('تم إنشاء أمر التحويل بنجاح');
      setIsTransferDialogOpen(false);
      resetTransferForm();
      fetchData();
    } catch (error: any) {
      toast.error('خطأ في إنشاء أمر التحويل');
      console.error(error);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const adjustmentNumber = `ADJ-${Date.now()}`;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await (supabase as any).from('stock_adjustments').insert([{
        adjustment_number: adjustmentNumber,
        warehouse_id: adjustmentForm.warehouse_id,
        adjustment_type: adjustmentForm.adjustment_type,
        adjustment_date: adjustmentForm.adjustment_date,
        reason: adjustmentForm.reason,
        status: 'draft',
        created_by: session?.user.id,
      }]);

      if (error) throw error;

      toast.success('تم إنشاء أمر التسوية بنجاح');
      setIsAdjustmentDialogOpen(false);
      resetAdjustmentForm();
      fetchData();
    } catch (error: any) {
      toast.error('خطأ في إنشاء أمر التسوية');
      console.error(error);
    }
  };

  const resetTransferForm = () => {
    setTransferForm({
      from_warehouse_id: '',
      to_warehouse_id: '',
      transfer_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const resetAdjustmentForm = () => {
    setAdjustmentForm({
      warehouse_id: '',
      adjustment_type: 'count',
      adjustment_date: new Date().toISOString().split('T')[0],
      reason: '',
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'مسودة',
      in_transit: 'قيد النقل',
      received: 'مستلم',
      cancelled: 'ملغى',
      posted: 'معتمد',
    };
    return labels[status] || status;
  };

  const getAdjustmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      count: 'جرد',
      damage: 'تالف',
      loss: 'فقدان',
      found: 'وجد',
      other: 'أخرى',
    };
    return labels[type] || type;
  };

  const filteredProductWarehouses = selectedWarehouse === 'all'
    ? productWarehouses
    : productWarehouses.filter(pw => pw.warehouse_id === selectedWarehouse);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">إدارة المخزون بالمستودعات</h1>
          <p className="text-muted-foreground">إدارة المخزون والتحويلات والتسويات</p>
        </div>

        <Tabs defaultValue="stock" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stock">المخزون</TabsTrigger>
            <TabsTrigger value="transfers">التحويلات</TabsTrigger>
            <TabsTrigger value="adjustments">التسويات</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-6 w-6" />
                  المخزون بالمستودعات
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="جميع المستودعات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستودعات</SelectItem>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الباركود</TableHead>
                      <TableHead>المستودع</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>محجوز</TableHead>
                      <TableHead>متاح</TableHead>
                      <TableHead>الحد الأدنى</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProductWarehouses.map((pw) => (
                      <TableRow key={pw.id}>
                        <TableCell className="font-medium">
                          {pw.products?.name || '-'}
                        </TableCell>
                        <TableCell>{pw.products?.barcode || '-'}</TableCell>
                        <TableCell>{pw.warehouses?.name || '-'}</TableCell>
                        <TableCell>{pw.quantity}</TableCell>
                        <TableCell>{pw.reserved_quantity || 0}</TableCell>
                        <TableCell className="font-bold">{pw.available_quantity}</TableCell>
                        <TableCell>{pw.min_quantity || 0}</TableCell>
                        <TableCell>
                          {pw.available_quantity <= (pw.min_quantity || 0) ? (
                            <span className="text-destructive font-medium">منخفض</span>
                          ) : (
                            <span className="text-green-600 font-medium">جيد</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfers" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-6 w-6" />
                  التحويلات بين المستودعات
                </CardTitle>
                <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetTransferForm}>
                      <Plus className="h-4 w-4 ml-2" />
                      تحويل جديد
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إنشاء أمر تحويل</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTransfer} className="space-y-4">
                      <div>
                        <Label htmlFor="from_warehouse">من مستودع *</Label>
                        <Select
                          value={transferForm.from_warehouse_id}
                          onValueChange={(value) =>
                            setTransferForm({ ...transferForm, from_warehouse_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المستودع" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((wh) => (
                              <SelectItem key={wh.id} value={wh.id}>
                                {wh.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="to_warehouse">إلى مستودع *</Label>
                        <Select
                          value={transferForm.to_warehouse_id}
                          onValueChange={(value) =>
                            setTransferForm({ ...transferForm, to_warehouse_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المستودع" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((wh) => (
                              <SelectItem key={wh.id} value={wh.id}>
                                {wh.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="transfer_date">تاريخ التحويل *</Label>
                        <Input
                          id="transfer_date"
                          type="date"
                          value={transferForm.transfer_date}
                          onChange={(e) =>
                            setTransferForm({ ...transferForm, transfer_date: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="notes">ملاحظات</Label>
                        <Input
                          id="notes"
                          value={transferForm.notes}
                          onChange={(e) =>
                            setTransferForm({ ...transferForm, notes: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
                          إلغاء
                        </Button>
                        <Button type="submit">إنشاء</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم التحويل</TableHead>
                      <TableHead>من</TableHead>
                      <TableHead>إلى</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="font-medium">{transfer.transfer_number}</TableCell>
                        <TableCell>
                          {warehouses.find((w) => w.id === transfer.from_warehouse_id)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {warehouses.find((w) => w.id === transfer.to_warehouse_id)?.name || '-'}
                        </TableCell>
                        <TableCell>{new Date(transfer.transfer_date).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell>{getStatusLabel(transfer.status)}</TableCell>
                        <TableCell>{transfer.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="adjustments" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  تسويات المخزون
                </CardTitle>
                <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetAdjustmentForm}>
                      <Plus className="h-4 w-4 ml-2" />
                      تسوية جديدة
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إنشاء أمر تسوية</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateAdjustment} className="space-y-4">
                      <div>
                        <Label htmlFor="warehouse">المستودع *</Label>
                        <Select
                          value={adjustmentForm.warehouse_id}
                          onValueChange={(value) =>
                            setAdjustmentForm({ ...adjustmentForm, warehouse_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المستودع" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((wh) => (
                              <SelectItem key={wh.id} value={wh.id}>
                                {wh.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="adjustment_type">نوع التسوية *</Label>
                        <Select
                          value={adjustmentForm.adjustment_type}
                          onValueChange={(value) =>
                            setAdjustmentForm({ ...adjustmentForm, adjustment_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="count">جرد</SelectItem>
                            <SelectItem value="damage">تالف</SelectItem>
                            <SelectItem value="loss">فقدان</SelectItem>
                            <SelectItem value="found">وجد</SelectItem>
                            <SelectItem value="other">أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="adjustment_date">تاريخ التسوية *</Label>
                        <Input
                          id="adjustment_date"
                          type="date"
                          value={adjustmentForm.adjustment_date}
                          onChange={(e) =>
                            setAdjustmentForm({ ...adjustmentForm, adjustment_date: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="reason">السبب</Label>
                        <Input
                          id="reason"
                          value={adjustmentForm.reason}
                          onChange={(e) =>
                            setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => setIsAdjustmentDialogOpen(false)}>
                          إلغاء
                        </Button>
                        <Button type="submit">إنشاء</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم التسوية</TableHead>
                      <TableHead>المستودع</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>السبب</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.map((adjustment) => (
                      <TableRow key={adjustment.id}>
                        <TableCell className="font-medium">{adjustment.adjustment_number}</TableCell>
                        <TableCell>
                          {warehouses.find((w) => w.id === adjustment.warehouse_id)?.name || '-'}
                        </TableCell>
                        <TableCell>{getAdjustmentTypeLabel(adjustment.adjustment_type)}</TableCell>
                        <TableCell>{new Date(adjustment.adjustment_date).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell>{getStatusLabel(adjustment.status)}</TableCell>
                        <TableCell>{adjustment.reason || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
