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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, UserCog, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email?: string;
  role?: string;
  role_id?: string;
}

const RolesManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
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

    await fetchEmployees();
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          id,
          employee_code,
          full_name,
          email,
          user_id,
          user_roles (
            id,
            role
          )
        `)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;

      const formatted = data.map((emp: any) => ({
        id: emp.id,
        employee_code: emp.employee_code,
        full_name: emp.full_name,
        email: emp.email,
        user_id: emp.user_id,
        role: emp.user_roles?.[0]?.role,
        role_id: emp.user_roles?.[0]?.id,
      }));

      setEmployees(formatted);
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

  const handleRoleChange = async (employeeId: string, userId: string, newRole: string, currentRoleId?: string) => {
    try {
      if (currentRoleId) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole } as any)
          .eq("id", currentRoleId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: newRole,
          } as any);

        if (error) throw error;
      }

      toast({
        title: "تم التحديث",
        description: "تم تحديث صلاحية الموظف بنجاح",
      });

      await fetchEmployees();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleLabel = (role: string) => {
    const roles: { [key: string]: string } = {
      admin: "مدير النظام",
      pharmacist: "صيدلي",
      cashier: "كاشير",
      inventory_manager: "مدير المخزون",
    };
    return roles[role] || role;
  };

  const getRoleVariant = (role: string): "default" | "secondary" | "outline" | "destructive" => {
    const variants: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
      admin: "default",
      pharmacist: "secondary",
      cashier: "outline",
      inventory_manager: "secondary",
    };
    return variants[role] || "outline";
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
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>إدارة الأدوار والصلاحيات</CardTitle>
                <CardDescription>
                  تعيين وتحديث صلاحيات الموظفين في النظام
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رمز الموظف</TableHead>
                    <TableHead>اسم الموظف</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>الصلاحية الحالية</TableHead>
                    <TableHead>تغيير الصلاحية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee: any) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.employee_code}
                      </TableCell>
                      <TableCell>{employee.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {employee.email || "غير محدد"}
                      </TableCell>
                      <TableCell>
                        {employee.role ? (
                          <Badge variant={getRoleVariant(employee.role)}>
                            {getRoleLabel(employee.role)}
                          </Badge>
                        ) : (
                          <Badge variant="outline">لا توجد صلاحية</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={employee.role || ""}
                          onValueChange={(value) =>
                            handleRoleChange(
                              employee.id,
                              employee.user_id,
                              value,
                              employee.role_id
                            )
                          }
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="اختر الصلاحية" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">مدير النظام</SelectItem>
                            <SelectItem value="pharmacist">صيدلي</SelectItem>
                            <SelectItem value="cashier">كاشير</SelectItem>
                            <SelectItem value="inventory_manager">
                              مدير المخزون
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {employees.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا يوجد موظفين نشطين في النظام</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              وصف الصلاحيات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge variant="default">مدير النظام</Badge>
                <p className="text-sm text-muted-foreground">
                  صلاحيات كاملة على جميع الوحدات والإعدادات
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary">صيدلي</Badge>
                <p className="text-sm text-muted-foreground">
                  إدارة الوصفات، السجلات الصحية، المبيعات، والعملاء
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">كاشير</Badge>
                <p className="text-sm text-muted-foreground">
                  نقطة البيع، المبيعات السريعة، وعرض المنتجات
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary">مدير المخزون</Badge>
                <p className="text-sm text-muted-foreground">
                  إدارة المخزون، المشتريات، الموردين، والمستودعات
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RolesManagement;
