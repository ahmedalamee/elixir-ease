import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, CreditCard, TrendingUp, Users } from "lucide-react";

const POSReports = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayTransactions: 0,
    cashPayments: 0,
    cardPayments: 0,
  });
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, [dateFrom, dateTo]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchSessions(), fetchStats()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("pos_sessions")
        .select("*")
        .gte("opened_at", `${dateFrom}T00:00:00`)
        .lte("opened_at", `${dateTo}T23:59:59`)
        .order("opened_at", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // مبيعات اليوم
      const { data: todayInvoices } = await (supabase as any)
        .from("sales_invoices")
        .select("total_amount")
        .gte("invoice_date", `${today}T00:00:00`)
        .eq("status", "posted");

      const todaySales = todayInvoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
      const todayTransactions = todayInvoices?.length || 0;

      // حسابات طرق الدفع (تقدير بسيط - يمكن تحسينه)
      setStats({
        todaySales,
        todayTransactions,
        cashPayments: todaySales * 0.6, // تقدير
        cardPayments: todaySales * 0.4, // تقدير
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-500">مفتوحة</Badge>;
      case "closed":
        return <Badge variant="secondary">مغلقة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">جارٍ التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">تقارير نقاط البيع</h1>
          <p className="text-muted-foreground">تحليل المبيعات وأداء الجلسات النقدية</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مبيعات اليوم</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todaySales.toFixed(2)} ر.س</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">عدد المعاملات</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayTransactions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">نقداً</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cashPayments.toFixed(2)} ر.س</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">بطاقة</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cardPayments.toFixed(2)} ر.س</div>
            </CardContent>
          </Card>
        </div>

        {/* Date Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>تصفية حسب التاريخ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dateFrom">من تاريخ</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dateTo">إلى تاريخ</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={fetchData} className="w-full">
                  تطبيق التصفية
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>الجلسات النقدية</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الجلسة</TableHead>
                  <TableHead className="text-right">تاريخ الفتح</TableHead>
                  <TableHead className="text-right">تاريخ الإغلاق</TableHead>
                  <TableHead className="text-right">المبلغ الافتتاحي</TableHead>
                  <TableHead className="text-right">المبلغ المتوقع</TableHead>
                  <TableHead className="text-right">المبلغ الفعلي</TableHead>
                  <TableHead className="text-right">الفرق</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length > 0 ? (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.session_number}</TableCell>
                      <TableCell>
                        {new Date(session.opened_at).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>
                        {session.closed_at
                          ? new Date(session.closed_at).toLocaleDateString("ar-SA")
                          : "-"}
                      </TableCell>
                      <TableCell>{session.opening_cash?.toFixed(2) || "0.00"} ر.س</TableCell>
                      <TableCell>{session.expected_cash?.toFixed(2) || "0.00"} ر.س</TableCell>
                      <TableCell>{session.closing_cash?.toFixed(2) || "-"}</TableCell>
                      <TableCell>
                        {session.difference !== null ? (
                          <span
                            className={
                              session.difference >= 0 ? "text-green-600" : "text-red-600"
                            }
                          >
                            {session.difference.toFixed(2)} ر.س
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      لا توجد جلسات في الفترة المحددة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POSReports;
