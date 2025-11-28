import { useState } from "react";
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
import type { GlAccountTreeNode, GlAccountInsert, AccountType } from "@/types/accounting";

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentAccount: GlAccountTreeNode;
  onSuccess: () => void;
  onAdd: (data: GlAccountInsert) => Promise<void>;
}

export const AddAccountDialog = ({
  open,
  onOpenChange,
  parentAccount,
  onSuccess,
  onAdd,
}: AddAccountDialogProps) => {
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNameEn, setAccountNameEn] = useState("");
  const [accountType, setAccountType] = useState<AccountType>(parentAccount.accountType);
  const [currency, setCurrency] = useState("YER");
  const [description, setDescription] = useState("");
  const [isHeader, setIsHeader] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountCode.trim() || !accountName.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd({
        accountCode: accountCode.trim(),
        accountName: accountName.trim(),
        accountNameEn: accountNameEn.trim() || undefined,
        accountType,
        parentAccountId: parentAccount.id,
        currency,
        description: description.trim() || undefined,
        isHeader,
      });
      onSuccess();
      onOpenChange(false);
      // Reset form
      setAccountCode("");
      setAccountName("");
      setAccountNameEn("");
      setAccountType(parentAccount.accountType);
      setCurrency("YER");
      setDescription("");
      setIsHeader(false);
    } catch (error) {
      console.error("Error adding account:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة حساب فرعي</DialogTitle>
          <DialogDescription>
            إضافة حساب جديد تحت الحساب: {parentAccount.accountCode} - {parentAccount.accountName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parent-account">الحساب الرئيسي</Label>
            <Input
              id="parent-account"
              value={`${parentAccount.accountCode} - ${parentAccount.accountName}`}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-code">
              رقم الحساب <span className="text-destructive">*</span>
            </Label>
            <Input
              id="account-code"
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
              placeholder="مثال: 110101"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-name">
              اسم الحساب (عربي) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="account-name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="مثال: النقدية بالصندوق"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-name-en">اسم الحساب (إنجليزي)</Label>
            <Input
              id="account-name-en"
              value={accountNameEn}
              onChange={(e) => setAccountNameEn(e.target.value)}
              placeholder="Example: Cash on Hand"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account-type">نوع الحساب</Label>
              <Select value={accountType} onValueChange={(value) => setAccountType(value as AccountType)}>
                <SelectTrigger id="account-type">
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
              <Label htmlFor="currency">العملة</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف اختياري للحساب"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="is-header"
              checked={isHeader}
              onCheckedChange={(checked) => setIsHeader(checked === true)}
            />
            <Label htmlFor="is-header" className="cursor-pointer">
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
              حفظ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
