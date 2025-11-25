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
import { Calendar as CalendarIcon, Plus, Check, X } from "lucide-react";
import { showSuccess, showError } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Navbar from "@/components/Navbar";

interface Employee {
  id: string;
  full_name: string;
  employee_code: string;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  employees: Employee;
}

export default function Leaves() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [formData, setFormData] = useState({
    employee_id: "",
    leave_type: "annual",
    reason: "",
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
    await Promise.all([fetchLeaves(), fetchEmployees()]);
  };

  const fetchLeaves = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_leaves")
        .select(`
          *,
          employees (id, full_name, employee_code)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeaves(data || []);
    } catch (error: any) {
      showError("خطأ في جلب الإجازات", error.message);
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

  const calculateDays = (start: Date, end: Date) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async () => {
    if (!formData.employee_id || !startDate || !endDate) {
      showError("الرجاء تعبئة جميع الحقول المطلوبة");
      return;
    }

    try {
      const daysCount = calculateDays(startDate, endDate);

      const { error } = await supabase.from("employee_leaves").insert({
        employee_id: formData.employee_id,
        leave_type: formData.leave_type,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        days_count: daysCount,
        reason: formData.reason || null,
        status: "pending",
      });

      if (error) throw error;

      showSuccess("تم تقديم طلب الإجازة بنجاح");
      setDialogOpen(false);
      setFormData({ employee_id: "", leave_type: "annual", reason: "" });
      setStartDate(undefined);
      setEndDate(undefined);
      fetchLeaves();
    } catch (error: any) {
      showError("خطأ في تقديم الطلب", error.message);
    }
  };

  const handleApprove = async (leaveId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("employee_leaves")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", leaveId);

      if (error) throw error;

      showSuccess("تمت الموافقة على الإجازة");
      fetchLeaves();
    } catch (error: any) {
      showError("خطأ في الموافقة", error.message);
    }
  };

  const handleReject = async (leaveId: string) => {
    try {
      const { error } = await supabase
        .from("employee_leaves")
        .update({ status: "rejected" })
        .eq("id", leaveId);

      if (error) throw error;

      showSuccess("تم رفض الإجازة");
      fetchLeaves();
    } catch (error: any) {
      showError("خطأ في الرفض", error.message);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      pending: { label: "معلقة", variant: "secondary" },
      approved: { label: "موافق عليها", variant: "default" },
      rejected: { label: "مرفوضة", variant: "destructive" },
    };
    const statusInfo = statusMap[status || "pending"] || statusMap.pending;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getLeaveTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      annual: "سنوية",
      sick: "مرضية",
      emergency: "طارئة",
      unpaid: "بدون راتب",
    };
    return types[type] || type;
  };

  const stats = {
    total: leaves.length,
    pending: leaves.filter((l) => l.status === "pending").length,
    approved: leaves.filter((l) => l.status === "approved").length,
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
            <h1 className="text-3xl font-bold text-foreground">الإجازات والعطلات</h1>
            <p className="text-muted-foreground mt-1">إدارة طلبات الإجازات والموافقات</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            طلب إجازة جديد
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">الطلبات المعلقة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">الموافق عليها</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.approved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Leaves Table */}
        <Card>
          <CardHeader>
            <CardTitle>طلبات الإجازات ({leaves.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-right">نوع الإجازة</TableHead>
                  <TableHead className="text-right">من تاريخ</TableHead>
                  <TableHead className="text-right">إلى تاريخ</TableHead>
                  <TableHead className="text-right">عدد الأيام</TableHead>
                  <TableHead className="text-right">السبب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      لا توجد طلبات إجازات
                    </TableCell>
                  </TableRow>
                ) : (
                  leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">{leave.employees.full_name}</TableCell>
                      <TableCell>{getLeaveTypeLabel(leave.leave_type)}</TableCell>
                      <TableCell>{format(new Date(leave.start_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{format(new Date(leave.end_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{leave.days_count} يوم</TableCell>
                      <TableCell>{leave.reason || "-"}</TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>
                      <TableCell>
                        {leave.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleApprove(leave.id)}
                            >
                              <Check className="h-4 w-4 text-success" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReject(leave.id)}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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

      {/* Add Leave Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>طلب إجازة جديد</DialogTitle>
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
              <Label>نوع الإجازة *</Label>
              <Select value={formData.leave_type} onValueChange={(value) => setFormData({ ...formData, leave_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">سنوية</SelectItem>
                  <SelectItem value="sick">مرضية</SelectItem>
                  <SelectItem value="emergency">طارئة</SelectItem>
                  <SelectItem value="unpaid">بدون راتب</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>من تاريخ *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {startDate ? format(startDate, "dd MMMM yyyy", { locale: ar }) : "اختر التاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={ar} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>إلى تاريخ *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {endDate ? format(endDate, "dd MMMM yyyy", { locale: ar }) : "اختر التاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={ar} />
                </PopoverContent>
              </Popover>
            </div>

            {startDate && endDate && (
              <div className="text-sm text-muted-foreground">
                عدد الأيام: {calculateDays(startDate, endDate)} يوم
              </div>
            )}

            <div className="space-y-2">
              <Label>السبب</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit}>تقديم الطلب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
