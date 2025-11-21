import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertCircle, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const TaxCompliance = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["tax-compliance-stats"],
    queryFn: async () => {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const [vatReturns, eInvoices, taxPeriods] = await Promise.all([
        supabase.from("vat_returns").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("e_invoices").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("tax_periods").select("*").order("start_date", { ascending: false }),
      ]);

      const currentMonth = await supabase.rpc("generate_vat_report", {
        p_start_date: firstDayOfMonth.toISOString().split("T")[0],
        p_end_date: today.toISOString().split("T")[0],
      });

      return {
        vatReturns: vatReturns.data || [],
        eInvoices: eInvoices.data || [],
        taxPeriods: taxPeriods.data || [],
        currentMonth: currentMonth.data as any,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8">جارٍ التحميل...</div>
      </div>
    );
  }

  const pendingEInvoices = stats?.eInvoices?.filter((inv: any) => inv.zatca_status === "pending").length || 0;
  const approvedEInvoices = stats?.eInvoices?.filter((inv: any) => inv.zatca_status === "approved").length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">لوحة التحكم الضريبية</h1>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">الفترة الحالية</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.currentMonth?.sales?.output_vat?.toFixed(2) || 0} ر.س</div>
              <p className="text-xs text-muted-foreground mt-1">ضريبة القيمة المضافة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">الإقرارات المقدمة</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.vatReturns?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">إقرار ضريبي</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">الفواتير الإلكترونية</CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedEInvoices}</div>
              <p className="text-xs text-muted-foreground mt-1">فاتورة معتمدة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">في انتظار الاعتماد</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingEInvoices}</div>
              <p className="text-xs text-muted-foreground mt-1">فاتورة منتظرة</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link to="/tax/vat-returns">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  الإقرارات الضريبية
                  <ArrowRight className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  إدارة وتقديم إقرارات ضريبة القيمة المضافة
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link to="/tax/e-invoicing">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  الفواتير الإلكترونية
                  <ArrowRight className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  متابعة حالة الفواتير الإلكترونية وإعادة الإرسال
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link to="/tax/reports">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  التقارير الضريبية
                  <ArrowRight className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  عرض وتصدير التقارير الضريبية التفصيلية
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>آخر الإقرارات الضريبية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.vatReturns?.slice(0, 5).map((ret: any) => (
                  <div key={ret.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{ret.period_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(ret.submission_date).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    <Badge variant={ret.status === "submitted" ? "default" : "secondary"}>
                      {ret.status === "submitted" ? "مقدم" : "مسودة"}
                    </Badge>
                  </div>
                ))}
                {(!stats?.vatReturns || stats.vatReturns.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد إقرارات
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>آخر الفواتير الإلكترونية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.eInvoices?.slice(0, 5).map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{inv.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        inv.zatca_status === "approved" ? "default" :
                        inv.zatca_status === "rejected" ? "destructive" :
                        "secondary"
                      }
                    >
                      {inv.zatca_status === "approved" ? "معتمد" :
                       inv.zatca_status === "rejected" ? "مرفوض" :
                       "منتظر"}
                    </Badge>
                  </div>
                ))}
                {(!stats?.eInvoices || stats.eInvoices.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد فواتير
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TaxCompliance;
