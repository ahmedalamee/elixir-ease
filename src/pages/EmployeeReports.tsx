import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Users,
  Calendar,
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

interface EmployeeStats {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  total_attendance_today: number;
  pending_leaves: number;
  pending_tasks: number;
}

interface AttendanceRecord {
  id: string;
  employee: {
    full_name: string;
    employee_code: string;
  };
  check_in: string;
  check_out?: string;
  work_hours?: number;
  status: string;
}

interface LeaveRequest {
  id: string;
  employee: {
    full_name: string;
    employee_code: string;
  };
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  status: string;
  reason?: string;
}

interface Task {
  id: string;
  employee: {
    full_name: string;
    employee_code: string;
  };
  task_title: string;
  priority: string;
  status: string;
  due_date?: string;
}

const EmployeeReports = () => {
  const [stats, setStats] = useState<EmployeeStats>({
    total_employees: 0,
    active_employees: 0,
    inactive_employees: 0,
    total_attendance_today: 0,
    pending_leaves: 0,
    pending_tasks: 0,
  });
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      toast({
        title: "غير مصرح",
        description: "تحتاج إلى صلاحيات مدير النظام",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    await fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employee stats
      const { data: empData } = await supabase
        .from("employees")
        .select("id, is_active");

      const totalEmployees = empData?.length || 0;
      const activeEmployees = empData?.filter((e) => e.is_active).length || 0;

      // Fetch today's attendance
      const today = new Date().toISOString().split("T")[0];
      const { data: attendanceData } = await supabase
        .from("employee_attendance" as any)
        .select(`
          id,
          check_in,
          check_out,
          work_hours,
          status,
          employees!inner(full_name, employee_code)
        `)
        .gte("check_in", today)
        .order("check_in", { ascending: false });

      // Fetch pending leaves
      const { data: leavesData } = await supabase
        .from("employee_leaves" as any)
        .select(`
          id,
          leave_type,
          start_date,
          end_date,
          days_count,
          status,
          reason,
          employees!inner(full_name, employee_code)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      // Fetch pending tasks
      const { data: tasksData } = await supabase
        .from("employee_tasks" as any)
        .select(`
          id,
          task_title,
          priority,
          status,
          due_date,
          employees!inner(full_name, employee_code)
        `)
        .eq("status", "pending")
        .order("due_date", { ascending: true });

      setStats({
        total_employees: totalEmployees,
        active_employees: activeEmployees,
        inactive_employees: totalEmployees - activeEmployees,
        total_attendance_today: attendanceData?.length || 0,
        pending_leaves: leavesData?.length || 0,
        pending_tasks: tasksData?.length || 0,
      });

      setAttendance(
        attendanceData?.map((a: any) => ({
          id: a.id,
          employee: {
            full_name: a.employees.full_name,
            employee_code: a.employees.employee_code,
          },
          check_in: a.check_in,
          check_out: a.check_out,
          work_hours: a.work_hours,
          status: a.status,
        })) || []
      );

      setLeaves(
        leavesData?.map((l: any) => ({
          id: l.id,
          employee: {
            full_name: l.employees.full_name,
            employee_code: l.employees.employee_code,
          },
          leave_type: l.leave_type,
          start_date: l.start_date,
          end_date: l.end_date,
          days_count: l.days_count,
          status: l.status,
          reason: l.reason,
        })) || []
      );

      setTasks(
        tasksData?.map((t: any) => ({
          id: t.id,
          employee: {
            full_name: t.employees.full_name,
            employee_code: t.employees.employee_code,
          },
          task_title: t.task_title,
          priority: t.priority,
          status: t.status,
          due_date: t.due_date,
        })) || []
      );
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

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-SA");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            تقارير الموظفين
          </h1>
          <p className="text-muted-foreground mt-2">
            عرض شامل لأداء وحضور الموظفين
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                إجمالي الموظفين
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_employees}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.active_employees} نشط • {stats.inactive_employees} غير نشط
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                الحضور اليوم
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_attendance_today}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                من أصل {stats.active_employees} موظف نشط
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                طلبات الإجازة
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_leaves}</div>
              <p className="text-xs text-muted-foreground mt-1">
                في انتظار الموافقة
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different reports */}
        <Tabs defaultValue="attendance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="attendance">
              <Calendar className="h-4 w-4 ml-2" />
              الحضور اليومي
            </TabsTrigger>
            <TabsTrigger value="leaves">
              <ClipboardList className="h-4 w-4 ml-2" />
              طلبات الإجازة
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <TrendingUp className="h-4 w-4 ml-2" />
              المهام
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>سجل الحضور اليوم</CardTitle>
                <CardDescription>
                  عرض حضور الموظفين لليوم الحالي
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الموظف</TableHead>
                        <TableHead>وقت الحضور</TableHead>
                        <TableHead>وقت الانصراف</TableHead>
                        <TableHead>ساعات العمل</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {record.employee.full_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {record.employee.employee_code}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatTime(record.check_in)}</TableCell>
                          <TableCell>
                            {record.check_out ? (
                              formatTime(record.check_out)
                            ) : (
                              <Badge variant="outline">
                                <Clock className="h-3 w-3 ml-1" />
                                لم ينصرف
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.work_hours ? (
                              `${record.work_hours} ساعة`
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.status === "present"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {record.status === "present"
                                ? "حاضر"
                                : record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {attendance.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد سجلات حضور لليوم</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaves">
            <Card>
              <CardHeader>
                <CardTitle>طلبات الإجازة المعلقة</CardTitle>
                <CardDescription>
                  طلبات الإجازة في انتظار الموافقة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الموظف</TableHead>
                        <TableHead>نوع الإجازة</TableHead>
                        <TableHead>من تاريخ</TableHead>
                        <TableHead>إلى تاريخ</TableHead>
                        <TableHead>عدد الأيام</TableHead>
                        <TableHead>السبب</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.map((leave) => (
                        <TableRow key={leave.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {leave.employee.full_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {leave.employee.employee_code}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{leave.leave_type}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(leave.start_date)}</TableCell>
                          <TableCell>{formatDate(leave.end_date)}</TableCell>
                          <TableCell>{leave.days_count} أيام</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {leave.reason || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {leaves.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد طلبات إجازة معلقة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>المهام المعلقة</CardTitle>
                <CardDescription>
                  المهام المعينة للموظفين في انتظار الإنجاز
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الموظف</TableHead>
                        <TableHead>المهمة</TableHead>
                        <TableHead>الأولوية</TableHead>
                        <TableHead>موعد التسليم</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {task.employee.full_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {task.employee.employee_code}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{task.task_title}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                task.priority === "high"
                                  ? "destructive"
                                  : task.priority === "normal"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {task.priority === "high"
                                ? "عالية"
                                : task.priority === "normal"
                                ? "عادية"
                                : "منخفضة"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {task.due_date ? formatDate(task.due_date) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {tasks.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد مهام معلقة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EmployeeReports;
