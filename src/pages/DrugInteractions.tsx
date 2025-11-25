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
import { Search, AlertTriangle, Plus, Shield, Pill, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DrugInteraction {
  id: string;
  drug_a: { name: string } | null;
  drug_b: { name: string } | null;
  interaction_type: string;
  severity: string;
  description: string;
  clinical_effects: string;
  management: string;
  is_active: boolean;
}

interface DrugWarning {
  id: string;
  item: { name: string } | null;
  warning_type: string;
  severity: string;
  title: string;
  description: string;
  precautions: string;
  is_active: boolean;
}

const DrugInteractions = () => {
  const navigate = useNavigate();
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [warnings, setWarnings] = useState<DrugWarning[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<DrugInteraction | null>(null);
  const [editingWarning, setEditingWarning] = useState<DrugWarning | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('interactions');
  
  const [interactionFormData, setInteractionFormData] = useState({
    drug_a_id: '',
    drug_b_id: '',
    interaction_type: 'moderate',
    severity: 'moderate',
    description: '',
    clinical_effects: '',
    management: '',
    references: '',
  });

  const [warningFormData, setWarningFormData] = useState({
    item_id: '',
    warning_type: 'pregnancy',
    severity: 'warning',
    title: '',
    description: '',
    precautions: '',
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
      // Fetch drug interactions
      const { data: interactionsData, error: interactionsError } = await supabase
        .from('drug_interactions' as any)
        .select(`
          *,
          drug_a:products!drug_interactions_drug_a_id_fkey(name),
          drug_b:products!drug_interactions_drug_b_id_fkey(name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (interactionsError) throw interactionsError;
      setInteractions(interactionsData as any || []);

      // Fetch drug warnings
      const { data: warningsData, error: warningsError } = await supabase
        .from('drug_warnings' as any)
        .select(`
          *,
          item:products(name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (warningsError) throw warningsError;
      setWarnings(warningsData as any || []);

      // Fetch products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('is_active', true)
        .order('name');
      setProducts(productsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleInteractionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingInteraction) {
        const { error } = await supabase
          .from('drug_interactions' as any)
          .update(interactionFormData)
          .eq('id', editingInteraction.id);

        if (error) throw error;
        toast.success('تم تحديث التفاعل الدوائي بنجاح');
      } else {
        const { error } = await supabase
          .from('drug_interactions' as any)
          .insert([{
            ...interactionFormData,
            is_active: true,
          }]);

        if (error) throw error;
        toast.success('تم إضافة التفاعل الدوائي بنجاح');
      }

      resetInteractionForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving interaction:', error);
      if (error.code === '23505') {
        toast.error('هذا التفاعل موجود مسبقاً');
      } else {
        toast.error('حدث خطأ في حفظ التفاعل');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWarningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingWarning) {
        const { error } = await supabase
          .from('drug_warnings' as any)
          .update(warningFormData)
          .eq('id', editingWarning.id);

        if (error) throw error;
        toast.success('تم تحديث التحذير بنجاح');
      } else {
        const { error } = await supabase
          .from('drug_warnings' as any)
          .insert([{
            ...warningFormData,
            is_active: true,
          }]);

        if (error) throw error;
        toast.success('تم إضافة التحذير بنجاح');
      }

      resetWarningForm();
      fetchData();
    } catch (error) {
      console.error('Error saving warning:', error);
      toast.error('حدث خطأ في حفظ التحذير');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInteraction = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التفاعل؟')) return;

    try {
      const { error } = await supabase
        .from('drug_interactions' as any)
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('تم حذف التفاعل بنجاح');
      fetchData();
    } catch (error) {
      console.error('Error deleting interaction:', error);
      toast.error('حدث خطأ في حذف التفاعل');
    }
  };

  const handleDeleteWarning = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التحذير؟')) return;

    try {
      const { error } = await supabase
        .from('drug_warnings' as any)
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('تم حذف التحذير بنجاح');
      fetchData();
    } catch (error) {
      console.error('Error deleting warning:', error);
      toast.error('حدث خطأ في حذف التحذير');
    }
  };

  const resetInteractionForm = () => {
    setInteractionFormData({
      drug_a_id: '',
      drug_b_id: '',
      interaction_type: 'moderate',
      severity: 'moderate',
      description: '',
      clinical_effects: '',
      management: '',
      references: '',
    });
    setEditingInteraction(null);
    setInteractionDialogOpen(false);
  };

  const resetWarningForm = () => {
    setWarningFormData({
      item_id: '',
      warning_type: 'pregnancy',
      severity: 'warning',
      title: '',
      description: '',
      precautions: '',
    });
    setEditingWarning(null);
    setWarningDialogOpen(false);
  };

  const getSeverityBadge = (severity: string) => {
    const variants: any = {
      severe: 'destructive',
      moderate: 'default',
      mild: 'secondary',
    };
    const labels: any = {
      severe: 'شديد',
      moderate: 'متوسط',
      mild: 'خفيف',
    };
    return <Badge variant={variants[severity]}>{labels[severity]}</Badge>;
  };

  const filteredInteractions = interactions.filter(interaction =>
    (interaction.drug_a as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (interaction.drug_b as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWarnings = warnings.filter(warning =>
    (warning.item as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warning.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8" dir="rtl">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />
                التفاعلات والتحذيرات الدوائية
              </h1>
              <p className="text-muted-foreground mt-1">إدارة التفاعلات الدوائية والتحذيرات الصحية</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
            <TabsList className="w-full justify-start mb-6">
              <TabsTrigger value="interactions">
                <Shield className="h-4 w-4 ml-2" />
                التفاعلات الدوائية
              </TabsTrigger>
              <TabsTrigger value="warnings">
                <AlertTriangle className="h-4 w-4 ml-2" />
                التحذيرات الدوائية
              </TabsTrigger>
            </TabsList>

            <TabsContent value="interactions">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث عن تفاعل..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <Button onClick={() => setInteractionDialogOpen(true)}>
                    <Plus className="ml-2 h-4 w-4" />
                    تفاعل جديد
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الدواء الأول</TableHead>
                        <TableHead className="text-right">الدواء الثاني</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الخطورة</TableHead>
                        <TableHead className="text-right">التأثيرات السريرية</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInteractions.map((interaction) => (
                        <TableRow key={interaction.id}>
                          <TableCell className="font-medium">{(interaction.drug_a as any)?.name}</TableCell>
                          <TableCell className="font-medium">{(interaction.drug_b as any)?.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {interaction.interaction_type === 'major' && 'رئيسي'}
                              {interaction.interaction_type === 'moderate' && 'متوسط'}
                              {interaction.interaction_type === 'minor' && 'ثانوي'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getSeverityBadge(interaction.severity)}</TableCell>
                          <TableCell className="max-w-xs truncate">{interaction.clinical_effects || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingInteraction(interaction);
                                  setInteractionFormData({
                                    drug_a_id: '',
                                    drug_b_id: '',
                                    interaction_type: interaction.interaction_type,
                                    severity: interaction.severity,
                                    description: interaction.description,
                                    clinical_effects: interaction.clinical_effects || '',
                                    management: interaction.management || '',
                                    references: '',
                                  });
                                  setInteractionDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteInteraction(interaction.id)}
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
              </div>
            </TabsContent>

            <TabsContent value="warnings">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث عن تحذير..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <Button onClick={() => setWarningDialogOpen(true)}>
                    <Plus className="ml-2 h-4 w-4" />
                    تحذير جديد
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الدواء</TableHead>
                        <TableHead className="text-right">نوع التحذير</TableHead>
                        <TableHead className="text-right">العنوان</TableHead>
                        <TableHead className="text-right">الخطورة</TableHead>
                        <TableHead className="text-right">الوصف</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWarnings.map((warning) => (
                        <TableRow key={warning.id}>
                          <TableCell className="font-medium">{(warning.item as any)?.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {warning.warning_type === 'pregnancy' && 'الحمل'}
                              {warning.warning_type === 'breastfeeding' && 'الرضاعة'}
                              {warning.warning_type === 'elderly' && 'كبار السن'}
                              {warning.warning_type === 'pediatric' && 'الأطفال'}
                              {warning.warning_type === 'renal' && 'كلوي'}
                              {warning.warning_type === 'hepatic' && 'كبدي'}
                              {warning.warning_type === 'allergy' && 'حساسية'}
                            </Badge>
                          </TableCell>
                          <TableCell>{warning.title}</TableCell>
                          <TableCell>{getSeverityBadge(warning.severity)}</TableCell>
                          <TableCell className="max-w-xs truncate">{warning.description}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingWarning(warning);
                                  setWarningFormData({
                                    item_id: '',
                                    warning_type: warning.warning_type,
                                    severity: warning.severity,
                                    title: warning.title,
                                    description: warning.description,
                                    precautions: warning.precautions || '',
                                  });
                                  setWarningDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteWarning(warning.id)}
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
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Interaction Dialog */}
        <Dialog open={interactionDialogOpen} onOpenChange={setInteractionDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInteraction ? 'تعديل التفاعل الدوائي' : 'تفاعل دوائي جديد'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInteractionSubmit} className="space-y-4" dir="rtl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الدواء الأول *</Label>
                  <Select 
                    value={interactionFormData.drug_a_id} 
                    onValueChange={(value) => setInteractionFormData({ ...interactionFormData, drug_a_id: value })}
                    disabled={!!editingInteraction}
                  >
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
                  <Label>الدواء الثاني *</Label>
                  <Select 
                    value={interactionFormData.drug_b_id} 
                    onValueChange={(value) => setInteractionFormData({ ...interactionFormData, drug_b_id: value })}
                    disabled={!!editingInteraction}
                  >
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>نوع التفاعل *</Label>
                  <Select value={interactionFormData.interaction_type} onValueChange={(value) => setInteractionFormData({ ...interactionFormData, interaction_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="major">رئيسي</SelectItem>
                      <SelectItem value="moderate">متوسط</SelectItem>
                      <SelectItem value="minor">ثانوي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>درجة الخطورة *</Label>
                  <Select value={interactionFormData.severity} onValueChange={(value) => setInteractionFormData({ ...interactionFormData, severity: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="severe">شديد</SelectItem>
                      <SelectItem value="moderate">متوسط</SelectItem>
                      <SelectItem value="mild">خفيف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>الوصف *</Label>
                <Textarea
                  value={interactionFormData.description}
                  onChange={(e) => setInteractionFormData({ ...interactionFormData, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label>التأثيرات السريرية</Label>
                <Textarea
                  value={interactionFormData.clinical_effects}
                  onChange={(e) => setInteractionFormData({ ...interactionFormData, clinical_effects: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label>الإدارة والتعامل</Label>
                <Textarea
                  value={interactionFormData.management}
                  onChange={(e) => setInteractionFormData({ ...interactionFormData, management: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetInteractionForm}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'جاري الحفظ...' : editingInteraction ? 'تحديث' : 'حفظ'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Warning Dialog */}
        <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWarning ? 'تعديل التحذير الدوائي' : 'تحذير دوائي جديد'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleWarningSubmit} className="space-y-4" dir="rtl">
              <div>
                <Label>الدواء *</Label>
                <Select 
                  value={warningFormData.item_id} 
                  onValueChange={(value) => setWarningFormData({ ...warningFormData, item_id: value })}
                  disabled={!!editingWarning}
                >
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>نوع التحذير *</Label>
                  <Select value={warningFormData.warning_type} onValueChange={(value) => setWarningFormData({ ...warningFormData, warning_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pregnancy">الحمل</SelectItem>
                      <SelectItem value="breastfeeding">الرضاعة</SelectItem>
                      <SelectItem value="elderly">كبار السن</SelectItem>
                      <SelectItem value="pediatric">الأطفال</SelectItem>
                      <SelectItem value="renal">كلوي</SelectItem>
                      <SelectItem value="hepatic">كبدي</SelectItem>
                      <SelectItem value="allergy">حساسية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>درجة الخطورة *</Label>
                  <Select value={warningFormData.severity} onValueChange={(value) => setWarningFormData({ ...warningFormData, severity: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contraindicated">ممنوع</SelectItem>
                      <SelectItem value="caution">حذر</SelectItem>
                      <SelectItem value="warning">تحذير</SelectItem>
                      <SelectItem value="info">معلومة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>العنوان *</Label>
                <Input
                  value={warningFormData.title}
                  onChange={(e) => setWarningFormData({ ...warningFormData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>الوصف *</Label>
                <Textarea
                  value={warningFormData.description}
                  onChange={(e) => setWarningFormData({ ...warningFormData, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label>الاحتياطات</Label>
                <Textarea
                  value={warningFormData.precautions}
                  onChange={(e) => setWarningFormData({ ...warningFormData, precautions: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetWarningForm}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'جاري الحفظ...' : editingWarning ? 'تحديث' : 'حفظ'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DrugInteractions;