import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface Employee {
  id: string;
  user_id: string;
  employee_code: string;
  full_name: string;
  full_name_en?: string;
  phone?: string;
  email?: string;
  national_id?: string;
  job_title?: string;
  department?: string;
  salary?: number;
  is_active: boolean;
  notes?: string;
  role?: string;
  role_id?: string;
}

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSuccess: () => void;
}

type AppRole = "admin" | "pharmacist" | "cashier" | "inventory_manager";

export default function EditEmployeeDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EditEmployeeDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    full_name: "",
    full_name_en: "",
    phone: "",
    national_id: "",
    job_title: "",
    department: "",
    salary: "",
    is_active: true,
    role: "" as AppRole | "",
    notes: "",
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name || "",
        full_name_en: employee.full_name_en || "",
        phone: employee.phone || "",
        national_id: employee.national_id || "",
        job_title: employee.job_title || "",
        department: employee.department || "",
        salary: employee.salary?.toString() || "",
        is_active: employee.is_active,
        role: (employee.role as AppRole) || "",
        notes: employee.notes || "",
      });
    }
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setLoading(true);

    try {
      // 1. Update employee record
      const { error: employeeError } = await supabase
        .from("employees")
        .update({
          full_name: formData.full_name,
          full_name_en: formData.full_name_en || null,
          phone: formData.phone || null,
          national_id: formData.national_id || null,
          job_title: formData.job_title || null,
          department: formData.department || null,
          salary: formData.salary ? parseFloat(formData.salary) : null,
          is_active: formData.is_active,
          notes: formData.notes || null,
        })
        .eq("id", employee.id);

      if (employeeError) throw employeeError;

      // 2. Update or insert role
      if (formData.role) {
        if (employee.role_id) {
          // Update existing role
          const { error: roleError } = await supabase
            .from("user_roles")
            .update({ role: formData.role })
            .eq("id", employee.role_id);

          if (roleError) throw roleError;
        } else {
          // Insert new role
          const { error: roleError } = await supabase.from("user_roles").insert({
            user_id: employee.user_id,
            role: formData.role,
          });

          if (roleError) throw roleError;
        }
      } else if (employee.role_id) {
        // Delete role if cleared
        const { error: roleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("id", employee.role_id);

        if (roleError) throw roleError;
      }

      toast({
        title: "تم تحديث البيانات",
        description: "تم تحديث بيانات الموظف بنجاح",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "خطأ في التحديث",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الموظف</DialogTitle>
          <DialogDescription>
            رمز الموظف: {employee?.employee_code}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم الكامل *</Label>
              <Input
                id="full_name"
                required
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name_en">الاسم بالإنجليزية</Label>
              <Input
                id="full_name_en"
                value={formData.full_name_en}
                onChange={(e) =>
                  setFormData({ ...formData, full_name_en: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="national_id">رقم الهوية</Label>
              <Input
                id="national_id"
                value={formData.national_id}
                onChange={(e) =>
                  setFormData({ ...formData, national_id: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job_title">المسمى الوظيفي</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) =>
                  setFormData({ ...formData, job_title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">القسم</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary">الراتب</Label>
              <Input
                id="salary"
                type="number"
                step="0.01"
                value={formData.salary}
                onChange={(e) =>
                  setFormData({ ...formData, salary: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">الصلاحية</Label>
              <Select
                value={formData.role}
                onValueChange={(value: AppRole) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
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
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
            <Label htmlFor="is_active">نشط</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
