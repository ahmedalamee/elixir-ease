import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { FileText, Download, TrendingUp, TrendingDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BalanceSheetData {
  as_of_date: string;
  assets: {
    current_assets: number;
    fixed_assets: number;
    total_assets: number;
  };
  liabilities: {
    current_liabilities: number;
    long_term_liabilities: number;
    total_liabilities: number;
  };
  equity: {
    capital: number;
    retained_earnings: number;
    total_equity: number;
  };
  total_liabilities_and_equity: number;
}

const BalanceSheet = () => {
  const { toast } = useToast();
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase.rpc('get_balance_sheet', {
        p_as_of_date: asOfDate
      });

      if (error) throw error;
      setData(result as unknown as BalanceSheetData);
      toast({ title: "تم إنشاء التقرير بنجاح" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-6" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">الميزانية العمومية</h1>
            <p className="text-muted-foreground">قائمة المركز المالي</p>
          </div>
          <FileText className="h-8 w-8 text-primary" />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>إعدادات التقرير</CardTitle>
            <CardDescription>اختر التاريخ لإنشاء الميزانية العمومية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="asOfDate">كما في تاريخ</Label>
                <Input
                  id="asOfDate"
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={generateReport} disabled={loading} className="w-full">
                  {loading ? "جاري الإنشاء..." : "إنشاء التقرير"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {data && (
          <>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>الأصول</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">الأصول المتداولة</TableCell>
                      <TableCell className="text-left">{new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(data.assets.current_assets)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">الأصول الثابتة</TableCell>
                      <TableCell className="text-left">{new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(data.assets.fixed_assets)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted font-bold">
                      <TableCell>إجمالي الأصول</TableCell>
                      <TableCell className="text-left">{new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(data.assets.total_assets)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>الخصوم وحقوق الملكية</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">الخصوم المتداولة</TableCell>
                      <TableCell className="text-left">{new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(data.liabilities.current_liabilities)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">الخصوم طويلة الأجل</TableCell>
                      <TableCell className="text-left">{new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(data.liabilities.long_term_liabilities)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted">
                      <TableCell className="font-medium">إجمالي الخصوم</TableCell>
                      <TableCell className="text-left">{new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(data.liabilities.total_liabilities)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">حقوق الملكية</TableCell>
                      <TableCell className="text-left">{new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(data.equity.total_equity)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/10 font-bold">
                      <TableCell>إجمالي الخصوم وحقوق الملكية</TableCell>
                      <TableCell className="text-left text-primary">{new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(data.total_liabilities_and_equity)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
};

export default BalanceSheet;
