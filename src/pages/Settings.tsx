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
import { Settings as SettingsIcon, Users, Shield } from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  assigned_at: string;
}

const Settings = () => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchUserRoles();
    fetchCurrentUserRole();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchCurrentUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setCurrentUserRole(data.role);
      }
    }
  };

  const fetchUserRoles = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .order("assigned_at", { ascending: false });

    if (error) {
      toast({
        title: "خطأ في تحميل البيانات",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUserRoles(data || []);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                الإعدادات
              </CardTitle>
              <CardDescription>
                إدارة إعدادات النظام والصلاحيات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">دورك الحالي:</span>
                </div>
                {currentUserRole && (
                  <Badge variant={getRoleVariant(currentUserRole)} className="text-sm">
                    {getRoleLabel(currentUserRole)}
                  </Badge>
                )}
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-medium mb-2">الصلاحيات المتاحة:</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    <strong>مدير النظام:</strong> جميع الصلاحيات
                  </div>
                  <div>
                    <strong>صيدلي:</strong> إدارة المبيعات والعملاء
                  </div>
                  <div>
                    <strong>كاشير:</strong> نقطة البيع فقط
                  </div>
                  <div>
                    <strong>مدير المخزون:</strong> إدارة المنتجات والمخزون
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                المستخدمون والصلاحيات
              </CardTitle>
              <CardDescription>
                قائمة بجميع المستخدمين وصلاحياتهم في النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentUserRole === "admin" ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>معرف المستخدم</TableHead>
                        <TableHead>الصلاحية</TableHead>
                        <TableHead>تاريخ التعيين</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userRoles.map((userRole) => (
                        <TableRow key={userRole.id}>
                          <TableCell className="font-mono text-xs">
                            {userRole.user_id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleVariant(userRole.role)}>
                              {getRoleLabel(userRole.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(userRole.assigned_at).toLocaleDateString(
                              "ar-SA"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>تحتاج إلى صلاحيات مدير النظام لعرض هذه المعلومات</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
