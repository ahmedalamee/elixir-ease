import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navbar from '@/components/Navbar';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Target, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const CRMReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [segmentData, setSegmentData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [churnData, setChurnData] = useState<any[]>([]);
  const [campaignPerformance, setCampaignPerformance] = useState<any[]>([]);

  const COLORS = ['#FFD700', '#C0C0C0', '#CD7F32', '#3B82F6'];

  useEffect(() => {
    checkAuth();
    fetchReportsData();
  }, [dateRange]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchReportsData = async () => {
    try {
      // Fetch customer segments distribution
      const { data: customers } = await supabase
        .from('customers')
        .select('segment');

      const segments = customers?.reduce((acc: any, customer) => {
        const seg = customer.segment || 'غير مصنف';
        acc[seg] = (acc[seg] || 0) + 1;
        return acc;
      }, {});

      setSegmentData(
        Object.entries(segments || {}).map(([name, value]) => ({
          name: name === 'gold' ? 'ذهبي' : name === 'silver' ? 'فضي' : name === 'bronze' ? 'برونزي' : name,
          value,
        }))
      );

      // Fetch churn risk data
      const { data: analyticsData } = await supabase
        .from('customer_analytics')
        .select('churn_risk_score');

      const riskCategories = {
        'منخفض (0-30)': 0,
        'متوسط (31-60)': 0,
        'مرتفع (61-80)': 0,
        'حرج (81-100)': 0,
      };

      analyticsData?.forEach((item) => {
        const score = item.churn_risk_score || 0;
        if (score <= 30) riskCategories['منخفض (0-30)']++;
        else if (score <= 60) riskCategories['متوسط (31-60)']++;
        else if (score <= 80) riskCategories['مرتفع (61-80)']++;
        else riskCategories['حرج (81-100)']++;
      });

      setChurnData(
        Object.entries(riskCategories).map(([name, value]) => ({ name, value }))
      );

      // Fetch campaign performance
      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('name, conversion_count, reached_customers_count, revenue_generated')
        .order('conversion_count', { ascending: false })
        .limit(5);

      setCampaignPerformance(
        campaigns?.map((c) => ({
          name: c.name,
          conversions: c.conversion_count,
          reach: c.reached_customers_count,
          revenue: c.revenue_generated,
        })) || []
      );

      // Mock revenue data (should be calculated from actual sales)
      setRevenueData([
        { month: 'يناير', revenue: 45000, customers: 120 },
        { month: 'فبراير', revenue: 52000, customers: 135 },
        { month: 'مارس', revenue: 48000, customers: 125 },
        { month: 'أبريل', revenue: 61000, customers: 150 },
        { month: 'مايو', revenue: 55000, customers: 140 },
        { month: 'يونيو', revenue: 67000, customers: 165 },
      ]);

    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast.error('حدث خطأ في تحميل التقارير');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-8 w-8" />
              تقارير وتحليلات CRM
            </h1>
            <p className="text-muted-foreground mt-1">تحليلات شاملة لأداء إدارة العلاقات مع العملاء</p>
          </div>
          <div className="flex gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">آخر 7 أيام</SelectItem>
                <SelectItem value="30">آخر 30 يوم</SelectItem>
                <SelectItem value="90">آخر 3 أشهر</SelectItem>
                <SelectItem value="365">آخر سنة</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Download className="ml-2 h-4 w-4" />
              تصدير التقارير
            </Button>
          </div>
        </div>

        {/* Revenue Trend */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            اتجاه الإيرادات والعملاء
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="left" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3B82F6" name="الإيرادات" />
              <Line yAxisId="right" type="monotone" dataKey="customers" stroke="#10B981" name="العملاء" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Customer Segments */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              توزيع فئات العملاء
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {segmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Churn Risk */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              تحليل خطر فقدان العملاء
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={churnData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#EF4444" name="عدد العملاء" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Campaign Performance */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            أداء الحملات التسويقية
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={campaignPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="conversions" fill="#3B82F6" name="التحويلات" />
              <Bar dataKey="reach" fill="#10B981" name="الوصول" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Key Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Card className="p-6 border-l-4 border-l-green-500">
            <h3 className="font-semibold text-lg mb-2">أفضل فئة عملاء</h3>
            <p className="text-3xl font-bold text-green-500">
              {segmentData[0]?.name || 'N/A'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              يمثلون {segmentData[0] ? ((segmentData[0].value / segmentData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1) : 0}% من القاعدة
            </p>
          </Card>

          <Card className="p-6 border-l-4 border-l-blue-500">
            <h3 className="font-semibold text-lg mb-2">أفضل حملة تسويقية</h3>
            <p className="text-2xl font-bold text-blue-500">
              {campaignPerformance[0]?.name || 'لا توجد حملات'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {campaignPerformance[0]?.conversions || 0} تحويل
            </p>
          </Card>

          <Card className="p-6 border-l-4 border-l-red-500">
            <h3 className="font-semibold text-lg mb-2">عملاء في خطر</h3>
            <p className="text-3xl font-bold text-red-500">
              {churnData.find(d => d.name.includes('حرج'))?.value || 0}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              يحتاجون إلى متابعة عاجلة
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CRMReports;