import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { GlAccountTreeNode, AccountType } from "@/types/accounting";

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: GlAccountTreeNode;
  onSuccess: () => void;
  onUpdate: (
    id: string,
    updates: {
      accountCode?: string;
      accountName?: string;
      accountNameEn?: string;
      accountType?: string;
      currency?: string;
      description?: string;
      isHeader?: boolean;
    }
  ) => Promise<void>;
}

export const EditAccountDialog = ({
  open,
  onOpenChange,
  account,
  onSuccess,
  onUpdate,
}: EditAccountDialogProps) => {
  const [accountCode, setAccountCode] = useState(account.accountCode);
  const [accountName, setAccountName] = useState(account.accountName);
  const [accountNameEn, setAccountNameEn] = useState(account.accountNameEn || "");
  const [accountType, setAccountType] = useState<AccountType>(account.accountType);
  const [currency, setCurrency] = useState(account.currency);
  const [description, setDescription] = useState(account.description || "");
  const [isHeader, setIsHeader] = useState(account.isHeader);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when account changes
  useEffect(() => {
    setAccountCode(account.accountCode);
    setAccountName(account.accountName);
    setAccountNameEn(account.accountNameEn || "");
    setAccountType(account.accountType);
    setCurrency(account.currency);
    setDescription(account.description || "");
    setIsHeader(account.isHeader);
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountCode.trim() || !accountName.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Only send changed fields
      const updates: any = {};
      if (accountCode !== account.accountCode) updates.accountCode = accountCode.trim();
      if (accountName !== account.accountName) updates.accountName = accountName.trim();
      if (accountNameEn !== (account.accountNameEn || "")) {
        updates.accountNameEn = accountNameEn.trim() || undefined;
      }
      if (accountType !== account.accountType) updates.accountType = accountType;
      if (currency !== account.currency) updates.currency = currency;
      if (description !== (account.description || "")) {
        updates.description = description.trim() || undefined;
      }
      if (isHeader !== account.isHeader) updates.isHeader = isHeader;

      await onUpdate(account.id, updates);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating account:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل الحساب</DialogTitle>
          <DialogDescription>
            تعديل بيانات الحساب: {account.accountCode} - {account.accountName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {account.parentAccountId && (
            <div className="space-y-2">
              <Label>الحساب الرئيسي</Label>
              <Input
                value={account.parentAccountId}
                disabled
                className="bg-muted text-sm font-mono"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-account-code">
              رقم الحساب <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-account-code"
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-account-name">
              اسم الحساب (عربي) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-account-name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-account-name-en">اسم الحساب (إنجليزي)</Label>
            <Input
              id="edit-account-name-en"
              value={accountNameEn}
              onChange={(e) => setAccountNameEn(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-account-type">نوع الحساب</Label>
              <Select value={accountType} onValueChange={(value) => setAccountType(value as AccountType)}>
                <SelectTrigger id="edit-account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">أصول</SelectItem>
                  <SelectItem value="liability">خصوم</SelectItem>
                  <SelectItem value="equity">حقوق الملكية</SelectItem>
                  <SelectItem value="revenue">إيرادات</SelectItem>
                  <SelectItem value="expense">مصروفات</SelectItem>
                  <SelectItem value="cogs">تكلفة البضاعة المباعة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-currency">العملة</Label>
              <Input
                id="edit-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">الوصف</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="edit-is-header"
              checked={isHeader}
              onCheckedChange={(checked) => setIsHeader(checked === true)}
            />
            <Label htmlFor="edit-is-header" className="cursor-pointer">
              حساب رئيسي (Header) - يمكن أن يحتوي على حسابات فرعية
            </Label>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
