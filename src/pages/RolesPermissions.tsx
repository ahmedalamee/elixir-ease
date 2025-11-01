import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Edit2, Copy, Trash2, Shield, Users } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Role {
  id: string;
  role_name: string;
  role_name_en: string | null;
  description: string | null;
  is_system_role: boolean;
  is_active: boolean;
}

interface Permission {
  id: string;
  permission_key: string;
  permission_name: string;
  permission_name_en: string | null;
  description: string | null;
  category: string;
  sort_order: number;
}

interface RolePermission {
  role_id: string;
  permission_id: string;
}

export default function RolesPermissions() {
  const queryClient = useQueryClient();
  
  // State
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  // Form state
  const [roleName, setRoleName] = useState("");
  const [roleNameEn, setRoleNameEn] = useState("");
  const [roleDescription, setRoleDescription] = useState("");

  // Fetch roles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Role[];
    },
  });

  // Fetch permissions
  const { data: permissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      return data as Permission[];
    },
  });

  // Fetch role permissions for selected role
  const { data: rolePermissions } = useQuery({
    queryKey: ["role-permissions", selectedRoleId],
    queryFn: async () => {
      if (!selectedRoleId) return [];
      
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role_id, permission_id")
        .eq("role_id", selectedRoleId);
      
      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: !!selectedRoleId,
  });

  // Group permissions by category
  const groupedPermissions = permissions?.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>) || {};

  // Category display names
  const categoryNames: Record<string, string> = {
    sales: "المبيعات",
    customers: "العملاء",
    inventory: "المخزون والمشتريات",
    settings: "الإعدادات العامة",
    reports: "التقارير",
  };

  // Calculate permission counts per category
  const getPermissionCounts = (category: string) => {
    const categoryPerms = groupedPermissions[category] || [];
    const activeCount = categoryPerms.filter(p => 
      rolePermissions?.some(rp => rp.permission_id === p.id)
    ).length;
    
    return { active: activeCount, total: categoryPerms.length };
  };

  // Check if permission is granted
  const isPermissionGranted = (permissionId: string) => {
    return rolePermissions?.some(rp => rp.permission_id === permissionId) || false;
  };

  // Toggle permission mutation
  const togglePermissionMutation = useMutation({
    mutationFn: async ({ permissionId, grant }: { permissionId: string; grant: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (grant) {
        const { error } = await supabase
          .from("role_permissions")
          .insert({
            role_id: selectedRoleId,
            permission_id: permissionId,
            granted_by: user?.id,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", selectedRoleId)
          .eq("permission_id", permissionId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions", selectedRoleId] });
    },
    onError: (error: any) => {
      toast.error("فشل تحديث الصلاحية: " + error.message);
    },
  });

  // Create/Update role mutation
  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingRole) {
        // Update
        const { error } = await supabase
          .from("roles")
          .update({
            role_name: roleName,
            role_name_en: roleNameEn || null,
            description: roleDescription || null,
            updated_by: user?.id,
          })
          .eq("id", editingRole.id);
        
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from("roles")
          .insert({
            role_name: roleName,
            role_name_en: roleNameEn || null,
            description: roleDescription || null,
            is_system_role: false,
            created_by: user?.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingRole ? "تم تحديث الدور بنجاح" : "تم إنشاء الدور بنجاح");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      closeRoleDialog();
    },
    onError: (error: any) => {
      toast.error("فشل حفظ الدور: " + error.message);
    },
  });

  // Copy role mutation
  const copyRoleMutation = useMutation({
    mutationFn: async (sourceRoleId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const sourceRole = roles?.find(r => r.id === sourceRoleId);
      if (!sourceRole) throw new Error("الدور المصدر غير موجود");
      
      // Create new role
      const { data: newRole, error: roleError } = await supabase
        .from("roles")
        .insert({
          role_name: sourceRole.role_name + " (نسخة)",
          role_name_en: sourceRole.role_name_en ? sourceRole.role_name_en + " (Copy)" : null,
          description: sourceRole.description,
          is_system_role: false,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (roleError) throw roleError;
      
      // Copy permissions using the database function
      const { data, error: copyError } = await supabase.rpc("copy_role_permissions", {
        _source_role_id: sourceRoleId,
        _target_role_id: newRole.id,
        _copied_by: user?.id,
      });
      
      if (copyError) throw copyError;
      
      return { newRole, copiedCount: data };
    },
    onSuccess: (result) => {
      toast.success(`تم نسخ الدور بنجاح (${result.copiedCount} صلاحية)`);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (error: any) => {
      toast.error("فشل نسخ الدور: " + error.message);
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف الدور بنجاح");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
      if (selectedRoleId === roleToDelete) {
        setSelectedRoleId(null);
      }
    },
    onError: (error: any) => {
      toast.error("فشل حذف الدور: " + error.message);
    },
  });

  // Dialog handlers
  const openRoleDialog = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setRoleName(role.role_name);
      setRoleNameEn(role.role_name_en || "");
      setRoleDescription(role.description || "");
    } else {
      setEditingRole(null);
      setRoleName("");
      setRoleNameEn("");
      setRoleDescription("");
    }
    setIsRoleDialogOpen(true);
  };

  const closeRoleDialog = () => {
    setIsRoleDialogOpen(false);
    setEditingRole(null);
    setRoleName("");
    setRoleNameEn("");
    setRoleDescription("");
  };

  const handleDeleteRole = (roleId: string) => {
    const role = roles?.find(r => r.id === roleId);
    if (role?.is_system_role) {
      toast.error("لا يمكن حذف الأدوار الافتراضية");
      return;
    }
    setRoleToDelete(roleId);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">إدارة الأدوار والصلاحيات</h1>
              <p className="text-muted-foreground">تحكم كامل بصلاحيات المستخدمين</p>
            </div>
          </div>
          <Button onClick={() => openRoleDialog()}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة دور جديد
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                الأدوار المتاحة
              </CardTitle>
              <CardDescription>
                {roles?.length || 0} دور في النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
              ) : (
                <div className="space-y-2">
                  {roles?.map((role) => (
                    <div
                      key={role.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedRoleId === role.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedRoleId(role.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{role.role_name}</h3>
                          {role.role_name_en && (
                            <p className="text-sm text-muted-foreground">{role.role_name_en}</p>
                          )}
                        </div>
                        {role.is_system_role && (
                          <Badge variant="secondary">نظام</Badge>
                        )}
                      </div>
                      
                      {role.description && (
                        <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRoleDialog(role);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyRoleMutation.mutate(role.id);
                          }}
                          disabled={copyRoleMutation.isPending}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {!role.is_system_role && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permissions Management */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>الصلاحيات</CardTitle>
              <CardDescription>
                {selectedRoleId
                  ? `إدارة صلاحيات: ${roles?.find(r => r.id === selectedRoleId)?.role_name}`
                  : "اختر دوراً لإدارة صلاحياته"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedRoleId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>الرجاء اختيار دور من القائمة لعرض وتعديل صلاحياته</p>
                </div>
              ) : (
                <Tabs defaultValue="sales" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    {Object.keys(groupedPermissions).map((category) => {
                      const counts = getPermissionCounts(category);
                      return (
                        <TabsTrigger key={category} value={category} className="flex flex-col gap-1">
                          <span>{categoryNames[category] || category}</span>
                          <Badge variant={counts.active === counts.total ? "default" : "secondary"} className="text-xs">
                            {counts.active}/{counts.total}
                          </Badge>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <TabsContent key={category} value={category} className="space-y-4 mt-4">
                      <div className="space-y-3">
                        {perms.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-start gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                          >
                            <Checkbox
                              checked={isPermissionGranted(permission.id)}
                              onCheckedChange={(checked) => {
                                togglePermissionMutation.mutate({
                                  permissionId: permission.id,
                                  grant: !!checked,
                                });
                              }}
                              disabled={togglePermissionMutation.isPending}
                            />
                            <div className="flex-1">
                              <Label className="text-base font-medium cursor-pointer">
                                {permission.permission_name}
                              </Label>
                              {permission.permission_name_en && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {permission.permission_name_en}
                                </p>
                              )}
                              {permission.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {permission.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Role Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? "تعديل الدور" : "إضافة دور جديد"}
              </DialogTitle>
              <DialogDescription>
                {editingRole 
                  ? "قم بتعديل معلومات الدور"
                  : "أنشئ دوراً جديداً وحدد صلاحياته"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="roleName">اسم الدور (عربي) *</Label>
                <Input
                  id="roleName"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="مثال: مشرف المبيعات"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="roleNameEn">اسم الدور (إنجليزي)</Label>
                <Input
                  id="roleNameEn"
                  value={roleNameEn}
                  onChange={(e) => setRoleNameEn(e.target.value)}
                  placeholder="Example: Sales Supervisor"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="اكتب وصفاً مختصراً للدور وصلاحياته"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={closeRoleDialog}>
                إلغاء
              </Button>
              <Button
                onClick={() => saveRoleMutation.mutate()}
                disabled={!roleName || saveRoleMutation.isPending}
              >
                {saveRoleMutation.isPending
                  ? "جاري الحفظ..."
                  : editingRole
                  ? "تحديث"
                  : "إنشاء"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف هذا الدور وجميع صلاحياته. لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => roleToDelete && deleteRoleMutation.mutate(roleToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
