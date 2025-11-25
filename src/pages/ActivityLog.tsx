import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Activity, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const ActivityLog = () => {
  const { toast } = useToast();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getModuleBadgeVariant = (module: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      sales: "default",
      inventory: "secondary",
      accounting: "outline",
      security: "destructive",
    };
    return variants[module] || "default";
  };

  const filteredActivities = activities.filter(activity => 
    search === "" || 
    activity.action_type?.toLowerCase().includes(search.toLowerCase()) ||
    activity.table_name?.toLowerCase().includes(search.toLowerCase()) ||
    activity.module?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-6" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">سجل الأنشطة</h1>
            <p className="text-muted-foreground">تتبع جميع الأنشطة في النظام</p>
          </div>
          <Activity className="h-8 w-8 text-primary" />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>بحث وفلترة</CardTitle>
            <CardDescription>ابحث في سجل الأنشطة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في الأنشطة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button variant="outline" onClick={fetchActivities}>
                تحديث
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الأنشطة الأخيرة</CardTitle>
            <CardDescription>آخر 100 نشاط في النظام</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">نوع الإجراء</TableHead>
                    <TableHead className="text-right">الجدول</TableHead>
                    <TableHead className="text-right">الوحدة</TableHead>
                    <TableHead className="text-right">الخطورة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        لا توجد أنشطة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActivities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="text-sm">
                          {new Date(activity.created_at).toLocaleString('ar-SA')}
                        </TableCell>
                        <TableCell className="font-medium">{activity.action_type}</TableCell>
                        <TableCell>{activity.table_name}</TableCell>
                        <TableCell>
                          <Badge variant={getModuleBadgeVariant(activity.module)}>
                            {activity.module || 'عام'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={activity.severity === 'high' ? 'destructive' : 'secondary'}>
                            {activity.severity || 'عادي'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ActivityLog;
