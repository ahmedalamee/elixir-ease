import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, TrendingDown, MessageSquare } from "lucide-react";

const ComplaintsReports = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: complaintsData, isLoading } = useQuery({
    queryKey: ["complaints-reports", startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("customer_complaints")
        .select(`
          *,
          customers (name, segment)
        `);

      if (startDate) {
        query = query.gte("complaint_date", startDate);
      }
      if (endDate) {
        query = query.lte("complaint_date", endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
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

  // Calculate statistics
  const totalComplaints = complaintsData?.length || 0;
  const resolvedComplaints = complaintsData?.filter((c: any) => c.status === "resolved").length || 0;
  const avgResolutionTime = complaintsData?.filter((c: any) => c.resolved_at)
    .reduce((acc: number, c: any) => {
      const created = new Date(c.created_at).getTime();
      const resolved = new Date(c.resolved_at).getTime();
      return acc + (resolved - created) / (1000 * 60 * 60 * 24); // days
    }, 0) / (resolvedComplaints || 1) || 0;

  const avgSatisfaction = complaintsData?.filter((c: any) => c.satisfaction_rating)
    .reduce((acc: number, c: any) => acc + c.satisfaction_rating, 0) / 
    (complaintsData?.filter((c: any) => c.satisfaction_rating).length || 1) || 0;

  // Group by type
  const byType = complaintsData?.reduce((acc: any, c: any) => {
    acc[c.complaint_type] = (acc[c.complaint_type] || 0) + 1;
    return acc;
  }, {});

  // Group by priority
  const byPriority = complaintsData?.reduce((acc: any, c: any) => {
    acc[c.priority] = (acc[c.priority] || 0) + 1;
    return acc;
  }, {});

  // Group by status
  const byStatus = complaintsData?.reduce((acc: any, c: any) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const resolutionRate = totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        {/* Date Filter */}
        <Card>
          <CardHeader>
            <CardTitle>فترة التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الشكاوى</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalComplaints}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">معدل الحل</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resolutionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {resolvedComplaints} من {totalComplaints}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">متوسط وقت الحل</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgResolutionTime.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">يوم</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">معدل الرضا</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSatisfaction.toFixed(1)}/5</div>
              <p className="text-xs text-muted-foreground mt-1">⭐⭐⭐⭐⭐</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <Tabs defaultValue="by-type" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="by-type">حسب النوع</TabsTrigger>
            <TabsTrigger value="by-priority">حسب الأولوية</TabsTrigger>
            <TabsTrigger value="by-status">حسب الحالة</TabsTrigger>
            <TabsTrigger value="top-complaints">الأكثر شيوعاً</TabsTrigger>
          </TabsList>

          <TabsContent value="by-type">
            <Card>
              <CardHeader>
                <CardTitle>الشكاوى حسب النوع</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نوع الشكوى</TableHead>
                      <TableHead className="text-left">العدد</TableHead>
                      <TableHead className="text-left">النسبة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(byType || {}).map(([type, count]: [string, any]) => (
                      <TableRow key={type}>
                        <TableCell>
                          {type === "product_quality"
                            ? "جودة المنتج"
                            : type === "service"
                            ? "الخدمة"
                            : type === "delivery"
                            ? "التوصيل"
                            : type === "pricing"
                            ? "التسعير"
                            : type === "staff_behavior"
                            ? "سلوك الموظفين"
                            : "أخرى"}
                        </TableCell>
                        <TableCell className="text-left font-medium">{count}</TableCell>
                        <TableCell className="text-left">
                          {((count / totalComplaints) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="by-priority">
            <Card>
              <CardHeader>
                <CardTitle>الشكاوى حسب الأولوية</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الأولوية</TableHead>
                      <TableHead className="text-left">العدد</TableHead>
                      <TableHead className="text-left">النسبة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(byPriority || {}).map(([priority, count]: [string, any]) => (
                      <TableRow key={priority}>
                        <TableCell>
                          {priority === "low"
                            ? "منخفضة"
                            : priority === "normal"
                            ? "عادية"
                            : priority === "high"
                            ? "عالية"
                            : "عاجلة"}
                        </TableCell>
                        <TableCell className="text-left font-medium">{count}</TableCell>
                        <TableCell className="text-left">
                          {((count / totalComplaints) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="by-status">
            <Card>
              <CardHeader>
                <CardTitle>الشكاوى حسب الحالة</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="text-left">العدد</TableHead>
                      <TableHead className="text-left">النسبة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(byStatus || {}).map(([status, count]: [string, any]) => (
                      <TableRow key={status}>
                        <TableCell>
                          {status === "open"
                            ? "مفتوحة"
                            : status === "in_progress"
                            ? "قيد المعالجة"
                            : status === "resolved"
                            ? "محلولة"
                            : "مغلقة"}
                        </TableCell>
                        <TableCell className="text-left font-medium">{count}</TableCell>
                        <TableCell className="text-left">
                          {((count / totalComplaints) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="top-complaints">
            <Card>
              <CardHeader>
                <CardTitle>أكثر الأسباب شيوعاً</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complaintsData
                    ?.slice(0, 10)
                    .map((complaint: any) => (
                      <div
                        key={complaint.id}
                        className="flex items-start justify-between p-4 bg-muted rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{complaint.complaint_number}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {complaint.description?.substring(0, 100)}...
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(complaint.complaint_date).toLocaleDateString("ar-SA")}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ComplaintsReports;
