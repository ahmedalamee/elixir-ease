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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Navbar';
import { Search, FileHeart, Plus, Syringe, FlaskConical, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface HealthRecord {
  id: string;
  customer_id: string;
  blood_type: string;
  weight: number;
  height: number;
  date_of_birth: string;
  gender: string;
  chronic_conditions: any[];
  allergies: any[];
  current_medications: any[];
  consent_given: boolean;
  customer: { name: string, phone: string };
}

const HealthRecords = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    blood_type: '',
    weight: 0,
    height: 0,
    date_of_birth: '',
    gender: '',
    chronic_conditions: [] as string[],
    allergies: [] as string[],
    current_medications: [] as string[],
    medical_notes: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    consent_given: false,
  });

  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');

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
      const { data: recordsData, error: recordsError } = await supabase
        .from('customer_health_records' as any)
        .select(`
          *,
          customer:customers(name, phone)
        `)
        .order('created_at', { ascending: false });

      if (recordsError) throw recordsError;
      setRecords(recordsData as any || []);

      const { data: custData } = await supabase
        .from('customers')
        .select('id, name, phone')
        .order('name');
      setCustomers(custData || []);

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
      if (selectedRecord) {
        const { error } = await supabase
          .from('customer_health_records' as any)
          .update({
            ...formData,
            chronic_conditions: JSON.stringify(formData.chronic_conditions),
            allergies: JSON.stringify(formData.allergies),
            current_medications: JSON.stringify(formData.current_medications),
            consent_date: formData.consent_given ? new Date().toISOString().split('T')[0] : null,
          })
          .eq('id', selectedRecord.id);

        if (error) throw error;
        toast.success('تم تحديث السجل الصحي بنجاح');
      } else {
        const { error } = await supabase
          .from('customer_health_records' as any)
          .insert([{
            ...formData,
            chronic_conditions: JSON.stringify(formData.chronic_conditions),
            allergies: JSON.stringify(formData.allergies),
            current_medications: JSON.stringify(formData.current_medications),
            consent_date: formData.consent_given ? new Date().toISOString().split('T')[0] : null,
          }]);

        if (error) throw error;
        toast.success('تم إضافة السجل الصحي بنجاح');
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving health record:', error);
      if (error.code === '23505') {
        toast.error('يوجد سجل صحي لهذا العميل بالفعل');
      } else {
        toast.error('حدث خطأ في حفظ السجل');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: HealthRecord) => {
    setSelectedRecord(record);
    setFormData({
      customer_id: record.customer_id,
      blood_type: record.blood_type || '',
      weight: record.weight || 0,
      height: record.height || 0,
      date_of_birth: record.date_of_birth || '',
      gender: record.gender || '',
      chronic_conditions: record.chronic_conditions || [],
      allergies: record.allergies || [],
      current_medications: record.current_medications || [],
      medical_notes: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      consent_given: record.consent_given,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      blood_type: '',
      weight: 0,
      height: 0,
      date_of_birth: '',
      gender: '',
      chronic_conditions: [],
      allergies: [],
      current_medications: [],
      medical_notes: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      consent_given: false,
    });
    setSelectedRecord(null);
    setDialogOpen(false);
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setFormData({
        ...formData,
        chronic_conditions: [...formData.chronic_conditions, newCondition.trim()]
      });
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      chronic_conditions: formData.chronic_conditions.filter((_, i) => i !== index)
    });
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setFormData({
        ...formData,
        allergies: [...formData.allergies, newAllergy.trim()]
      });
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    setFormData({
      ...formData,
      allergies: formData.allergies.filter((_, i) => i !== index)
    });
  };

  const addMedication = () => {
    if (newMedication.trim()) {
      setFormData({
        ...formData,
        current_medications: [...formData.current_medications, newMedication.trim()]
      });
      setNewMedication('');
    }
  };

  const removeMedication = (index: number) => {
    setFormData({
      ...formData,
      current_medications: formData.current_medications.filter((_, i) => i !== index)
    });
  };

  const filteredRecords = records.filter(record =>
    (record.customer as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.customer as any)?.phone?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8" dir="rtl">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileHeart className="h-6 w-6" />
                السجلات الصحية للعملاء
              </h1>
              <p className="text-muted-foreground mt-1">إدارة الملفات الصحية والسجلات الطبية</p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              سجل جديد
            </Button>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن عميل..."
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
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">فصيلة الدم</TableHead>
                  <TableHead className="text-right">العمر</TableHead>
                  <TableHead className="text-right">الوزن/الطول</TableHead>
                  <TableHead className="text-right">حالات مزمنة</TableHead>
                  <TableHead className="text-right">حساسيات</TableHead>
                  <TableHead className="text-right">الموافقة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => {
                  const age = record.date_of_birth 
                    ? Math.floor((new Date().getTime() - new Date(record.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                    : null;
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{(record.customer as any)?.name}</div>
                          <div className="text-sm text-muted-foreground">{(record.customer as any)?.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.blood_type && (
                          <Badge variant="outline">{record.blood_type}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{age ? `${age} سنة` : '-'}</TableCell>
                      <TableCell>
                        {record.weight && record.height 
                          ? `${record.weight} كجم / ${record.height} سم`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {record.chronic_conditions?.length > 0 && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 ml-1" />
                            {record.chronic_conditions.length}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.allergies?.length > 0 && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 ml-1" />
                            {record.allergies.length}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.consent_given ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(record)}
                        >
                          تفاصيل
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Health Record Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRecord ? 'تعديل السجل الصحي' : 'سجل صحي جديد'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
              <Tabs defaultValue="basic" dir="rtl">
                <TabsList className="w-full">
                  <TabsTrigger value="basic">المعلومات الأساسية</TabsTrigger>
                  <TabsTrigger value="medical">المعلومات الطبية</TabsTrigger>
                  <TabsTrigger value="emergency">حالات الطوارئ</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div>
                    <Label>العميل *</Label>
                    <Select 
                      value={formData.customer_id} 
                      onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                      disabled={!!selectedRecord}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العميل" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} - {customer.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>فصيلة الدم</Label>
                      <Select value={formData.blood_type} onValueChange={(value) => setFormData({ ...formData, blood_type: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>الوزن (كجم)</Label>
                      <Input
                        type="number"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>الطول (سم)</Label>
                      <Input
                        type="number"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>تاريخ الميلاد</Label>
                      <Input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>الجنس</Label>
                      <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">ذكر</SelectItem>
                          <SelectItem value="female">أنثى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="medical" className="space-y-4 mt-4">
                  <div>
                    <Label>الأمراض المزمنة</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newCondition}
                        onChange={(e) => setNewCondition(e.target.value)}
                        placeholder="أضف مرض مزمن"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                      />
                      <Button type="button" onClick={addCondition}>إضافة</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.chronic_conditions.map((condition, index) => (
                        <Badge key={index} variant="destructive" className="cursor-pointer" onClick={() => removeCondition(index)}>
                          {condition} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>الحساسيات</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newAllergy}
                        onChange={(e) => setNewAllergy(e.target.value)}
                        placeholder="أضف حساسية"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                      />
                      <Button type="button" onClick={addAllergy}>إضافة</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.allergies.map((allergy, index) => (
                        <Badge key={index} variant="destructive" className="cursor-pointer" onClick={() => removeAllergy(index)}>
                          {allergy} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>الأدوية الحالية</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newMedication}
                        onChange={(e) => setNewMedication(e.target.value)}
                        placeholder="أضف دواء"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
                      />
                      <Button type="button" onClick={addMedication}>إضافة</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.current_medications.map((medication, index) => (
                        <Badge key={index} variant="outline" className="cursor-pointer" onClick={() => removeMedication(index)}>
                          {medication} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>ملاحظات طبية</Label>
                    <Textarea
                      value={formData.medical_notes}
                      onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="emergency" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>اسم جهة الاتصال</Label>
                      <Input
                        value={formData.emergency_contact_name}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>رقم الهاتف</Label>
                      <Input
                        value={formData.emergency_contact_phone}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={formData.consent_given}
                      onChange={(e) => setFormData({ ...formData, consent_given: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="consent" className="cursor-pointer">
                      موافقة العميل على حفظ السجل الصحي
                    </Label>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'جاري الحفظ...' : selectedRecord ? 'تحديث' : 'حفظ'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default HealthRecords;