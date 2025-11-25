import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  name_en?: string;
  code: string;
  method_type: string;
  account_id?: string;
  is_active: boolean;
  requires_reference: boolean;
  max_transaction_amount?: number;
  description?: string;
}

interface GLAccount {
  id: string;
  account_code: string;
  account_name: string;
}

const PaymentMethods = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    code: "",
    method_type: "cash",
    account_id: "",
    is_active: true,
    requires_reference: false,
    max_transaction_amount: 0,
    description: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchMethods();
    fetchAccounts();
  }, []);

  const fetchMethods = async () => {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "خطأ", description: "فشل تحميل طرق الدفع", variant: "destructive" });
    } else {
      setMethods(data || []);
    }
  };

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("gl_accounts")
      .select("id, account_code, account_name")
      .eq("is_active", true)
      .order("account_code");

    if (error) {
      toast({ title: "خطأ", description: "فشل تحميل الحسابات", variant: "destructive" });
    } else {
      setAccounts(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      account_id: formData.account_id || null,
      max_transaction_amount: formData.max_transaction_amount || null,
    };

    if (editingMethod) {
      const { error } = await supabase
        .from("payment_methods")
        .update(submitData)
        .eq("id", editingMethod.id);

      if (error) {
        toast({ title: "خطأ", description: "فشل تحديث طريقة الدفع", variant: "destructive" });
      } else {
        toast({ title: "نجاح", description: "تم تحديث طريقة الدفع بنجاح" });
        fetchMethods();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("payment_methods")
        .insert([submitData]);

      if (error) {
        toast({ title: "خطأ", description: "فشل إضافة طريقة الدفع", variant: "destructive" });
      } else {
        toast({ title: "نجاح", description: "تم إضافة طريقة الدفع بنجاح" });
        fetchMethods();
        resetForm();
      }
    }
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      name_en: method.name_en || "",
      code: method.code,
      method_type: method.method_type,
      account_id: method.account_id || "",
      is_active: method.is_active,
      requires_reference: method.requires_reference,
      max_transaction_amount: method.max_transaction_amount || 0,
      description: method.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف طريقة الدفع هذه؟")) return;

    const { error } = await supabase
      .from("payment_methods")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "خطأ", description: "فشل حذف طريقة الدفع", variant: "destructive" });
    } else {
      toast({ title: "نجاح", description: "تم حذف طريقة الدفع بنجاح" });
      fetchMethods();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_en: "",
      code: "",
      method_type: "cash",
      account_id: "",
      is_active: true,
      requires_reference: false,
      max_transaction_amount: 0,
      description: "",
    });
    setEditingMethod(null);
    setIsDialogOpen(false);
  };

  const methodTypeLabels: Record<string, string> = {
    cash: "نقدي",
    credit_card: "بطاقة ائتمانية",
    debit_card: "بطاقة مدينة",
    bank_transfer: "تحويل بنكي",
    mobile_payment: "دفع عبر الجوال",
    insurance: "تأمين",
    check: "شيك",
    other: "أخرى",
  };

  const filteredMethods = methods.filter(
    (method) =>
      method.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      method.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>إعدادات طرق الدفع</CardTitle>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة طريقة دفع
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="البحث بالاسم أو الكود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>يتطلب مرجع</TableHead>
                  <TableHead>الحد الأقصى</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMethods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell>{method.code}</TableCell>
                    <TableCell>{method.name}</TableCell>
                    <TableCell>{methodTypeLabels[method.method_type]}</TableCell>
                    <TableCell>{method.requires_reference ? "نعم" : "لا"}</TableCell>
                    <TableCell>{method.max_transaction_amount || "-"}</TableCell>
                    <TableCell>
                      {method.is_active ? (
                        <span className="text-green-600">نشط</span>
                      ) : (
                        <span className="text-red-600">غير نشط</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(method)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(method.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMethod ? "تعديل طريقة الدفع" : "إضافة طريقة دفع جديدة"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">الكود *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_en">الاسم بالإنجليزية</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method_type">نوع الطريقة *</Label>
                  <Select
                    value={formData.method_type}
                    onValueChange={(value) => setFormData({ ...formData, method_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(methodTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_id">الحساب المحاسبي</Label>
                  <Select
                    value={formData.account_id}
                    onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر حساباً" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_code} - {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_transaction_amount">الحد الأقصى للمعاملة</Label>
                  <Input
                    id="max_transaction_amount"
                    type="number"
                    value={formData.max_transaction_amount}
                    onChange={(e) => setFormData({ ...formData, max_transaction_amount: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2 space-x-reverse gap-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="requires_reference"
                    checked={formData.requires_reference}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_reference: checked })}
                  />
                  <Label htmlFor="requires_reference">يتطلب مرجع</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">نشط</Label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
                <Button type="submit">
                  {editingMethod ? "تحديث" : "إضافة"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default PaymentMethods;
