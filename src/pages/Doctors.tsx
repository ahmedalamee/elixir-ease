import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import { Plus, Search, Stethoscope, Edit, Trash2, Phone, Mail, Building } from 'lucide-react';
import { toast } from 'sonner';

interface Doctor {
  id: string;
  doctor_code: string;
  full_name: string;
  specialization: string;
  license_number: string;
  phone: string;
  email: string;
  hospital_clinic: string;
  is_active: boolean;
  notes: string;
}

const Doctors = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    full_name: '',
    full_name_en: '',
    specialization: '',
    license_number: '',
    phone: '',
    email: '',
    hospital_clinic: '',
    notes: '',
  });

  useEffect(() => {
    checkAuth();
    fetchDoctors();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('حدث خطأ في تحميل الأطباء');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingDoctor) {
        const { error } = await supabase
          .from('doctors')
          .update(formData)
          .eq('id', editingDoctor.id);

        if (error) throw error;
        toast.success('تم تحديث الطبيب بنجاح');
      } else {
        // Generate doctor code
        const { data: codeData } = await supabase.rpc('generate_doctor_code');
        
        const { error } = await supabase
          .from('doctors')
          .insert([{
            ...formData,
            doctor_code: codeData,
            is_active: true,
          }]);

        if (error) throw error;
        toast.success('تم إضافة الطبيب بنجاح');
      }

      resetForm();
      fetchDoctors();
    } catch (error) {
      console.error('Error saving doctor:', error);
      toast.error('حدث خطأ في حفظ البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطبيب؟')) return;

    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('تم حذف الطبيب بنجاح');
      fetchDoctors();
    } catch (error) {
      console.error('Error deleting doctor:', error);
      toast.error('حدث خطأ في حذف الطبيب');
    }
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      full_name: doctor.full_name,
      full_name_en: '',
      specialization: doctor.specialization,
      license_number: doctor.license_number,
      phone: doctor.phone || '',
      email: doctor.email || '',
      hospital_clinic: doctor.hospital_clinic || '',
      notes: doctor.notes || '',
    });
    setDialogOpen(true);
  };

  const toggleActive = async (doctor: Doctor) => {
    try {
      const { error } = await supabase
        .from('doctors' as any)
        .update({ is_active: !doctor.is_active })
        .eq('id', doctor.id);

      if (error) throw error;
      toast.success('تم تحديث حالة الطبيب');
      fetchDoctors();
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast.error('حدث خطأ في تحديث الحالة');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      full_name_en: '',
      specialization: '',
      license_number: '',
      phone: '',
      email: '',
      hospital_clinic: '',
      notes: '',
    });
    setEditingDoctor(null);
    setDialogOpen(false);
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.doctor_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.license_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8" dir="rtl">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Stethoscope className="h-6 w-6" />
                إدارة الأطباء
              </h1>
              <p className="text-muted-foreground mt-1">إدارة بيانات الأطباء وتراخيصهم</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="ml-2 h-4 w-4" />
                  طبيب جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingDoctor ? 'تعديل الطبيب' : 'إضافة طبيب جديد'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>الاسم الكامل *</Label>
                      <Input
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>التخصص *</Label>
                      <Input
                        value={formData.specialization}
                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>رقم الترخيص *</Label>
                    <Input
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>رقم الهاتف</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>البريد الإلكتروني</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>المستشفى / العيادة</Label>
                    <Input
                      value={formData.hospital_clinic}
                      onChange={(e) => setFormData({ ...formData, hospital_clinic: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>ملاحظات</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      إلغاء
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'جاري الحفظ...' : editingDoctor ? 'تحديث' : 'إضافة'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن طبيب..."
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
                  <TableHead className="text-right">كود الطبيب</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">التخصص</TableHead>
                  <TableHead className="text-right">رقم الترخيص</TableHead>
                  <TableHead className="text-right">معلومات الاتصال</TableHead>
                  <TableHead className="text-right">المستشفى</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">{doctor.doctor_code}</TableCell>
                    <TableCell>{doctor.full_name}</TableCell>
                    <TableCell>{doctor.specialization}</TableCell>
                    <TableCell>{doctor.license_number}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {doctor.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {doctor.phone}
                          </div>
                        )}
                        {doctor.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {doctor.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {doctor.hospital_clinic && (
                        <div className="flex items-center gap-1 text-sm">
                          <Building className="h-3 w-3" />
                          {doctor.hospital_clinic}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={doctor.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleActive(doctor)}
                      >
                        {doctor.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(doctor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doctor.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredDoctors.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد بيانات
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Doctors;