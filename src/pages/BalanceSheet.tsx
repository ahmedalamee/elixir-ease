import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { FileText, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBalanceSheet, BalanceSheetData } from "@/lib/accounting";

const BalanceSheet = () => {
  const { toast } = useToast();
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    try {
      setLoading(true);
      const result = await getBalanceSheet({
        asOfDate,
        branchId: null,
      });
      setData(result);
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
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رمز الحساب</TableHead>
                      <TableHead className="text-right">اسم الحساب</TableHead>
                      <TableHead className="text-left">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.assets.currentAssets.length > 0 && (
                      <>
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={3} className="font-semibold">الأصول المتداولة</TableCell>
                        </TableRow>
                        {data.assets.currentAssets.map((account) => (
                          <TableRow key={account.accountId}>
                            <TableCell>{account.accountCode}</TableCell>
                            <TableCell>{account.accountName}</TableCell>
                            <TableCell className="text-left">
                              {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(account.netBalance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                    {data.assets.fixedAssets.length > 0 && (
                      <>
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={3} className="font-semibold">الأصول الثابتة</TableCell>
                        </TableRow>
                        {data.assets.fixedAssets.map((account) => (
                          <TableRow key={account.accountId}>
                            <TableCell>{account.accountCode}</TableCell>
                            <TableCell>{account.accountName}</TableCell>
                            <TableCell className="text-left">
                              {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(account.netBalance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                    <TableRow className="bg-muted font-bold">
                      <TableCell colSpan={2}>إجمالي الأصول</TableCell>
                      <TableCell className="text-left">
                        {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(data.assets.totalAssets)}
                      </TableCell>
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
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رمز الحساب</TableHead>
                      <TableHead className="text-right">اسم الحساب</TableHead>
                      <TableHead className="text-left">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.liabilities.currentLiabilities.length > 0 && (
                      <>
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={3} className="font-semibold">الخصوم المتداولة</TableCell>
                        </TableRow>
                        {data.liabilities.currentLiabilities.map((account) => (
                          <TableRow key={account.accountId}>
                            <TableCell>{account.accountCode}</TableCell>
                            <TableCell>{account.accountName}</TableCell>
                            <TableCell className="text-left">
                              {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(account.netBalance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                    {data.liabilities.longTermLiabilities.length > 0 && (
                      <>
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={3} className="font-semibold">الخصوم طويلة الأجل</TableCell>
                        </TableRow>
                        {data.liabilities.longTermLiabilities.map((account) => (
                          <TableRow key={account.accountId}>
                            <TableCell>{account.accountCode}</TableCell>
                            <TableCell>{account.accountName}</TableCell>
                            <TableCell className="text-left">
                              {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(account.netBalance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                    <TableRow className="bg-muted">
                      <TableCell colSpan={2} className="font-medium">إجمالي الخصوم</TableCell>
                      <TableCell className="text-left">
                        {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(data.liabilities.totalLiabilities)}
                      </TableCell>
                    </TableRow>
                    
                    {data.equity.capital.length > 0 && (
                      <>
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={3} className="font-semibold">حقوق الملكية</TableCell>
                        </TableRow>
                        {data.equity.capital.map((account) => (
                          <TableRow key={account.accountId}>
                            <TableCell>{account.accountCode}</TableCell>
                            <TableCell>{account.accountName}</TableCell>
                            <TableCell className="text-left">
                              {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(account.netBalance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                    
                    {data.equity.retainedEarnings !== 0 && (
                      <TableRow>
                        <TableCell>3-2-000</TableCell>
                        <TableCell>الأرباح المحتجزة</TableCell>
                        <TableCell className="text-left">
                          {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(data.equity.retainedEarnings)}
                        </TableCell>
                      </TableRow>
                    )}
                    
                    <TableRow className="bg-muted">
                      <TableCell colSpan={2} className="font-medium">إجمالي حقوق الملكية</TableCell>
                      <TableCell className="text-left">
                        {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(data.equity.totalEquity)}
                      </TableCell>
                    </TableRow>
                    
                    <TableRow className="bg-primary/10 font-bold">
                      <TableCell colSpan={2}>إجمالي الخصوم وحقوق الملكية</TableCell>
                      <TableCell className="text-left text-primary">
                        {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(data.totalLiabilitiesAndEquity)}
                      </TableCell>
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
