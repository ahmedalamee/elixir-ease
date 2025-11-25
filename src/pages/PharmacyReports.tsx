import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navbar from '@/components/Navbar';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, Download, Calendar, TrendingUp, Activity, AlertCircle, Pill, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';

const PharmacyReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [topMedications, setTopMedications] = useState<any[]>([]);
  const [prescriptionStats, setPrescriptionStats] = useState<any[]>([]);
  const [doctorStats, setDoctorStats] = useState<any[]>([]);
  const [interactionAlerts, setInteractionAlerts] = useState(0);
  const [totalPrescriptions, setTotalPrescriptions] = useState(0);
  const [activeDoctors, setActiveDoctors] = useState(0);
  const [healthRecords, setHealthRecords] = useState(0);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

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
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Fetch prescription stats
      const { data: prescData, error: prescError } = await supabase
        .from('prescriptions' as any)
        .select('*')
        .gte('prescription_date', startDateStr);

      if (prescError) throw prescError;
      setTotalPrescriptions(prescData?.length || 0);

      // Group by status
      const statusGroups = prescData?.reduce((acc: any, presc: any) => {
        const status = presc.status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      setPrescriptionStats(
        Object.entries(statusGroups || {}).map(([status, count]) => ({
          name: status === 'pending' ? 'قيد الانتظار' : status === 'filled' ? 'مصروف' : status === 'cancelled' ? 'ملغي' : status,
          value: count,
        }))
      );

      // Fetch doctors count
      const { count: doctorsCount } = await supabase
        .from('doctors' as any)
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      setActiveDoctors(doctorsCount || 0);

      // Fetch health records count
      const { count: recordsCount } = await supabase
        .from('customer_health_records' as any)
        .select('*', { count: 'exact', head: true });
      setHealthRecords(recordsCount || 0);

      // Fetch interaction alerts
      const { count: interactionsCount } = await supabase
        .from('drug_interactions' as any)
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('severity', 'severe');
      setInteractionAlerts(interactionsCount || 0);

      // Mock data for top medications (should be calculated from actual dispensing data)
      setTopMedications([
        { name: 'باراسيتامول', count: 145 },
        { name: 'أموكسيسيلين', count: 98 },
        { name: 'إيبوبروفين', count: 87 },
        { name: 'أوميبرازول', count: 76 },
        { name: 'ميتفورمين', count: 65 },
      ]);

      // Mock data for doctor statistics
      setDoctorStats([
        { name: 'د. أحمد محمد', prescriptions: 45 },
        { name: 'د. فاطمة علي', prescriptions: 38 },
        { name: 'د. محمد خالد', prescriptions: 32 },
        { name: 'د. سارة حسن', prescriptions: 28 },
        { name: 'د. عمر يوسف', prescriptions: 24 },
      ]);

    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast.error('حدث خطأ في تحميل التقارير');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card className="p-6">
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8" />
              التقارير الصيدلانية
            </h1>
            <p className="text-muted-foreground mt-1">تقارير وإحصائيات شاملة للنظام الصيدلي</p>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="إجمالي الوصفات"
            value={totalPrescriptions}
            icon={FileText}
            color="bg-blue-500"
          />
          <StatCard
            title="الأطباء النشطون"
            value={activeDoctors}
            icon={Stethoscope}
            color="bg-green-500"
          />
          <StatCard
            title="السجلات الصحية"
            value={healthRecords}
            icon={Activity}
            color="bg-purple-500"
          />
          <StatCard
            title="تفاعلات حرجة"
            value={interactionAlerts}
            icon={AlertCircle}
            color="bg-red-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Medications */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Pill className="h-5 w-5" />
              الأدوية الأكثر صرفاً
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topMedications}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" name="عدد مرات الصرف" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Prescription Status */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              حالة الوصفات الطبية
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prescriptionStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {prescriptionStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Doctor Statistics */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            إحصائيات الأطباء
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={doctorStats} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="prescriptions" fill="#10B981" name="عدد الوصفات" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Key Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-l-4 border-l-blue-500">
            <h3 className="font-semibold text-lg mb-2">معدل الوصفات اليومي</h3>
            <p className="text-3xl font-bold text-blue-500">
              {(totalPrescriptions / parseInt(dateRange)).toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              وصفة في اليوم خلال الفترة المحددة
            </p>
          </Card>

          <Card className="p-6 border-l-4 border-l-green-500">
            <h3 className="font-semibold text-lg mb-2">متوسط الوصفات للطبيب</h3>
            <p className="text-3xl font-bold text-green-500">
              {activeDoctors > 0 ? (totalPrescriptions / activeDoctors).toFixed(1) : 0}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              وصفة لكل طبيب نشط
            </p>
          </Card>

          <Card className="p-6 border-l-4 border-l-red-500">
            <h3 className="font-semibold text-lg mb-2">نسبة التفاعلات الحرجة</h3>
            <p className="text-3xl font-bold text-red-500">
              {((interactionAlerts / (totalPrescriptions || 1)) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              من إجمالي الوصفات المصروفة
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PharmacyReports;