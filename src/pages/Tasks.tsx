import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, CalendarIcon, CheckCircle2 } from "lucide-react";
import { showSuccess, showError } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Navbar from "@/components/Navbar";

interface Employee {
  id: string;
  full_name: string;
  employee_code: string;
}

interface Task {
  id: string;
  employee_id: string;
  task_title: string;
  task_description: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  completed_at: string | null;
  employees: Employee;
}

export default function Tasks() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();
  const [formData, setFormData] = useState({
    employee_id: "",
    task_title: "",
    task_description: "",
    priority: "medium",
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await Promise.all([fetchTasks(), fetchEmployees()]);
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_tasks")
        .select(`
          *,
          employees (id, full_name, employee_code)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      showError("خطأ في جلب المهام", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, employee_code")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      showError("خطأ في جلب الموظفين", error.message);
    }
  };

  const handleSubmit = async () => {
    if (!formData.employee_id || !formData.task_title) {
      showError("الرجاء تعبئة جميع الحقول المطلوبة");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("employee_tasks").insert({
        employee_id: formData.employee_id,
        task_title: formData.task_title,
        task_description: formData.task_description || null,
        priority: formData.priority,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        status: "pending",
        assigned_by: user?.id,
      });

      if (error) throw error;

      showSuccess("تم إضافة المهمة بنجاح");
      setDialogOpen(false);
      setFormData({ employee_id: "", task_title: "", task_description: "", priority: "medium" });
      setDueDate(undefined);
      fetchTasks();
    } catch (error: any) {
      showError("خطأ في إضافة المهمة", error.message);
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("employee_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;

      showSuccess("تم إتمام المهمة");
      fetchTasks();
    } catch (error: any) {
      showError("خطأ في إتمام المهمة", error.message);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      pending: { label: "معلقة", variant: "secondary" },
      in_progress: { label: "قيد التنفيذ", variant: "default" },
      completed: { label: "مكتملة", variant: "default" },
    };
    const statusInfo = statusMap[status || "pending"] || statusMap.pending;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getPriorityBadge = (priority: string | null) => {
    const priorityMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      low: { label: "منخفضة", variant: "secondary" },
      medium: { label: "متوسطة", variant: "default" },
      high: { label: "عالية", variant: "destructive" },
    };
    const priorityInfo = priorityMap[priority || "medium"] || priorityMap.medium;
    return <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>;
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">المهام والإشعارات</h1>
            <p className="text-muted-foreground mt-1">إسناد ومتابعة المهام الداخلية</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            مهمة جديدة
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">إجمالي المهام</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">المهام المعلقة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">المهام المكتملة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة المهام ({tasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-right">عنوان المهمة</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">الأولوية</TableHead>
                  <TableHead className="text-right">موعد التسليم</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد مهام
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.employees.full_name}</TableCell>
                      <TableCell>{task.task_title}</TableCell>
                      <TableCell className="max-w-xs truncate">{task.task_description || "-"}</TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>
                        {task.due_date ? format(new Date(task.due_date), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        {task.status !== "completed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleComplete(task.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>مهمة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الموظف *</Label>
              <Select value={formData.employee_id} onValueChange={(value) => setFormData({ ...formData, employee_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الموظف" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>عنوان المهمة *</Label>
              <Input
                value={formData.task_title}
                onChange={(e) => setFormData({ ...formData, task_title: e.target.value })}
                placeholder="أدخل عنوان المهمة"
              />
            </div>

            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={formData.task_description}
                onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                rows={3}
                placeholder="وصف تفصيلي للمهمة..."
              />
            </div>

            <div className="space-y-2">
              <Label>الأولوية</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">منخفضة</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>موعد التسليم</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {dueDate ? format(dueDate, "dd MMMM yyyy", { locale: ar }) : "اختر التاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={ar} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit}>إضافة المهمة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
