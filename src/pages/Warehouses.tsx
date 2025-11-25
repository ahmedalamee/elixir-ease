import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Warehouse } from 'lucide-react';

interface WarehouseData {
  id?: string;
  code: string;
  name: string;
  name_en?: string;
  type: 'main' | 'branch' | 'return' | 'quarantine' | 'damaged';
  address?: string;
  phone?: string;
  is_active: boolean;
}

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null);
  const [formData, setFormData] = useState<WarehouseData>({
    code: '',
    name: '',
    name_en: '',
    type: 'main',
    address: '',
    phone: '',
    is_active: true,
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('خطأ في تحميل المخازن');
      console.error(error);
    } else {
      setWarehouses((data || []) as WarehouseData[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingWarehouse) {
      const { error } = await supabase
        .from('warehouses')
        .update(formData)
        .eq('id', editingWarehouse.id);

      if (error) {
        toast.error('خطأ في تحديث المخزن');
        console.error(error);
      } else {
        toast.success('تم تحديث المخزن بنجاح');
        setIsDialogOpen(false);
        fetchWarehouses();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('warehouses')
        .insert([formData]);

      if (error) {
        toast.error('خطأ في إضافة المخزن');
        console.error(error);
      } else {
        toast.success('تم إضافة المخزن بنجاح');
        setIsDialogOpen(false);
        fetchWarehouses();
        resetForm();
      }
    }
  };

  const handleEdit = (warehouse: WarehouseData) => {
    setEditingWarehouse(warehouse);
    setFormData(warehouse);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المخزن؟')) return;

    const { error } = await supabase
      .from('warehouses')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('خطأ في حذف المخزن');
      console.error(error);
    } else {
      toast.success('تم حذف المخزن بنجاح');
      fetchWarehouses();
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      name_en: '',
      type: 'main',
      address: '',
      phone: '',
      is_active: true,
    });
    setEditingWarehouse(null);
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      main: 'مخزن رئيسي',
      branch: 'فرع',
      return: 'مرتجعات',
      quarantine: 'حجر',
      damaged: 'تالف'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-6 w-6" />
              إدارة المخازن
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة مخزن
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingWarehouse ? 'تعديل المخزن' : 'إضافة مخزن جديد'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code">الرمز *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">النوع *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="main">مخزن رئيسي</SelectItem>
                          <SelectItem value="branch">فرع</SelectItem>
                          <SelectItem value="return">مرتجعات</SelectItem>
                          <SelectItem value="quarantine">حجر</SelectItem>
                          <SelectItem value="damaged">تالف</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">الاسم بالعربية *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="name_en">الاسم بالإنجليزية</Label>
                      <Input
                        id="name_en"
                        value={formData.name_en}
                        onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">العنوان</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">الهاتف</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button type="submit">
                      {editingWarehouse ? 'تحديث' : 'إضافة'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((warehouse) => (
                <Card key={warehouse.id} className="relative">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg">{warehouse.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${warehouse.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {warehouse.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{warehouse.code}</p>
                      <p className="text-sm text-muted-foreground">{getTypeLabel(warehouse.type)}</p>
                      {warehouse.address && (
                        <p className="text-sm">{warehouse.address}</p>
                      )}
                      {warehouse.phone && (
                        <p className="text-sm">{warehouse.phone}</p>
                      )}
                      <div className="flex gap-2 pt-4">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(warehouse)}>
                          <Edit className="h-4 w-4 ml-1" />
                          تعديل
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(warehouse.id!)}>
                          <Trash2 className="h-4 w-4 ml-1" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
