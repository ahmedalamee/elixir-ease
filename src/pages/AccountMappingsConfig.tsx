import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import {
  fetchAllAccountMappings,
  fetchGlAccounts,
  createAccountMapping,
  updateAccountMapping,
  deleteAccountMapping,
} from "@/lib/accounting";
import type { ErpAccountMapping, GlAccount } from "@/types/accounting";

// قائمة الوحدات الثابتة
const MODULES = [
  { value: "sales", label: "مبيعات" },
  { value: "purchases", label: "مشتريات" },
  { value: "pos", label: "نقطة البيع" },
  { value: "returns", label: "مرتجعات" },
  { value: "inventory", label: "مخزون" },
];

// قائمة العمليات حسب الوحدة
const OPERATIONS_BY_MODULE: Record<string, { value: string; label: string }[]> = {
  sales: [
    { value: "invoice_cash", label: "فاتورة نقدية" },
    { value: "invoice_credit", label: "فاتورة آجلة" },
    { value: "sales_return", label: "مرتجع مبيعات" },
  ],
  purchases: [
    { value: "purchase_invoice", label: "فاتورة شراء" },
    { value: "purchase_return", label: "مرتجع مشتريات" },
  ],
  pos: [
    { value: "pos_sale", label: "بيع POS" },
  ],
  returns: [
    { value: "sales_return", label: "مرتجع مبيعات" },
    { value: "purchase_return", label: "مرتجع مشتريات" },
  ],
  inventory: [
    { value: "stock_adjustment", label: "تعديل مخزون" },
    { value: "warehouse_transfer", label: "تحويل بين مستودعات" },
  ],
};

interface MappingFormData {
  module: string;
  operation: string;
  branchId: string | null;
  debitAccountId: string;
  creditAccountId: string;
  notes: string;
}

export default function AccountMappingsConfig() {
  const [mappings, setMappings] = useState<ErpAccountMapping[]>([]);
  const [accounts, setAccounts] = useState<GlAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ErpAccountMapping | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  
  const { toast } = useToast();
  const { hasAnyRole, loading: rolesLoading } = useUserRole();

  const canManageAccounts = hasAnyRole(["admin", "inventory_manager"]);

  // بيانات النموذج
  const [formData, setFormData] = useState<MappingFormData>({
    module: "",
    operation: "",
    branchId: null,
    debitAccountId: "",
    creditAccountId: "",
    notes: "",
  });

  // تحميل البيانات
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [mappingsData, accountsData] = await Promise.all([
        fetchAllAccountMappings(),
        fetchGlAccounts(),
      ]);
      setMappings(mappingsData);
      // فقط الحسابات النشطة وغير الرأسية
      setAccounts(accountsData.filter((acc) => acc.isActive && !acc.isHeader));
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "خطأ في التحميل",
        description: "حدث خطأ أثناء تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // فلترة Mappings حسب الوحدة
  const filteredMappings = mappings.filter((mapping) => {
    if (moduleFilter === "all") return true;
    return mapping.module === moduleFilter;
  });

  // فتح Dialog لإضافة/تعديل
  const openDialog = (mapping?: ErpAccountMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      setFormData({
        module: mapping.module,
        operation: mapping.operation,
        branchId: mapping.branchId,
        debitAccountId: mapping.debitAccountId,
        creditAccountId: mapping.creditAccountId,
        notes: mapping.notes || "",
      });
    } else {
      setEditingMapping(null);
      setFormData({
        module: "",
        operation: "",
        branchId: null,
        debitAccountId: "",
        creditAccountId: "",
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  // حفظ Mapping
  const handleSave = async () => {
    // التحقق من البيانات
    if (
      !formData.module ||
      !formData.operation ||
      !formData.debitAccountId ||
      !formData.creditAccountId
    ) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      if (editingMapping) {
        // تعديل
        await updateAccountMapping(editingMapping.id, {
          module: formData.module,
          operation: formData.operation,
          branchId: formData.branchId,
          debitAccountId: formData.debitAccountId,
          creditAccountId: formData.creditAccountId,
          notes: formData.notes,
        });
        toast({
          title: "تم التحديث",
          description: "تم تحديث ربط الحساب بنجاح",
        });
      } else {
        // إضافة جديد
        await createAccountMapping({
          module: formData.module,
          operation: formData.operation,
          branchId: formData.branchId,
          debitAccountId: formData.debitAccountId,
          creditAccountId: formData.creditAccountId,
          notes: formData.notes,
          isActive: true,
        });
        toast({
          title: "تم الإضافة",
          description: "تم إضافة ربط الحساب بنجاح",
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving mapping:", error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ البيانات",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // تبديل حالة التفعيل
  const handleToggleActive = async (mapping: ErpAccountMapping) => {
    try {
      await updateAccountMapping(mapping.id, {
        isActive: !mapping.isActive,
      });
      toast({
        title: mapping.isActive ? "تم التعطيل" : "تم التفعيل",
        description: `تم ${mapping.isActive ? "تعطيل" : "تفعيل"} ربط الحساب`,
      });
      loadData();
    } catch (error) {
      console.error("Error toggling active:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تغيير حالة التفعيل",
        variant: "destructive",
      });
    }
  };

  // حذف Mapping
  const handleDelete = async (mapping: ErpAccountMapping) => {
    if (!confirm("هل أنت متأكد من حذف هذا الربط؟")) return;

    try {
      await deleteAccountMapping(mapping.id);
      toast({
        title: "تم الحذف",
        description: "تم حذف ربط الحساب بنجاح",
      });
      loadData();
    } catch (error) {
      console.error("Error deleting mapping:", error);
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف البيانات",
        variant: "destructive",
      });
    }
  };

  // الحصول على اسم الحساب
  const getAccountName = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    return account ? `${account.accountCode} - ${account.accountName}` : accountId;
  };

  // الحصول على اسم الوحدة
  const getModuleLabel = (module: string) => {
    return MODULES.find((m) => m.value === module)?.label || module;
  };

  // الحصول على اسم العملية
  const getOperationLabel = (module: string, operation: string) => {
    const operations = OPERATIONS_BY_MODULE[module] || [];
    return operations.find((op) => op.value === operation)?.label || operation;
  };

  if (isLoading || rolesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة ربط الحسابات</h1>
          <p className="text-muted-foreground mt-2">
            ربط حسابات دليل الحسابات مع عمليات الوحدات المختلفة
          </p>
          {!canManageAccounts && (
            <Badge variant="secondary" className="mt-2">
              رصد فقط
            </Badge>
          )}
        </div>
        {canManageAccounts && (
          <Button onClick={() => openDialog()} size="lg">
            <Plus className="ml-2 h-4 w-4" />
            إضافة ربط جديد
          </Button>
        )}
      </div>

      {/* الفلتر */}
      <Card>
        <CardHeader>
          <CardTitle>تصفية حسب الوحدة</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="اختر الوحدة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {MODULES.map((module) => (
                <SelectItem key={module.value} value={module.value}>
                  {module.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* جدول Mappings */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة ربط الحسابات</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد بيانات ربط حسابات متاحة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الوحدة</TableHead>
                    <TableHead>العملية</TableHead>
                    <TableHead>الفرع</TableHead>
                    <TableHead>الحساب المدين</TableHead>
                    <TableHead>الحساب الدائن</TableHead>
                    <TableHead>الحالة</TableHead>
                    {canManageAccounts && <TableHead>إجراءات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell>{getModuleLabel(mapping.module)}</TableCell>
                      <TableCell>{getOperationLabel(mapping.module, mapping.operation)}</TableCell>
                      <TableCell>{mapping.branchId || "الكل"}</TableCell>
                      <TableCell className="text-sm">
                        {getAccountName(mapping.debitAccountId)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getAccountName(mapping.creditAccountId)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mapping.isActive ? "default" : "secondary"}>
                          {mapping.isActive ? "نشط" : "معطل"}
                        </Badge>
                      </TableCell>
                      {canManageAccounts && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDialog(mapping)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(mapping)}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(mapping)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog إضافة/تعديل */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? "تعديل ربط الحساب" : "إضافة ربط حساب جديد"}
            </DialogTitle>
            <DialogDescription>
              حدد الوحدة والعملية والحسابات المدينة والدائنة
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* الوحدة */}
            <div className="grid gap-2">
              <Label htmlFor="module">الوحدة *</Label>
              <Select
                value={formData.module}
                onValueChange={(value) => {
                  setFormData({ ...formData, module: value, operation: "" });
                }}
              >
                <SelectTrigger id="module">
                  <SelectValue placeholder="اختر الوحدة" />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map((module) => (
                    <SelectItem key={module.value} value={module.value}>
                      {module.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* العملية */}
            <div className="grid gap-2">
              <Label htmlFor="operation">العملية *</Label>
              <Select
                value={formData.operation}
                onValueChange={(value) =>
                  setFormData({ ...formData, operation: value })
                }
                disabled={!formData.module}
              >
                <SelectTrigger id="operation">
                  <SelectValue placeholder="اختر العملية" />
                </SelectTrigger>
                <SelectContent>
                  {(OPERATIONS_BY_MODULE[formData.module] || []).map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* الحساب المدين */}
            <div className="grid gap-2">
              <Label htmlFor="debitAccount">الحساب المدين *</Label>
              <Select
                value={formData.debitAccountId}
                onValueChange={(value) =>
                  setFormData({ ...formData, debitAccountId: value })
                }
              >
                <SelectTrigger id="debitAccount">
                  <SelectValue placeholder="اختر الحساب المدين" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.accountCode} - {account.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* الحساب الدائن */}
            <div className="grid gap-2">
              <Label htmlFor="creditAccount">الحساب الدائن *</Label>
              <Select
                value={formData.creditAccountId}
                onValueChange={(value) =>
                  setFormData({ ...formData, creditAccountId: value })
                }
              >
                <SelectTrigger id="creditAccount">
                  <SelectValue placeholder="اختر الحساب الدائن" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.accountCode} - {account.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ملاحظات */}
            <div className="grid gap-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="ملاحظات إضافية (اختياري)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {editingMapping ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
