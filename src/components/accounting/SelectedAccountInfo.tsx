import { Plus, Edit2, Trash2 } from "lucide-react";
import type { GlAccountTreeNode } from "@/types/accounting";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SelectedAccountInfoProps {
  account: GlAccountTreeNode | null;
  onAddChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const SelectedAccountInfo = ({
  account,
  onAddChild,
  onEdit,
  onDelete,
}: SelectedAccountInfoProps) => {
  const { toast } = useToast();

  // Handle mock actions with toast notifications
  const handleAddChild = () => {
    // TODO (Phase 3): Wire this button to createGlAccount()
    toast({
      title: "إضافة حساب فرعي",
      description: "سيتم إضافة الوظيفة لاحقاً",
    });
    onAddChild();
  };

  const handleEdit = () => {
    // TODO (Phase 3): Wire this button to updateGlAccount()
    toast({
      title: "تعديل الحساب",
      description: "سيتم إضافة الوظيفة لاحقاً",
    });
    onEdit();
  };

  const handleDelete = () => {
    // TODO (Phase 3): Wire this button to deactivateGlAccount()
    toast({
      title: "حذف الحساب",
      description: "سيتم إضافة الوظيفة لاحقاً",
      variant: "destructive",
    });
    onDelete();
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
        <div className="flex gap-3">
          <Button
            onClick={handleAddChild}
            variant="default"
            className="flex-1"
            size="lg"
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة حساب فرعي
          </Button>
          <Button
            onClick={handleEdit}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            <Edit2 className="w-4 h-4 ml-2" />
            تعديل
          </Button>
          <Button
            onClick={handleDelete}
            variant="destructive"
            size="lg"
            className="flex-1"
          >
            <Trash2 className="w-4 h-4 ml-2" />
            حذف
          </Button>
        </div>
      </div>
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
