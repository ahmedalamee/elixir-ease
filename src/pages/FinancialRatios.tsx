import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TrendingUp, BarChart3, PieChart } from "lucide-react";

const FinancialRatios = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ratiosData, setRatiosData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculateRatios = async () => {
    if (!startDate || !endDate) {
      toast.error("يرجى تحديد تاريخ البداية والنهاية");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("calculate_financial_ratios", {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      setRatiosData(data);
      toast.success("تم حساب النسب المالية بنجاح");
    } catch (error: any) {
      toast.error(`فشل في حساب النسب المالية: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const RatioCard = ({ title, value, unit = "%", description, icon: Icon }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {unit}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            التحليل المالي بالنسب
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>إعدادات التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={calculateRatios} disabled={loading} className="w-full">
                  {loading ? "جاري الحساب..." : "احسب النسب المالية"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {ratiosData && (
          <>
            {/* Liquidity Ratios */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                نسب السيولة
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <RatioCard
                  title="نسبة التداول"
                  value={ratiosData.liquidity_ratios?.current_ratio}
                  unit=":1"
                  description="الأصول المتداولة / الخصوم المتداولة"
                  icon={TrendingUp}
                />
                <RatioCard
                  title="النسبة السريعة"
                  value={ratiosData.liquidity_ratios?.quick_ratio}
                  unit=":1"
                  description="(الأصول المتداولة - المخزون) / الخصوم المتداولة"
                  icon={TrendingUp}
                />
                <RatioCard
                  title="النسبة النقدية"
                  value={ratiosData.liquidity_ratios?.cash_ratio}
                  unit=":1"
                  description="النقد / الخصوم المتداولة"
                  icon={TrendingUp}
                />
              </div>
            </div>

            {/* Profitability Ratios */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <PieChart className="h-6 w-6" />
                نسب الربحية
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <RatioCard
                  title="هامش الربح الإجمالي"
                  value={ratiosData.profitability_ratios?.gross_profit_margin}
                  description="(الإيرادات - تكلفة المبيعات) / الإيرادات"
                  icon={TrendingUp}
                />
                <RatioCard
                  title="هامش الربح الصافي"
                  value={ratiosData.profitability_ratios?.net_profit_margin}
                  description="صافي الربح / الإيرادات"
                  icon={TrendingUp}
                />
                <RatioCard
                  title="العائد على الأصول"
                  value={ratiosData.profitability_ratios?.return_on_assets}
                  description="صافي الربح / إجمالي الأصول"
                  icon={TrendingUp}
                />
                <RatioCard
                  title="العائد على حقوق الملكية"
                  value={ratiosData.profitability_ratios?.return_on_equity}
                  description="صافي الربح / حقوق الملكية"
                  icon={TrendingUp}
                />
              </div>
            </div>

            {/* Leverage Ratios */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                نسب الرفع المالي
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <RatioCard
                  title="نسبة الديون"
                  value={ratiosData.leverage_ratios?.debt_ratio}
                  description="إجمالي الديون / إجمالي الأصول"
                  icon={TrendingUp}
                />
                <RatioCard
                  title="الديون إلى حقوق الملكية"
                  value={ratiosData.leverage_ratios?.debt_to_equity}
                  unit=":1"
                  description="إجمالي الديون / حقوق الملكية"
                  icon={TrendingUp}
                />
                <RatioCard
                  title="نسبة حقوق الملكية"
                  value={ratiosData.leverage_ratios?.equity_ratio}
                  description="حقوق الملكية / إجمالي الأصول"
                  icon={TrendingUp}
                />
              </div>
            </div>

            {/* Raw Data Summary */}
            <Card>
              <CardHeader>
                <CardTitle>البيانات المالية الخام</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي الأصول</p>
                    <p className="text-xl font-bold">
                      {ratiosData.raw_data?.total_assets?.toFixed(2)} ر.س
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي الخصوم</p>
                    <p className="text-xl font-bold">
                      {ratiosData.raw_data?.total_liabilities?.toFixed(2)} ر.س
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">حقوق الملكية</p>
                    <p className="text-xl font-bold">
                      {ratiosData.raw_data?.total_equity?.toFixed(2)} ر.س
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">صافي الربح</p>
                    <p className="text-xl font-bold">
                      {ratiosData.raw_data?.net_profit?.toFixed(2)} ر.س
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!ratiosData && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              يرجى تحديد الفترة الزمنية والضغط على "احسب النسب المالية" لعرض التحليل
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FinancialRatios;
