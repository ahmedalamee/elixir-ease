import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  warehouse_id: string;
  expected_date: string;
  status: string;
  total_amount: number;
  created_at: string;
  suppliers?: { name: string };
  warehouses?: { name: string };
}

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchWarehouses();
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
      .select('*')
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

  const handleCreateOrder = () => {
    setIsDialogOpen(true);
  };

  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
  };

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
            <Button onClick={handleCreateOrder}>
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>أمر شراء جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>المورد *</Label>
                  <Select>
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
                  <Select>
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
                <Input type="date" />
              </div>
              <div className="text-sm text-muted-foreground">
                سيتم إضافة واجهة كاملة لإدخال بنود أمر الشراء في المرحلة القادمة
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
