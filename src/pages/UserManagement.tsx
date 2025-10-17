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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Shield, Trash2 } from "lucide-react";
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

type AppRole = Database["public"]["Enums"]["app_role"];

interface User {
  id: string;
  email: string;
  created_at: string;
  role?: AppRole;
  role_id?: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
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
    await fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get all users from auth (via admin function or manually)
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;

      // Get all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles = authUsers.map(user => {
        const roleInfo = rolesData?.find(r => r.user_id === user.id);
        return {
          id: user.id,
          email: user.email || "",
          created_at: user.created_at,
          role: roleInfo?.role,
          role_id: roleInfo?.id,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: "خطأ في تحميل المستخدمين",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userId: string, role: AppRole) => {
    try {
      const user = users.find(u => u.id === userId);
      
      if (user?.role_id) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("id", user.role_id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });

        if (error) throw error;
      }

      toast({
        title: "تم تحديث الصلاحية",
        description: "تم تعيين الدور بنجاح",
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "خطأ في تحديث الصلاحية",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الصلاحية بنجاح",
      });

      setDeleteUserId(null);
      await fetchUsers();
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

  const getRoleVariant = (role: string) => {
    const variants: { [key: string]: any } = {
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
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              إدارة المستخدمين والصلاحيات
            </CardTitle>
            <CardDescription>
              تعيين وتعديل أدوار المستخدمين في النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>الصلاحية</TableHead>
                    <TableHead>تاريخ الإنشاء</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role || ""}
                          onValueChange={(value) => assignRole(user.id, value as AppRole)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="اختر الصلاحية" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              {getRoleLabel("admin")}
                            </SelectItem>
                            <SelectItem value="pharmacist">
                              {getRoleLabel("pharmacist")}
                            </SelectItem>
                            <SelectItem value="cashier">
                              {getRoleLabel("cashier")}
                            </SelectItem>
                            <SelectItem value="inventory_manager">
                              {getRoleLabel("inventory_manager")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell className="text-left">
                        {user.role_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteUserId(user.role_id || null)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {users.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا يوجد مستخدمين في النظام</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف صلاحية المستخدم. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteRole(deleteUserId)}
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
