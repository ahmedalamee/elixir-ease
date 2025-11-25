import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { Users, TrendingUp, AlertCircle, Calendar, DollarSign, Target, Activity, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  atRiskCustomers: number;
  totalRevenue: number;
  avgCustomerValue: number;
  activeCampaigns: number;
  pendingFollowUps: number;
  openComplaints: number;
}

interface UpcomingEvent {
  customer_name: string;
  event_name: string;
  event_date: string;
  event_type: string;
}

const CRMDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    atRiskCustomers: 0,
    totalRevenue: 0,
    avgCustomerValue: 0,
    activeCampaigns: 0,
    pendingFollowUps: 0,
    openComplaints: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchDashboardData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch customers stats
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      const { data: analyticsData } = await supabase
        .from('customer_analytics')
        .select('churn_risk_score, lifetime_value');

      const atRiskCustomers = analyticsData?.filter(c => c.churn_risk_score > 70).length || 0;
      const totalRevenue = analyticsData?.reduce((sum, c) => sum + (c.lifetime_value || 0), 0) || 0;
      const avgCustomerValue = totalCustomers ? totalRevenue / totalCustomers : 0;

      // Fetch active campaigns
      const { count: activeCampaigns } = await supabase
        .from('marketing_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch pending follow-ups
      const { count: pendingFollowUps } = await supabase
        .from('customer_follow_ups')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lte('scheduled_date', new Date().toISOString());

      // Fetch open complaints
      const { count: openComplaints } = await supabase
        .from('customer_complaints')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);

      // Fetch upcoming events (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: events } = await supabase
        .from('customer_events')
        .select(`
          event_name,
          event_date,
          event_type,
          customer:customers(name)
        `)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .lte('event_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(5);

      setStats({
        totalCustomers: totalCustomers || 0,
        activeCustomers: totalCustomers || 0,
        atRiskCustomers,
        totalRevenue,
        avgCustomerValue,
        activeCampaigns: activeCampaigns || 0,
        pendingFollowUps: pendingFollowUps || 0,
        openComplaints: openComplaints || 0,
      });

      setUpcomingEvents(events?.map(e => ({
        customer_name: (e.customer as any)?.name || '',
        event_name: e.event_name,
        event_date: e.event_date,
        event_type: e.event_type,
      })) || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, onClick }: any) => (
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </Card>
  );

  if (loading) {
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8" dir="rtl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">لوحة إدارة العلاقات مع العملاء</h1>
          <p className="text-muted-foreground">نظرة شاملة على أداء إدارة العملاء والحملات التسويقية</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="إجمالي العملاء"
            value={stats.totalCustomers}
            icon={Users}
            color="bg-blue-500"
            onClick={() => navigate('/customers')}
          />
          <StatCard
            title="متوسط قيمة العميل"
            value={`${stats.avgCustomerValue.toFixed(2)} ر.س`}
            icon={DollarSign}
            color="bg-green-500"
            onClick={() => navigate('/crm-reports')}
          />
          <StatCard
            title="حملات نشطة"
            value={stats.activeCampaigns}
            icon={Target}
            color="bg-purple-500"
            onClick={() => navigate('/marketing-campaigns')}
          />
          <StatCard
            title="عملاء في خطر"
            value={stats.atRiskCustomers}
            icon={AlertCircle}
            color="bg-red-500"
            onClick={() => navigate('/crm-reports')}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="متابعات معلقة"
            value={stats.pendingFollowUps}
            icon={Calendar}
            color="bg-orange-500"
            onClick={() => navigate('/customer-follow-ups')}
          />
          <StatCard
            title="شكاوى مفتوحة"
            value={stats.openComplaints}
            icon={AlertCircle}
            color="bg-yellow-500"
            onClick={() => navigate('/customer-complaints')}
          />
          <StatCard
            title="إجمالي الإيرادات"
            value={`${stats.totalRevenue.toFixed(2)} ر.س`}
            icon={TrendingUp}
            color="bg-indigo-500"
            onClick={() => navigate('/crm-reports')}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Events */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5" />
                المناسبات القادمة
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/customer-events')}>
                عرض الكل
              </Button>
            </div>
            <div className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-medium">{event.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{event.event_name}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{new Date(event.event_date).toLocaleDateString('ar-SA')}</p>
                      <p className="text-xs text-muted-foreground">{event.event_type === 'birthday' ? 'عيد ميلاد' : 'مناسبة'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">لا توجد مناسبات قادمة</p>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              إجراءات سريعة
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/marketing-campaigns')}
              >
                <Target className="h-5 w-5" />
                حملة تسويقية
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/customer-follow-ups')}
              >
                <Calendar className="h-5 w-5" />
                إضافة متابعة
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/customer-complaints')}
              >
                <AlertCircle className="h-5 w-5" />
                شكوى عميل
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/crm-reports')}
              >
                <TrendingUp className="h-5 w-5" />
                التقارير
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;