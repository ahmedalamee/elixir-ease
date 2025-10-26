import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
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
import { Users, UserPlus, Edit, Trash2, Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import AddEmployeeDialog from "@/components/employees/AddEmployeeDialog";
import EditEmployeeDialog from "@/components/employees/EditEmployeeDialog";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Employee {
  id: string;
  user_id: string;
  employee_code: string;
  full_name: string;
  full_name_en?: string;
  phone?: string;
  email?: string;
  national_id?: string;
  hire_date?: string;
  job_title?: string;
  department?: string;
  salary?: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  role?: AppRole;
  role_id?: string;
}

const UserManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
        description: "تحتاج إلى صلاحيات مدير النظام للوصول لهذه الصفحة",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setCurrentUserRole(roleData.role);
    await fetchEmployees();
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Get all employees with their roles
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select(`
          *,
          user_roles (
            id,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (employeesError) throw employeesError;

      // Format the data
      const formattedEmployees = employeesData.map((emp: any) => ({
        id: emp.id,
        user_id: emp.user_id,
        employee_code: emp.employee_code,
        full_name: emp.full_name,
        full_name_en: emp.full_name_en,
        phone: emp.phone,
        email: emp.email,
        national_id: emp.national_id,
        hire_date: emp.hire_date,
        job_title: emp.job_title,
        department: emp.department,
        salary: emp.salary,
        is_active: emp.is_active,
        notes: emp.notes,
        created_at: emp.created_at,
        role: emp.user_roles?.[0]?.role,
        role_id: emp.user_roles?.[0]?.id,
      }));

      setEmployees(formattedEmployees);
    } catch (error: any) {
      toast({
        title: "خطأ في تحميل الموظفين",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditDialogOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", employeeId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الموظف بنجاح",
      });

      setDeleteEmployeeId(null);
      await fetchEmployees();
    } catch (error: any) {
      toast({
        title: "خطأ في الحذف",
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

  const filteredEmployees = employees.filter((emp) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      emp.full_name.toLowerCase().includes(searchLower) ||
      emp.employee_code.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.phone?.toLowerCase().includes(searchLower) ||
      emp.job_title?.toLowerCase().includes(searchLower)
    );
  });

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
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  إدارة الموظفين
                </CardTitle>
                <CardDescription>
                  عرض وإدارة بيانات الموظفين وصلاحياتهم
                </CardDescription>
              </div>
              <Button onClick={() => setAddDialogOpen(true)}>
                <UserPlus className="ml-2 h-4 w-4" />
                إضافة موظف
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث عن موظف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رمز الموظف</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>البريد / الهاتف</TableHead>
                    <TableHead>الوظيفة</TableHead>
                    <TableHead>الصلاحية</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.employee_code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.full_name}</div>
                          {employee.full_name_en && (
                            <div className="text-sm text-muted-foreground">
                              {employee.full_name_en}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {employee.email && <div>{employee.email}</div>}
                          {employee.phone && (
                            <div className="text-muted-foreground">
                              {employee.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {employee.job_title && <div>{employee.job_title}</div>}
                          {employee.department && (
                            <div className="text-muted-foreground">
                              {employee.department}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {employee.role ? (
                          <Badge variant={getRoleVariant(employee.role)}>
                            {getRoleLabel(employee.role)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            لا توجد صلاحية
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEmployee(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteEmployeeId(employee.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {searchQuery
                    ? "لا توجد نتائج للبحث"
                    : "لا يوجد موظفين في النظام"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddEmployeeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchEmployees}
      />

      <EditEmployeeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        employee={selectedEmployee}
        onSuccess={fetchEmployees}
      />

      <AlertDialog
        open={!!deleteEmployeeId}
        onOpenChange={() => setDeleteEmployeeId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف بيانات الموظف بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteEmployeeId && handleDeleteEmployee(deleteEmployeeId)
              }
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
