import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import { Plus, Search, Target, TrendingUp, Users, DollarSign, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  campaign_number: string;
  name: string;
  campaign_type: string;
  target_segment: string;
  start_date: string;
  end_date: string;
  status: string;
  budget: number;
  actual_cost: number;
  target_customers_count: number;
  reached_customers_count: number;
  conversion_count: number;
  revenue_generated: number;
}

const MarketingCampaigns = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    description: '',
    campaign_type: 'promotion',
    target_segment: 'all',
    start_date: '',
    end_date: '',
    budget: 0,
    discount_percentage: 0,
    discount_amount: 0,
  });

  useEffect(() => {
    checkAuth();
    fetchCampaigns();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('حدث خطأ في تحميل الحملات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingCampaign) {
        const { error } = await supabase
          .from('marketing_campaigns')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCampaign.id);

        if (error) throw error;
        toast.success('تم تحديث الحملة بنجاح');
      } else {
        // Generate campaign number
        const { data: numberData } = await supabase.rpc('generate_campaign_number');
        
        const { error } = await supabase
          .from('marketing_campaigns')
          .insert([{
            ...formData,
            campaign_number: numberData,
            created_by: user?.id,
            status: 'draft',
          }]);

        if (error) throw error;
        toast.success('تم إضافة الحملة بنجاح');
      }

      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('حدث خطأ في حفظ الحملة');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحملة؟')) return;

    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('تم حذف الحملة بنجاح');
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('حدث خطأ في حذف الحملة');
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      name_en: '',
      description: '',
      campaign_type: campaign.campaign_type,
      target_segment: campaign.target_segment,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      budget: campaign.budget,
      discount_percentage: 0,
      discount_amount: 0,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      name_en: '',
      description: '',
      campaign_type: 'promotion',
      target_segment: 'all',
      start_date: '',
      end_date: '',
      budget: 0,
      discount_percentage: 0,
      discount_amount: 0,
    });
    setEditingCampaign(null);
    setDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      draft: 'secondary',
      active: 'default',
      paused: 'outline',
      completed: 'secondary',
      cancelled: 'destructive',
    };
    const labels: any = {
      draft: 'مسودة',
      active: 'نشط',
      paused: 'متوقف',
      completed: 'مكتمل',
      cancelled: 'ملغي',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.campaign_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8" dir="rtl">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Target className="h-6 w-6" />
                إدارة الحملات التسويقية
              </h1>
              <p className="text-muted-foreground mt-1">إدارة وتتبع الحملات التسويقية والعروض الترويجية</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="ml-2 h-4 w-4" />
                  حملة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCampaign ? 'تعديل الحملة' : 'إضافة حملة جديدة'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>اسم الحملة *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>نوع الحملة *</Label>
                      <Select value={formData.campaign_type} onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">بريد إلكتروني</SelectItem>
                          <SelectItem value="sms">رسالة نصية</SelectItem>
                          <SelectItem value="promotion">عرض ترويجي</SelectItem>
                          <SelectItem value="loyalty">برنامج ولاء</SelectItem>
                          <SelectItem value="event">حدث</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>الوصف</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>الفئة المستهدفة *</Label>
                      <Select value={formData.target_segment} onValueChange={(value) => setFormData({ ...formData, target_segment: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">جميع العملاء</SelectItem>
                          <SelectItem value="gold">ذهبي</SelectItem>
                          <SelectItem value="silver">فضي</SelectItem>
                          <SelectItem value="bronze">برونزي</SelectItem>
                          <SelectItem value="custom">مخصص</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>الميزانية *</Label>
                      <Input
                        type="number"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>تاريخ البدء *</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>تاريخ الانتهاء</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>نسبة الخصم %</Label>
                      <Input
                        type="number"
                        value={formData.discount_percentage}
                        onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>مبلغ الخصم</Label>
                      <Input
                        type="number"
                        value={formData.discount_amount}
                        onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      إلغاء
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'جاري الحفظ...' : editingCampaign ? 'تحديث' : 'إضافة'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded">
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الحملات</p>
                  <p className="text-2xl font-bold">{campaigns.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">حملات نشطة</p>
                  <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'active').length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الوصول</p>
                  <p className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + c.reached_customers_count, 0)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded">
                  <DollarSign className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الإيرادات المحققة</p>
                  <p className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + c.revenue_generated, 0).toFixed(0)} ر.س</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن حملة..."
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
                  <TableHead className="text-right">رقم الحملة</TableHead>
                  <TableHead className="text-right">اسم الحملة</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الفترة</TableHead>
                  <TableHead className="text-right">الميزانية</TableHead>
                  <TableHead className="text-right">الوصول</TableHead>
                  <TableHead className="text-right">التحويلات</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.campaign_number}</TableCell>
                    <TableCell>{campaign.name}</TableCell>
                    <TableCell>
                      {campaign.campaign_type === 'email' && 'بريد إلكتروني'}
                      {campaign.campaign_type === 'sms' && 'رسالة نصية'}
                      {campaign.campaign_type === 'promotion' && 'عرض ترويجي'}
                      {campaign.campaign_type === 'loyalty' && 'برنامج ولاء'}
                      {campaign.campaign_type === 'event' && 'حدث'}
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>
                      {new Date(campaign.start_date).toLocaleDateString('ar-SA')}
                      {campaign.end_date && ` - ${new Date(campaign.end_date).toLocaleDateString('ar-SA')}`}
                    </TableCell>
                    <TableCell>{campaign.budget.toFixed(2)} ر.س</TableCell>
                    <TableCell>{campaign.reached_customers_count} / {campaign.target_customers_count}</TableCell>
                    <TableCell>{campaign.conversion_count}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(campaign)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(campaign.id)}
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
        </Card>
      </div>
    </div>
  );
};

export default MarketingCampaigns;