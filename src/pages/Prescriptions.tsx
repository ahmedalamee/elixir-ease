import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import { Plus, Search, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

interface Prescription {
  id: string;
  prescription_number: string;
  prescription_date: string;
  customer: { name: string } | null;
  doctor: { full_name: string, specialization: string } | null;
  diagnosis: string;
  status: string;
  insurance_company: { name: string } | null;
}

interface PrescriptionItem {
  id: string;
  item_id: string;
  quantity_prescribed: number;
  quantity_dispensed: number;
  dosage: string;
  duration: string;
  instructions: string;
  is_chronic: boolean;
  substitution_allowed: boolean;
  products: { name: string } | null;
}

const Prescriptions = () => {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    doctor_id: '',
    diagnosis: '',
    notes: '',
    insurance_company_id: '',
    insurance_approval_number: '',
  });

  const [itemsData, setItemsData] = useState<any[]>([
    { item_id: '', quantity_prescribed: 1, dosage: '', duration: '', instructions: '', is_chronic: false, substitution_allowed: true }
  ]);

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
      // Fetch prescriptions
      const { data: prescData, error: prescError } = await supabase
        .from('prescriptions' as any)
        .select(`
          *,
          customer:customers(name),
          doctor:doctors(full_name, specialization),
          insurance_company:insurance_companies(name)
        `)
        .order('created_at', { ascending: false });

      if (prescError) throw prescError;
      setPrescriptions(prescData as any || []);

      // Fetch customers
      const { data: custData } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');
      setCustomers(custData || []);

      // Fetch doctors
      const { data: docData } = await supabase
        .from('doctors' as any)
        .select('id, doctor_code, full_name, specialization')
        .eq('is_active', true)
        .order('full_name');
      setDoctors(docData as any || []);

      // Fetch products
      const { data: prodData } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('is_active', true)
        .order('name');
      setProducts(prodData || []);

      // Fetch insurance companies
      const { data: insData } = await supabase
        .from('insurance_companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setInsuranceCompanies(insData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate prescription number
      const { data: numberData } = await supabase.rpc('generate_prescription_number' as any);
      
      // Insert prescription
      const { data: prescData, error: prescError } = await supabase
        .from('prescriptions' as any)
        .insert([{
          ...formData,
          prescription_number: numberData,
          created_by: user?.id,
          status: 'pending',
        }])
        .select()
        .single();

      if (prescError) throw prescError;

      // Insert prescription items
      const items = itemsData.filter(item => item.item_id).map((item, index) => ({
        prescription_id: (prescData as any).id,
        ...item,
        line_no: index + 1,
      }));

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('prescription_items' as any)
          .insert(items);

        if (itemsError) throw itemsError;
      }

      toast.success('تم إضافة الوصفة الطبية بنجاح');
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving prescription:', error);
      toast.error('حدث خطأ في حفظ الوصفة');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPrescription = async (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    
    try {
      const { data, error } = await supabase
        .from('prescription_items' as any)
        .select(`
          *,
          products(name)
        `)
        .eq('prescription_id', prescription.id)
        .order('line_no');

      if (error) throw error;
      setPrescriptionItems(data as any || []);
      setViewDialogOpen(true);
    } catch (error) {
      console.error('Error fetching prescription items:', error);
      toast.error('حدث خطأ في تحميل تفاصيل الوصفة');
    }
  };

  const updatePrescriptionStatus = async (id: string, status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = { status };
      if (status === 'filled') {
        updateData.dispensed_by = user?.id;
        updateData.dispensed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('prescriptions' as any)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      toast.success('تم تحديث حالة الوصفة');
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('حدث خطأ في تحديث الحالة');
    }
  };

  const addItemRow = () => {
    setItemsData([...itemsData, {
      item_id: '',
      quantity_prescribed: 1,
      dosage: '',
      duration: '',
      instructions: '',
      is_chronic: false,
      substitution_allowed: true
    }]);
  };

  const removeItemRow = (index: number) => {
    setItemsData(itemsData.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: string, value: any) => {
    const newItems = [...itemsData];
    newItems[index] = { ...newItems[index], [field]: value };
    setItemsData(newItems);
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      doctor_id: '',
      diagnosis: '',
      notes: '',
      insurance_company_id: '',
      insurance_approval_number: '',
    });
    setItemsData([
      { item_id: '', quantity_prescribed: 1, dosage: '', duration: '', instructions: '', is_chronic: false, substitution_allowed: true }
    ]);
    setDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'secondary',
      partially_filled: 'outline',
      filled: 'default',
      cancelled: 'destructive',
    };
    const labels: any = {
      pending: 'قيد الانتظار',
      partially_filled: 'مصروف جزئي',
      filled: 'مصروف كامل',
      cancelled: 'ملغي',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const filteredPrescriptions = prescriptions.filter(presc =>
    presc.prescription_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (presc.customer as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8" dir="rtl">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                إدارة الوصفات الطبية
              </h1>
              <p className="text-muted-foreground mt-1">تسجيل وصرف الوصفات الطبية</p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              وصفة جديدة
            </Button>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن وصفة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الوصفة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المريض</TableHead>
                  <TableHead className="text-right">الطبيب</TableHead>
                  <TableHead className="text-right">التشخيص</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrescriptions.map((presc) => (
                  <TableRow key={presc.id}>
                    <TableCell className="font-medium">{presc.prescription_number}</TableCell>
                    <TableCell>{new Date(presc.prescription_date).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>{(presc.customer as any)?.name || '-'}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{(presc.doctor as any)?.full_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{(presc.doctor as any)?.specialization}</div>
                      </div>
                    </TableCell>
                    <TableCell>{presc.diagnosis || '-'}</TableCell>
                    <TableCell>{getStatusBadge(presc.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPrescription(presc)}
                        >
                          عرض
                        </Button>
                        {presc.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updatePrescriptionStatus(presc.id, 'filled')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updatePrescriptionStatus(presc.id, 'cancelled')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* New Prescription Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>وصفة طبية جديدة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>المريض *</Label>
                  <Select value={formData.customer_id} onValueChange={(value) => setFormData({ ...formData, customer_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المريض" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الطبيب *</Label>
                  <Select value={formData.doctor_id} onValueChange={(value) => setFormData({ ...formData, doctor_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الطبيب" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map(doctor => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.full_name} - {doctor.specialization}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>التشخيص</Label>
                <Textarea
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>شركة التأمين</Label>
                  <Select value={formData.insurance_company_id} onValueChange={(value) => setFormData({ ...formData, insurance_company_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر شركة التأمين" />
                    </SelectTrigger>
                    <SelectContent>
                      {insuranceCompanies.map(company => (
                        <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>رقم الموافقة</Label>
                  <Input
                    value={formData.insurance_approval_number}
                    onChange={(e) => setFormData({ ...formData, insurance_approval_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">الأدوية المصروفة</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة دواء
                  </Button>
                </div>
                <div className="space-y-4">
                  {itemsData.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="col-span-2">
                          <Label>الدواء *</Label>
                          <Select value={item.item_id} onValueChange={(value) => updateItemRow(index, 'item_id', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الدواء" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(product => (
                                <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>الكمية *</Label>
                          <Input
                            type="number"
                            value={item.quantity_prescribed}
                            onChange={(e) => updateItemRow(index, 'quantity_prescribed', parseFloat(e.target.value))}
                            min="1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>الجرعة *</Label>
                          <Input
                            value={item.dosage}
                            onChange={(e) => updateItemRow(index, 'dosage', e.target.value)}
                            placeholder="مثال: مرتين يومياً"
                          />
                        </div>
                        <div>
                          <Label>المدة</Label>
                          <Input
                            value={item.duration}
                            onChange={(e) => updateItemRow(index, 'duration', e.target.value)}
                            placeholder="مثال: 7 أيام"
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <Label>التعليمات</Label>
                        <Input
                          value={item.instructions}
                          onChange={(e) => updateItemRow(index, 'instructions', e.target.value)}
                          placeholder="التعليمات الإضافية"
                        />
                      </div>
                      {itemsData.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => removeItemRow(index)}
                        >
                          <X className="h-4 w-4 ml-1" />
                          حذف
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label>ملاحظات</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'جاري الحفظ...' : 'حفظ الوصفة'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Prescription Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>تفاصيل الوصفة الطبية</DialogTitle>
            </DialogHeader>
            {selectedPrescription && (
              <div className="space-y-4" dir="rtl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>رقم الوصفة</Label>
                    <p className="font-medium">{selectedPrescription.prescription_number}</p>
                  </div>
                  <div>
                    <Label>التاريخ</Label>
                    <p className="font-medium">{new Date(selectedPrescription.prescription_date).toLocaleDateString('ar-SA')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>المريض</Label>
                    <p className="font-medium">{(selectedPrescription.customer as any)?.name}</p>
                  </div>
                  <div>
                    <Label>الطبيب</Label>
                    <p className="font-medium">{(selectedPrescription.doctor as any)?.full_name}</p>
                  </div>
                </div>
                {selectedPrescription.diagnosis && (
                  <div>
                    <Label>التشخيص</Label>
                    <p>{selectedPrescription.diagnosis}</p>
                  </div>
                )}
                <div>
                  <Label>الأدوية المصروفة</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الدواء</TableHead>
                        <TableHead className="text-right">الكمية</TableHead>
                        <TableHead className="text-right">الجرعة</TableHead>
                        <TableHead className="text-right">المدة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prescriptionItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{(item.products as any)?.name}</TableCell>
                          <TableCell>{item.quantity_prescribed}</TableCell>
                          <TableCell>{item.dosage}</TableCell>
                          <TableCell>{item.duration || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Prescriptions;