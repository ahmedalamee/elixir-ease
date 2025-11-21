import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, MessageSquare, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CustomerComplaints = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    customer_id: "",
    complaint_type: "",
    description: "",
    priority: "normal",
  });

  const { data: complaints, isLoading } = useQuery({
    queryKey: ["customer-complaints", searchTerm, statusFilter, priorityFilter],
    queryFn: async () => {
      let query = supabase
        .from("customer_complaints")
        .select(`
          *,
          customers (name, phone),
          employees!customer_complaints_assigned_to_fkey (full_name)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`complaint_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (priorityFilter !== "all") {
        query = query.eq("priority", priorityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const createComplaintMutation = useMutation({
    mutationFn: async (data: any) => {
      const complaintNumber = `CMP-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase.from("customer_complaints").insert({
        complaint_number: complaintNumber,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إنشاء الشكوى بنجاح");
      queryClient.invalidateQueries({ queryKey: ["customer-complaints"] });
      setIsCreateDialogOpen(false);
      setFormData({
        customer_id: "",
        complaint_type: "",
        description: "",
        priority: "normal",
      });
    },
    onError: (error: any) => {
      toast.error(`فشل إنشاء الشكوى: ${error.message}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "resolved") {
        updates.resolved_at = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) updates.resolved_by = user.id;
      }
      const { error } = await supabase
        .from("customer_complaints")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة الشكوى");
      queryClient.invalidateQueries({ queryKey: ["customer-complaints"] });
    },
    onError: (error: any) => {
      toast.error(`فشل تحديث الحالة: ${error.message}`);
    },
  });

  const assignComplaintMutation = useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { error } = await supabase
        .from("customer_complaints")
        .update({ assigned_to: employeeId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تعيين الشكوى بنجاح");
      queryClient.invalidateQueries({ queryKey: ["customer-complaints"] });
    },
    onError: (error: any) => {
      toast.error(`فشل التعيين: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      open: { variant: "secondary", label: "مفتوحة", icon: AlertCircle },
      in_progress: { variant: "default", label: "قيد المعالجة", icon: Clock },
      resolved: { variant: "default", label: "محلولة", icon: CheckCircle2 },
      closed: { variant: "outline", label: "مغلقة", icon: CheckCircle2 },
    };
    const config = variants[status] || variants.open;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      low: { variant: "outline", label: "منخفضة" },
      normal: { variant: "secondary", label: "عادية" },
      high: { variant: "default", label: "عالية" },
      urgent: { variant: "destructive", label: "عاجلة" },
    };
    const config = variants[priority] || variants.normal;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8">جارٍ التحميل...</div>
      </div>
    );
  }

  const stats = {
    open: complaints?.filter((c: any) => c.status === "open").length || 0,
    inProgress: complaints?.filter((c: any) => c.status === "in_progress").length || 0,
    resolved: complaints?.filter((c: any) => c.status === "resolved").length || 0,
    avgSatisfaction: 
      complaints?.filter((c: any) => c.satisfaction_rating)
        .reduce((acc: number, c: any) => acc + c.satisfaction_rating, 0) / 
      (complaints?.filter((c: any) => c.satisfaction_rating).length || 1) || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">شكاوى مفتوحة</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.open}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">قيد المعالجة</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">محلولة</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">معدل الرضا</CardTitle>
              <MessageSquare className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgSatisfaction.toFixed(1)}/5</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              إدارة شكاوى العملاء
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  شكوى جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>إنشاء شكوى جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>العميل</Label>
                    <Select
                      value={formData.customer_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, customer_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العميل" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((customer: any) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>نوع الشكوى</Label>
                      <Select
                        value={formData.complaint_type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, complaint_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product_quality">جودة المنتج</SelectItem>
                          <SelectItem value="service">الخدمة</SelectItem>
                          <SelectItem value="delivery">التوصيل</SelectItem>
                          <SelectItem value="pricing">التسعير</SelectItem>
                          <SelectItem value="staff_behavior">سلوك الموظفين</SelectItem>
                          <SelectItem value="other">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>الأولوية</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) =>
                          setFormData({ ...formData, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">منخفضة</SelectItem>
                          <SelectItem value="normal">عادية</SelectItem>
                          <SelectItem value="high">عالية</SelectItem>
                          <SelectItem value="urgent">عاجلة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>الوصف</Label>
                    <Textarea
                      placeholder="اكتب تفاصيل الشكوى..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={4}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => createComplaintMutation.mutate(formData)}
                    disabled={createComplaintMutation.isPending}
                  >
                    حفظ الشكوى
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الشكوى أو الوصف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="open">مفتوحة</SelectItem>
                  <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                  <SelectItem value="resolved">محلولة</SelectItem>
                  <SelectItem value="closed">مغلقة</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="الأولوية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأولويات</SelectItem>
                  <SelectItem value="low">منخفضة</SelectItem>
                  <SelectItem value="normal">عادية</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="urgent">عاجلة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الشكوى</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الأولوية</TableHead>
                  <TableHead>المعين</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التقييم</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints?.map((complaint: any) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium">{complaint.complaint_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{complaint.customers?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {complaint.customers?.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {complaint.complaint_type === "product_quality"
                        ? "جودة المنتج"
                        : complaint.complaint_type === "service"
                        ? "الخدمة"
                        : complaint.complaint_type === "delivery"
                        ? "التوصيل"
                        : complaint.complaint_type === "pricing"
                        ? "التسعير"
                        : complaint.complaint_type === "staff_behavior"
                        ? "سلوك الموظفين"
                        : "أخرى"}
                    </TableCell>
                    <TableCell>
                      {new Date(complaint.complaint_date).toLocaleDateString("ar-SA")}
                    </TableCell>
                    <TableCell>{getPriorityBadge(complaint.priority)}</TableCell>
                    <TableCell>
                      {complaint.employees?.full_name || (
                        <Select
                          onValueChange={(value) =>
                            assignComplaintMutation.mutate({
                              id: complaint.id,
                              employeeId: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="تعيين..." />
                          </SelectTrigger>
                          <SelectContent>
                            {employees?.map((emp: any) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                    <TableCell>
                      {complaint.satisfaction_rating ? (
                        <span className="text-sm">⭐ {complaint.satisfaction_rating}/5</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {complaint.status !== "resolved" && complaint.status !== "closed" && (
                        <Select
                          onValueChange={(value) =>
                            updateStatusMutation.mutate({ id: complaint.id, status: value })
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="تغيير الحالة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                            <SelectItem value="resolved">حل</SelectItem>
                            <SelectItem value="closed">إغلاق</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {complaints?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد شكاوى
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerComplaints;
