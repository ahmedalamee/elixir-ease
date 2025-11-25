import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Download, Calendar } from "lucide-react";

const TaxReports = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ["tax-report", startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return null;

      const { data, error } = await supabase.rpc("generate_vat_report", {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data as any;
    },
    enabled: false,
  });

  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      toast.error("يرجى تحديد تاريخ البداية والنهاية");
      return;
    }
    refetch();
  };

  const handleExportPDF = () => {
    toast.success("جارٍ تصدير التقرير...");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              التقارير الضريبية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
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
                <div className="flex items-end gap-2">
                  <Button onClick={handleGenerateReport} className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    إنشاء التقرير
                  </Button>
                  {report && (
                    <Button variant="outline" onClick={handleExportPDF}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Report Display */}
              {isLoading && (
                <div className="text-center py-12">جارٍ إنشاء التقرير...</div>
              )}

              {report && (
                <Tabs defaultValue="sales" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="sales">المبيعات</TabsTrigger>
                    <TabsTrigger value="purchases">المشتريات</TabsTrigger>
                    <TabsTrigger value="summary">الملخص</TabsTrigger>
                  </TabsList>

                  <TabsContent value="sales">
                    <Card>
                      <CardHeader>
                        <CardTitle>تفاصيل ضريبة المبيعات</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>البند</TableHead>
                              <TableHead className="text-left">المبلغ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>مبيعات خاضعة للضريبة (15%)</TableCell>
                              <TableCell className="text-left font-medium">
                                {report.sales?.standard_rated?.toFixed(2)} ر.س
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>مبيعات بنسبة صفر</TableCell>
                              <TableCell className="text-left font-medium">
                                {report.sales?.zero_rated?.toFixed(2)} ر.س
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>إجمالي المبيعات</TableCell>
                              <TableCell className="text-left font-medium">
                                {report.sales?.total?.toFixed(2)} ر.س
                              </TableCell>
                            </TableRow>
                            <TableRow className="bg-muted">
                              <TableCell className="font-bold">ضريبة المخرجات</TableCell>
                              <TableCell className="text-left font-bold">
                                {report.sales?.output_vat?.toFixed(2)} ر.س
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="purchases">
                    <Card>
                      <CardHeader>
                        <CardTitle>تفاصيل ضريبة المشتريات</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>البند</TableHead>
                              <TableHead className="text-left">المبلغ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>مشتريات خاضعة للضريبة (15%)</TableCell>
                              <TableCell className="text-left font-medium">
                                {report.purchases?.standard_rated?.toFixed(2)} ر.س
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>مشتريات بنسبة صفر</TableCell>
                              <TableCell className="text-left font-medium">
                                {report.purchases?.zero_rated?.toFixed(2)} ر.س
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>إجمالي المشتريات</TableCell>
                              <TableCell className="text-left font-medium">
                                {report.purchases?.total?.toFixed(2)} ر.س
                              </TableCell>
                            </TableRow>
                            <TableRow className="bg-muted">
                              <TableCell className="font-bold">ضريبة المدخلات</TableCell>
                              <TableCell className="text-left font-bold">
                                {report.purchases?.input_vat?.toFixed(2)} ر.س
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="summary">
                    <Card>
                      <CardHeader>
                        <CardTitle>ملخص الإقرار الضريبي</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                            <span className="font-medium">الفترة الضريبية</span>
                            <span>
                              {report.period?.start_date} - {report.period?.end_date}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                            <span className="font-medium">ضريبة المخرجات</span>
                            <span className="text-lg font-bold">
                              {report.sales?.output_vat?.toFixed(2)} ر.س
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                            <span className="font-medium">ضريبة المدخلات</span>
                            <span className="text-lg font-bold">
                              {report.purchases?.input_vat?.toFixed(2)} ر.س
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                            <span className="font-bold text-lg">صافي الضريبة المستحقة</span>
                            <span className="text-2xl font-bold">
                              {(
                                (report.sales?.output_vat || 0) -
                                (report.purchases?.input_vat || 0)
                              ).toFixed(2)}{" "}
                              ر.س
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}

              {!report && !isLoading && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>حدد الفترة الزمنية لإنشاء التقرير الضريبي</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaxReports;
