import { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import type { GlAccountTreeNode } from "@/types/accounting";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUserRole } from "@/hooks/useUserRole";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AddAccountDialog } from "./AddAccountDialog";
import { EditAccountDialog } from "./EditAccountDialog";
import { createGlAccount, updateGlAccount, deactivateGlAccount } from "@/lib/accounting";
import type { GlAccountInsert, GlAccountUpdate } from "@/types/accounting";

interface SelectedAccountInfoProps {
  account: GlAccountTreeNode | null;
  onRefresh: () => void;
}

export const SelectedAccountInfo = ({
  account,
  onRefresh,
}: SelectedAccountInfoProps) => {
  const { toast } = useToast();
  const { hasAnyRole, loading: rolesLoading } = useUserRole();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user has permission to manage accounts
  // Only admin and inventory_manager can create/edit/delete accounts
  const canManageAccounts = hasAnyRole(['admin', 'inventory_manager']);

  const handleAddChild = () => {
    if (!account) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار حساب رئيسي أولاً",
        variant: "destructive",
      });
      return;
    }
    setShowAddDialog(true);
  };

  const handleEdit = () => {
    if (!account) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار حساب للتعديل",
        variant: "destructive",
      });
      return;
    }
    setShowEditDialog(true);
  };

  const handleDelete = () => {
    if (!account) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار حساب للحذف",
        variant: "destructive",
      });
      return;
    }

    // Check if account has children
    if (account.children && account.children.length > 0) {
      toast({
        title: "لا يمكن الحذف",
        description:
          "لا يمكن حذف حساب يحتوي على حسابات فرعية. يرجى حذف أو نقل الحسابات الفرعية أولاً.",
        variant: "destructive",
      });
      return;
    }

    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!account) return;

    setIsDeleting(true);
    try {
      // TODO: before deactivating, check if account has any journal entries
      // TODO: add server-side constraint to prevent deactivating accounts in use
      await deactivateGlAccount(account.id);
      toast({
        title: "تم بنجاح",
        description: "تم إلغاء تفعيل الحساب بنجاح",
      });
      setShowDeleteDialog(false);
      onRefresh();
    } catch (error) {
      console.error("Error deactivating account:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الحساب",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSuccess = async (data: GlAccountInsert) => {
    try {
      await createGlAccount(data);
      toast({
        title: "تم بنجاح",
        description: "تم إضافة الحساب بنجاح",
      });
      onRefresh();
    } catch (error) {
      console.error("Error creating account:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة الحساب",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleEditSuccess = async (id: string, updates: GlAccountUpdate) => {
    try {
      await updateGlAccount(id, updates);
      toast({
        title: "تم بنجاح",
        description: "تم تعديل الحساب بنجاح",
      });
      onRefresh();
    } catch (error) {
      console.error("Error updating account:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تعديل الحساب",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Empty state
  if (!account) {
    return (
      <div className="h-[calc(100vh-16rem)] flex flex-col items-center justify-center p-8 bg-card">
        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
          <span className="text-4xl">📊</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          لم يتم اختيار حساب
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          اختر حساباً من الشجرة على اليمين لعرض تفاصيله وإدارته
        </p>
      </div>
    );
  }

  // Account selected
  return (
    <div className="h-[calc(100vh-16rem)] overflow-hidden flex flex-col bg-card">
      {/* Header */}
      <div className="p-6 border-b bg-muted/30 flex-shrink-0">
        <h3 className="text-lg font-semibold text-foreground">بيانات الحساب</h3>
        <p className="text-xs text-muted-foreground mt-1">
          عرض وإدارة معلومات الحساب المحدد
        </p>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Account Details */}
          <div className="space-y-4">
            {/* Account Code */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                رقم الحساب
              </label>
              <div className="mt-1.5 text-lg font-mono font-semibold text-foreground">
                {account.accountCode}
              </div>
            </div>

            <Separator />

            {/* Account Name */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                اسم الحساب
              </label>
              <div className="mt-1.5 text-lg font-semibold text-foreground">
                {account.accountName}
              </div>
            </div>

            {/* English Name (if exists) */}
            {account.accountNameEn && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    الاسم بالإنجليزية
                  </label>
                  <div className="mt-1.5 text-base text-foreground">
                    {account.accountNameEn}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Parent Account */}
            {account.parentAccountId && (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    الحساب الأعلى
                  </label>
                  <div className="mt-1.5 text-base text-foreground font-mono text-sm">
                    {account.parentAccountId}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Is Header Account */}
            {account.isHeader && (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    نوع الحساب
                  </label>
                  <div className="mt-1.5">
                    <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                      حساب رئيسي (Header)
                    </span>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Account Level */}
            {account.level !== undefined && (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    مستوى الحساب
                  </label>
                  <div className="mt-1.5 text-base text-foreground">
                    المستوى {account.level}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Account Type */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                تصنيف الحساب
              </label>
              <div className="mt-1.5 text-base text-foreground">
                {getAccountTypeLabel(account.accountType)}
              </div>
            </div>

            <Separator />

            {/* Currency */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                العملة
              </label>
              <div className="mt-1.5 text-base text-foreground font-mono">
                {account.currency}
              </div>
            </div>

            {/* Description (if exists) */}
            {account.description && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    الوصف
                  </label>
                  <div className="mt-1.5 text-sm text-foreground">
                    {account.description}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Status */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                الحالة
              </label>
              <div className="mt-1.5">
                <span
                  className={cn(
                    "inline-flex px-3 py-1 rounded-full text-sm font-medium",
                    account.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  )}
                >
                  {account.isActive ? "نشط" : "غير نشط"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Fixed at Bottom */}
      <div className="p-6 border-t bg-muted/20 flex-shrink-0">
        {canManageAccounts ? (
          <div className="flex gap-3">
            <Button
              onClick={handleAddChild}
              variant="default"
              className="flex-1"
              size="lg"
              disabled={rolesLoading}
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة حساب فرعي
            </Button>
            <Button
              onClick={handleEdit}
              variant="outline"
              size="lg"
              className="flex-1"
              disabled={rolesLoading}
            >
              <Edit2 className="w-4 h-4 ml-2" />
              تعديل
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              size="lg"
              className="flex-1"
              disabled={rolesLoading}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف
            </Button>
          </div>
        ) : (
          <div className="text-center p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              لا تملك صلاحيات كافية لإدارة الحسابات. يمكنك فقط عرض المعلومات.
            </p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {account && (
        <>
          <AddAccountDialog
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            parentAccount={account}
            onSuccess={() => onRefresh()}
            onAdd={handleAddSuccess}
          />

          <EditAccountDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            account={account}
            onSuccess={() => onRefresh()}
            onUpdate={handleEditSuccess}
          />

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد حذف الحساب</AlertDialogTitle>
                <AlertDialogDescription>
                  هل أنت متأكد من رغبتك في حذف هذا الحساب؟ سيتم إلغاء تفعيله ولن يظهر
                  في الحركات الجديدة.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "جاري الحذف..." : "تأكيد الحذف"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};

// Helper function to get Arabic account type label
function getAccountTypeLabel(accountType: string): string {
  const labels: Record<string, string> = {
    asset: "أصول",
    liability: "خصوم",
    equity: "حقوق الملكية",
    revenue: "إيرادات",
    expense: "مصروفات",
    cogs: "تكلفة البضاعة المباعة",
  };
  return labels[accountType] || accountType;
}
