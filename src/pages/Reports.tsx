import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Calendar } from "lucide-react";

const Reports = () => {
  const [reportType, setReportType] = useState("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "خطأ",
        description: "يرجى تحديد تاريخ البداية والنهاية",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (reportType === "sales") {
        const { data, error } = await supabase
          .from("sales")
          .select(`
            *,
            sale_items (
              quantity,
              unit_price,
              total
            ),
            customers (
              name
            )
          `)
          .gte("sale_date", startDate)
          .lte("sale_date", endDate)
          .order("sale_date", { ascending: false });

        if (error) throw error;

        const totalSales = data?.reduce((sum, sale) => sum + sale.final_amount, 0) || 0;
        const totalOrders = data?.length || 0;

        setReportData({
          type: "sales",
          sales: data,
          summary: {
            totalSales,
            totalOrders,
            averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
          },
        });
      } else if (reportType === "inventory") {
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            categories (
              name
            )
          `)
          .eq("is_active", true);

        if (error) throw error;

        const totalValue = data?.reduce(
          (sum, product) => sum + product.cost_price * product.quantity,
          0
        ) || 0;
        const lowStock = data?.filter(
          (p) => p.quantity <= p.min_quantity
        ).length || 0;

        setReportData({
          type: "inventory",
          products: data,
          summary: {
            totalProducts: data?.length || 0,
            totalValue,
            lowStockCount: lowStock,
          },
        });
      } else if (reportType === "customers") {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .order("balance", { ascending: false });

        if (error) throw error;

        const totalBalance = data?.reduce((sum, customer) => sum + customer.balance, 0) || 0;
        const totalLoyaltyPoints = data?.reduce(
          (sum, customer) => sum + customer.loyalty_points,
          0
        ) || 0;

        setReportData({
          type: "customers",
          customers: data,
          summary: {
            totalCustomers: data?.length || 0,
            totalBalance,
            totalLoyaltyPoints,
          },
        });
      }

      toast({
        title: "تم إنشاء التقرير بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "خطأ في إنشاء التقرير",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = "";
    let filename = "";

    if (reportData.type === "sales") {
      filename = `تقرير_المبيعات_${startDate}_${endDate}.csv`;
      csvContent = "رقم الفاتورة,العميل,المبلغ الإجمالي,المبلغ النهائي,التاريخ\n";
      reportData.sales.forEach((sale: any) => {
        csvContent += `${sale.sale_number},${sale.customers?.name || "غير محدد"},${sale.total_amount},${sale.final_amount},${new Date(sale.sale_date).toLocaleDateString("ar-SA")}\n`;
      });
    } else if (reportData.type === "inventory") {
      filename = `تقرير_المخزون_${new Date().toISOString().split("T")[0]}.csv`;
      csvContent = "المنتج,الكمية,الحد الأدنى,سعر التكلفة,القيمة الإجمالية\n";
      reportData.products.forEach((product: any) => {
        csvContent += `${product.name},${product.quantity},${product.min_quantity},${product.cost_price},${(product.cost_price * product.quantity).toFixed(2)}\n`;
      });
    } else if (reportData.type === "customers") {
      filename = `تقرير_العملاء_${new Date().toISOString().split("T")[0]}.csv`;
      csvContent = "العميل,الهاتف,الرصيد,نقاط الولاء,حد الائتمان\n";
      reportData.customers.forEach((customer: any) => {
        csvContent += `${customer.name},${customer.phone || ""},${customer.balance},${customer.loyalty_points},${customer.credit_limit}\n`;
      });
    }

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                إعدادات التقرير
              </CardTitle>
              <CardDescription>
                اختر نوع التقرير والفترة الزمنية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>نوع التقرير</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">تقرير المبيعات</SelectItem>
                    <SelectItem value="inventory">تقرير المخزون</SelectItem>
                    <SelectItem value="customers">تقرير العملاء</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportType === "sales" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">من تاريخ</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">إلى تاريخ</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              <Button
                onClick={generateReport}
                disabled={loading}
                className="w-full gap-2"
              >
                <Calendar className="h-4 w-4" />
                {loading ? "جاري الإنشاء..." : "إنشاء التقرير"}
              </Button>

              {reportData && (
                <Button
                  onClick={exportToCSV}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Download className="h-4 w-4" />
                  تصدير CSV
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>نتائج التقرير</CardTitle>
              <CardDescription>
                {reportData
                  ? "معلومات التقرير المطلوب"
                  : "اختر نوع التقرير وانقر على إنشاء التقرير"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData && (
                <div className="space-y-6">
                  {reportData.type === "sales" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                              إجمالي المبيعات
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {reportData.summary.totalSales.toFixed(2)} ر.س
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                              عدد الطلبات
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {reportData.summary.totalOrders}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                              متوسط قيمة الطلب
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {reportData.summary.averageOrderValue.toFixed(2)}{" "}
                              ر.س
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                  {reportData.type === "inventory" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            عدد المنتجات
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {reportData.summary.totalProducts}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            قيمة المخزون
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {reportData.summary.totalValue.toFixed(2)} ر.س
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-destructive">
                            مخزون منخفض
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-destructive">
                            {reportData.summary.lowStockCount}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {reportData.type === "customers" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            عدد العملاء
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {reportData.summary.totalCustomers}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            إجمالي الأرصدة
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {reportData.summary.totalBalance.toFixed(2)} ر.س
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            نقاط الولاء
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {reportData.summary.totalLoyaltyPoints}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}

              {!reportData && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لم يتم إنشاء تقرير بعد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;
