import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, CalendarIcon, LogIn, LogOut } from "lucide-react";
import { showSuccess, showError } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Navbar from "@/components/Navbar";

interface Employee {
  id: string;
  full_name: string;
  employee_code: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  check_in: string;
  check_out: string | null;
  work_hours: number | null;
  status: string | null;
  notes: string | null;
  employees: Employee;
}

export default function Attendance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    employee_id: "",
    check_in: "",
    check_out: "",
    status: "present",
    notes: "",
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, [selectedDate]);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await Promise.all([fetchAttendance(), fetchEmployees()]);
  };

  const fetchAttendance = async () => {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("employee_attendance")
        .select(`
          *,
          employees (id, full_name, employee_code)
        `)
        .gte("check_in", `${dateStr}T00:00:00`)
        .lte("check_in", `${dateStr}T23:59:59`)
        .order("check_in", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      showError("خطأ في جلب سجلات الحضور", error.message);
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
    if (!formData.employee_id || !formData.check_in) {
      showError("الرجاء تعبئة جميع الحقول المطلوبة");
      return;
    }

    try {
      const checkInTime = new Date(`${format(selectedDate, "yyyy-MM-dd")}T${formData.check_in}`);
      const checkOutTime = formData.check_out
        ? new Date(`${format(selectedDate, "yyyy-MM-dd")}T${formData.check_out}`)
        : null;

      let workHours = null;
      if (checkOutTime) {
        workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      }

      const { error } = await supabase.from("employee_attendance").insert({
        employee_id: formData.employee_id,
        check_in: checkInTime.toISOString(),
        check_out: checkOutTime?.toISOString() || null,
        work_hours: workHours,
        status: formData.status,
        notes: formData.notes || null,
      });

      if (error) throw error;

      showSuccess("تم تسجيل الحضور بنجاح");
      setDialogOpen(false);
      setFormData({
        employee_id: "",
        check_in: "",
        check_out: "",
        status: "present",
        notes: "",
      });
      fetchAttendance();
    } catch (error: any) {
      showError("خطأ في تسجيل الحضور", error.message);
    }
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), "hh:mm a", { locale: ar });
  };

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      present: { label: "حاضر", variant: "default" },
      late: { label: "متأخر", variant: "secondary" },
      absent: { label: "غائب", variant: "destructive" },
    };
    const statusInfo = statusMap[status || "present"] || statusMap.present;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
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
            <h1 className="text-3xl font-bold text-foreground">الحضور والانصراف</h1>
            <p className="text-muted-foreground mt-1">تسجيل ومتابعة حضور الموظفين</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Clock className="h-4 w-4" />
            تسجيل حضور
          </Button>
        </div>

        {/* Date Picker */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label>التاريخ:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(selectedDate, "dd MMMM yyyy", { locale: ar })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={ar}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle>سجلات الحضور ({records.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">كود الموظف</TableHead>
                  <TableHead className="text-right">اسم الموظف</TableHead>
                  <TableHead className="text-right">وقت الحضور</TableHead>
                  <TableHead className="text-right">وقت الانصراف</TableHead>
                  <TableHead className="text-right">ساعات العمل</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد سجلات حضور لهذا اليوم
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.employees.employee_code}</TableCell>
                      <TableCell>{record.employees.full_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <LogIn className="h-4 w-4 text-success" />
                          {formatTime(record.check_in)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.check_out ? (
                          <div className="flex items-center gap-2">
                            <LogOut className="h-4 w-4 text-muted-foreground" />
                            {formatTime(record.check_out)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.work_hours ? `${record.work_hours.toFixed(2)} ساعة` : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>{record.notes || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Attendance Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل حضور جديد</DialogTitle>
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
              <Label>وقت الحضور *</Label>
              <input
                type="time"
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label>وقت الانصراف</Label>
              <input
                type="time"
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">حاضر</SelectItem>
                  <SelectItem value="late">متأخر</SelectItem>
                  <SelectItem value="absent">غائب</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
