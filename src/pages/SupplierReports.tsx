import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Download, TrendingUp, Package, DollarSign } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const SupplierReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Stats
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  // Data
  const [topSuppliers, setTopSuppliers] = useState<any[]>([]);
  const [supplierBalances, setSupplierBalances] = useState<any[]>([]);
  const [purchaseTrends, setPurchaseTrends] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchReports = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "تنبيه",
        description: "يرجى تحديد الفترة الزمنية",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await Promise.all([
        fetchSupplierStats(),
        fetchTopSuppliers(),
        fetchSupplierBalances(),
        fetchPurchaseTrends(),
      ]);

      toast({
        title: "تم بنجاح",
        description: "تم إنشاء التقارير بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierStats = async () => {
    // إجمالي الموردين
    const { count: suppliersCount } = await supabase
      .from("suppliers")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    setTotalSuppliers(suppliersCount || 0);

    // إجمالي المشتريات
    const { data: purchases } = await (supabase as any)
      .from("purchase_invoices")
      .select("total_amount")
      .gte("invoice_date", startDate)
      .lte("invoice_date", endDate)
      .eq("status", "posted");

    const total = purchases?.reduce((sum: number, p: any) => sum + p.total_amount, 0) || 0;
    setTotalPurchases(total);

    // إجمالي أرصدة الموردين
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("balance");

    const totalBal = suppliers?.reduce((sum, s) => sum + (s.balance || 0), 0) || 0;
    setTotalBalance(totalBal);
  };

  const fetchTopSuppliers = async () => {
    const { data: purchases } = await (supabase as any)
      .from("purchase_invoices")
      .select(`
        total_amount,
        supplier:suppliers(id, name)
      `)
      .gte("invoice_date", startDate)
      .lte("invoice_date", endDate)
      .eq("status", "posted");

    const supplierMap = new Map();
    purchases?.forEach((p: any) => {
      const supplierId = p.supplier?.id;
      const supplierName = p.supplier?.name || "غير محدد";
      if (supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          name: supplierName,
          totalPurchases: supplierMap.get(supplierId).totalPurchases + p.total_amount,
        });
      } else {
        supplierMap.set(supplierId, {
          name: supplierName,
          totalPurchases: p.total_amount,
        });
      }
    });

    const sorted = Array.from(supplierMap.values())
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, 10);

    setTopSuppliers(sorted);
  };

  const fetchSupplierBalances = async () => {
    const { data } = await supabase
      .from("suppliers")
      .select("name, balance")
      .eq("is_active", true)
      .order("balance", { ascending: false })
      .limit(10);

    setSupplierBalances(data || []);
  };

  const fetchPurchaseTrends = async () => {
    const { data } = await (supabase as any)
      .from("purchase_invoices")
      .select("invoice_date, total_amount")
      .gte("invoice_date", startDate)
      .lte("invoice_date", endDate)
      .eq("status", "posted")
      .order("invoice_date");

    const grouped = data?.reduce((acc: any, inv: any) => {
      const date = new Date(inv.invoice_date).toLocaleDateString("ar-SA", {
        month: "short",
        day: "numeric",
      });
      if (!acc[date]) {
        acc[date] = { date, amount: 0 };
      }
      acc[date].amount += inv.total_amount;
      return acc;
    }, {});

    setPurchaseTrends(Object.values(grouped || {}));
  };

  const exportToCSV = () => {
    let csvContent = `تقارير الموردين من ${startDate} إلى ${endDate}\n\n`;
    csvContent += "أفضل 10 موردين\n";
    csvContent += "المورد,إجمالي المشتريات\n";
    topSuppliers.forEach((s) => {
      csvContent += `${s.name},${s.totalPurchases.toFixed(2)}\n`;
    });
    csvContent += "\n";

    csvContent += "أرصدة الموردين\n";
    csvContent += "المورد,الرصيد\n";
    supplierBalances.forEach((s) => {
      csvContent += `${s.name},${s.balance.toFixed(2)}\n`;
    });

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `تقارير_الموردين_${startDate}_${endDate}.csv`);
    link.click();
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            تقارير الموردين
          </h1>
          <p className="text-muted-foreground">تحليل شامل لأداء الموردين والمشتريات</p>
        </div>

        {/* إعدادات التقرير */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>إعدادات التقرير</CardTitle>
            <CardDescription>حدد الفترة الزمنية لإنشاء التقرير</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={fetchReports} disabled={loading}>
                  {loading ? "جاري الإنشاء..." : "إنشاء التقرير"}
                </Button>
                {topSuppliers.length > 0 && (
                  <Button onClick={exportToCSV} variant="outline">
                    <Download className="ml-2 h-4 w-4" />
                    تصدير CSV
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* الإحصائيات */}
        {topSuppliers.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الموردين</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalSuppliers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي المشتريات</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalPurchases.toFixed(2)} ر.س</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الأرصدة</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalBalance.toFixed(2)} ر.س</div>
                </CardContent>
              </Card>
            </div>

            {/* التقارير */}
            <Tabs defaultValue="top-suppliers" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="top-suppliers">أفضل الموردين</TabsTrigger>
                <TabsTrigger value="balances">الأرصدة</TabsTrigger>
                <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
              </TabsList>

              <TabsContent value="top-suppliers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>أفضل 10 موردين حسب المشتريات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={topSuppliers}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalPurchases" fill="#8884d8" name="المشتريات (ر.س)" />
                      </BarChart>
                    </ResponsiveContainer>

                    <Table className="mt-6">
                      <TableHeader>
                        <TableRow>
                          <TableHead>المورد</TableHead>
                          <TableHead className="text-right">إجمالي المشتريات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topSuppliers.map((supplier, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{supplier.name}</TableCell>
                            <TableCell className="text-right font-mono">
                              {supplier.totalPurchases.toFixed(2)} ر.س
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="balances" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>أرصدة الموردين</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={supplierBalances.slice(0, 6)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.balance.toFixed(0)}`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="balance"
                        >
                          {supplierBalances.slice(0, 6).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>

                    <Table className="mt-6">
                      <TableHeader>
                        <TableRow>
                          <TableHead>المورد</TableHead>
                          <TableHead className="text-right">الرصيد</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplierBalances.map((supplier, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{supplier.name}</TableCell>
                            <TableCell className="text-right font-mono">
                              {supplier.balance.toFixed(2)} ر.س
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>اتجاهات المشتريات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={purchaseTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="amount" fill="#82ca9d" name="المبلغ (ر.س)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default SupplierReports;
