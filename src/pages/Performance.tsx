import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, CalendarIcon, Star } from "lucide-react";
import { showSuccess, showError } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Navbar from "@/components/Navbar";

interface Employee {
  id: string;
  full_name: string;
  employee_code: string;
}

interface PerformanceRecord {
  id: string;
  employee_id: string;
  evaluation_date: string;
  quality_score: number | null;
  productivity_score: number | null;
  attendance_score: number | null;
  teamwork_score: number | null;
  overall_rating: number | null;
  comments: string | null;
  employees: Employee;
}

export default function Performance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [evaluationDate, setEvaluationDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    employee_id: "",
    quality_score: 5,
    productivity_score: 5,
    attendance_score: 5,
    teamwork_score: 5,
    comments: "",
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
    await Promise.all([fetchPerformance(), fetchEmployees()]);
  };

  const fetchPerformance = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_performance")
        .select(`
          *,
          employees (id, full_name, employee_code)
        `)
        .order("evaluation_date", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      showError("خطأ في جلب التقييمات", error.message);
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

  const calculateOverall = () => {
    return (
      (formData.quality_score +
        formData.productivity_score +
        formData.attendance_score +
        formData.teamwork_score) /
      4
    );
  };

  const handleSubmit = async () => {
    if (!formData.employee_id) {
      showError("الرجاء اختيار الموظف");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("employee_performance").insert({
        employee_id: formData.employee_id,
        evaluation_date: format(evaluationDate, "yyyy-MM-dd"),
        quality_score: formData.quality_score,
        productivity_score: formData.productivity_score,
        attendance_score: formData.attendance_score,
        teamwork_score: formData.teamwork_score,
        overall_rating: calculateOverall(),
        comments: formData.comments || null,
        evaluated_by: user?.id,
      });

      if (error) throw error;

      showSuccess("تم حفظ التقييم بنجاح");
      setDialogOpen(false);
      setFormData({
        employee_id: "",
        quality_score: 5,
        productivity_score: 5,
        attendance_score: 5,
        teamwork_score: 5,
        comments: "",
      });
      setEvaluationDate(new Date());
      fetchPerformance();
    } catch (error: any) {
      showError("خطأ في حفظ التقييم", error.message);
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return "-";
    return (
      <div className="flex gap-1">
        {[...Array(10)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
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
            <h1 className="text-3xl font-bold text-foreground">تقييم الأداء</h1>
            <p className="text-muted-foreground mt-1">تقييم ومتابعة أداء الموظفين</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            تقييم جديد
          </Button>
        </div>

        {/* Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>سجلات التقييم ({records.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-right">تاريخ التقييم</TableHead>
                  <TableHead className="text-right">جودة العمل</TableHead>
                  <TableHead className="text-right">الإنتاجية</TableHead>
                  <TableHead className="text-right">الحضور</TableHead>
                  <TableHead className="text-right">العمل الجماعي</TableHead>
                  <TableHead className="text-right">التقييم الإجمالي</TableHead>
                  <TableHead className="text-right">ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      لا توجد تقييمات
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.employees.full_name}</TableCell>
                      <TableCell>{format(new Date(record.evaluation_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{renderStars(record.quality_score)}</TableCell>
                      <TableCell>{renderStars(record.productivity_score)}</TableCell>
                      <TableCell>{renderStars(record.attendance_score)}</TableCell>
                      <TableCell>{renderStars(record.teamwork_score)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">
                            {record.overall_rating?.toFixed(1) || "-"}
                          </span>
                          <span className="text-muted-foreground">/10</span>
                        </div>
                      </TableCell>
                      <TableCell>{record.comments || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Performance Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تقييم أداء جديد</DialogTitle>
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
              <Label>تاريخ التقييم</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(evaluationDate, "dd MMMM yyyy", { locale: ar })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={evaluationDate} onSelect={(date) => date && setEvaluationDate(date)} locale={ar} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>جودة العمل: {formData.quality_score}/10</Label>
              <Slider
                value={[formData.quality_score]}
                onValueChange={([value]) => setFormData({ ...formData, quality_score: value })}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>الإنتاجية: {formData.productivity_score}/10</Label>
              <Slider
                value={[formData.productivity_score]}
                onValueChange={([value]) => setFormData({ ...formData, productivity_score: value })}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>الحضور: {formData.attendance_score}/10</Label>
              <Slider
                value={[formData.attendance_score]}
                onValueChange={([value]) => setFormData({ ...formData, attendance_score: value })}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>العمل الجماعي: {formData.teamwork_score}/10</Label>
              <Slider
                value={[formData.teamwork_score]}
                onValueChange={([value]) => setFormData({ ...formData, teamwork_score: value })}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">التقييم الإجمالي</div>
              <div className="text-3xl font-bold">{calculateOverall().toFixed(1)}/10</div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={4}
                placeholder="أضف ملاحظاتك حول أداء الموظف..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit}>حفظ التقييم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
