import { useState, useEffect } from "react";
import { AccountNode } from "@/data/chart-of-accounts";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface AccountDetailsFormProps {
  account: AccountNode | null;
}

export const AccountDetailsForm = ({ account }: AccountDetailsFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<AccountNode | null>(null);

  useEffect(() => {
    if (account) {
      setFormData({ ...account });
    }
  }, [account]);

  const handleSave = () => {
    if (formData) {
      // TODO: Save to backend
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ بيانات الحساب بنجاح",
      });
    }
  };

  const handleCancel = () => {
    if (account) {
      setFormData({ ...account });
    }
  };

  if (!formData) {
    return (
      <div className="flex items-center justify-center h-[600px] border rounded-lg bg-card" dir="rtl">
        <p className="text-muted-foreground">اختر حساباً من الشجرة لعرض تفاصيله</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card p-6 h-[600px] overflow-y-auto" dir="rtl">
      <h3 className="text-lg font-semibold mb-6">تفاصيل الحساب</h3>

      <div className="space-y-4">
        {/* Account Code */}
        <div>
          <Label htmlFor="code">رقم الحساب</Label>
          <Input
            id="code"
            value={formData.code}
            readOnly
            className="bg-muted"
          />
        </div>

        {/* Account Name */}
        <div>
          <Label htmlFor="name">اسم الحساب</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />
        </div>

        {/* Parent Account */}
        <div>
          <Label htmlFor="parent">الحساب الأعلى</Label>
          <Input
            id="parent"
            value={formData.parentCode || "—"}
            readOnly
            className="bg-muted"
          />
        </div>

        {/* Account Level */}
        <div>
          <Label htmlFor="level">رتبة الحساب</Label>
          <Input
            id="level"
            value={formData.level}
            readOnly
            className="bg-muted"
          />
        </div>

        {/* Account Type */}
        <div>
          <Label htmlFor="type">نوع الحساب</Label>
          <Select
            value={formData.type}
            onValueChange={(value: 'debit' | 'credit') =>
              setFormData({ ...formData, type: value })
            }
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="debit">مدين</SelectItem>
              <SelectItem value="credit">دائن</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Account Category */}
        <div>
          <Label htmlFor="category">فئة الحساب</Label>
          <Select
            value={formData.category}
            onValueChange={(value: AccountNode['category']) =>
              setFormData({ ...formData, category: value })
            }
          >
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assets">أصول</SelectItem>
              <SelectItem value="liabilities">خصوم</SelectItem>
              <SelectItem value="equity">حقوق الملكية</SelectItem>
              <SelectItem value="revenue">إيرادات</SelectItem>
              <SelectItem value="expenses">مصروفات</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Currency */}
        <div>
          <Label htmlFor="currency">عملة الحساب</Label>
          <Select
            value={formData.currency}
            onValueChange={(value) =>
              setFormData({ ...formData, currency: value })
            }
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="YER">ريال يمني</SelectItem>
              <SelectItem value="SAR">ريال سعودي</SelectItem>
              <SelectItem value="USD">دولار أمريكي</SelectItem>
              <SelectItem value="EUR">يورو</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Status */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <Checkbox
            id="active"
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, isActive: checked as boolean })
            }
          />
          <Label htmlFor="active" className="cursor-pointer">
            حساب نشط
          </Label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave} className="flex-1">
            حفظ
          </Button>
          <Button onClick={handleCancel} variant="outline" className="flex-1">
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
};
