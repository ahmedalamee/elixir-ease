import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import { User, Phone, Mail, MapPin, DollarSign, Activity, MessageSquare, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  segment: string;
  balance: number;
  credit_limit: number;
  loyalty_points: number;
}

interface Interaction {
  id: string;
  interaction_type: string;
  interaction_date: string;
  subject: string;
  description: string;
  status: string;
}

interface Analytics {
  lifetime_value: number;
  total_purchases: number;
  total_purchase_count: number;
  average_purchase_value: number;
  last_purchase_date: string;
  churn_risk_score: number;
}

const CustomerProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id]);

  const fetchCustomerData = async () => {
    try {
      // Fetch customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Fetch interactions
      const { data: interactionsData } = await supabase
        .from('customer_interactions')
        .select('*')
        .eq('customer_id', id)
        .order('interaction_date', { ascending: false })
        .limit(10);

      setInteractions(interactionsData || []);

      // Fetch analytics
      const { data: analyticsData } = await supabase
        .from('customer_analytics')
        .select('*')
        .eq('customer_id', id)
        .single();

      setAnalytics(analyticsData);

    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast.error('حدث خطأ في تحميل بيانات العميل');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !customer) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">جاري التحميل...</div>
          </div>
        </div>
      </div>
    );
  }

  const getSegmentColor = (segment: string) => {
    const colors: any = {
      gold: 'bg-yellow-500',
      silver: 'bg-gray-400',
      bronze: 'bg-orange-700',
    };
    return colors[segment] || 'bg-blue-500';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8" dir="rtl">
        {/* Header */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </span>
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {customer.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {customer.segment && (
                <Badge className={getSegmentColor(customer.segment)}>
                  {customer.segment === 'gold' && 'ذهبي'}
                  {customer.segment === 'silver' && 'فضي'}
                  {customer.segment === 'bronze' && 'برونزي'}
                </Badge>
              )}
              {analytics && analytics.churn_risk_score > 70 && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 ml-1" />
                  عميل في خطر
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">القيمة الدائمة</p>
                <p className="text-xl font-bold">{analytics?.lifetime_value?.toFixed(2) || 0} ر.س</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عدد المشتريات</p>
                <p className="text-xl font-bold">{analytics?.total_purchase_count || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متوسط الشراء</p>
                <p className="text-xl font-bold">{analytics?.average_purchase_value?.toFixed(2) || 0} ر.س</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded">
                <Calendar className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">آخر شراء</p>
                <p className="text-sm font-bold">
                  {analytics?.last_purchase_date 
                    ? new Date(analytics.last_purchase_date).toLocaleDateString('ar-SA')
                    : 'لا يوجد'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="p-6">
          <Tabs defaultValue="interactions" dir="rtl">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="interactions">
                <MessageSquare className="h-4 w-4 ml-2" />
                التفاعلات
              </TabsTrigger>
              <TabsTrigger value="purchases">
                <DollarSign className="h-4 w-4 ml-2" />
                المشتريات
              </TabsTrigger>
              <TabsTrigger value="info">
                <User className="h-4 w-4 ml-2" />
                المعلومات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="interactions" className="mt-6">
              <div className="space-y-4">
                {interactions.length > 0 ? (
                  interactions.map((interaction) => (
                    <Card key={interaction.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{interaction.subject}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{interaction.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{new Date(interaction.interaction_date).toLocaleDateString('ar-SA')}</span>
                            <Badge variant="outline">{interaction.interaction_type}</Badge>
                            <Badge variant={interaction.status === 'resolved' ? 'default' : 'secondary'}>
                              {interaction.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">لا توجد تفاعلات</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="purchases" className="mt-6">
              <p className="text-center text-muted-foreground py-8">قريباً - سيتم عرض سجل المشتريات</p>
            </TabsContent>

            <TabsContent value="info" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">معلومات الاتصال</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.address}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">المعلومات المالية</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الرصيد الحالي:</span>
                      <span className="font-medium">{customer.balance?.toFixed(2) || 0} ر.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">حد الائتمان:</span>
                      <span className="font-medium">{customer.credit_limit?.toFixed(2) || 0} ر.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">نقاط الولاء:</span>
                      <span className="font-medium">{customer.loyalty_points || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default CustomerProfile;