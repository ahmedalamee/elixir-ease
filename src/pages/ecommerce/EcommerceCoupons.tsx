import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Ticket, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const EcommerceCoupons = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    discount_type: "percentage",
    discount_value: 0,
    min_order_amount: 0,
    usage_limit: 0,
    end_date: "",
    is_active: true,
  });
  const queryClient = useQueryClient();

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["ecommerce-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecommerce_coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        end_date: data.end_date || null,
        usage_limit: data.usage_limit || null,
        min_order_amount: data.min_order_amount || null,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from("ecommerce_coupons")
          .update(payload)
          .eq("id", editingCoupon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ecommerce_coupons")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-coupons"] });
      toast.success(editingCoupon ? "تم تحديث الكوبون" : "تم إضافة الكوبون");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("حدث خطأ");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ecommerce_coupons")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-coupons"] });
      toast.success("تم حذف الكوبون");
    },
    onError: () => {
      toast.error("حدث خطأ في الحذف");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("ecommerce_coupons")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-coupons"] });
      toast.success("تم تحديث الحالة");
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingCoupon(null);
    setFormData({
      code: "",
      name: "",
      discount_type: "percentage",
      discount_value: 0,
      min_order_amount: 0,
      usage_limit: 0,
      end_date: "",
      is_active: true,
    });
  };

  const handleEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount || 0,
      usage_limit: coupon.usage_limit || 0,
      end_date: coupon.end_date ? coupon.end_date.split("T")[0] : "",
      is_active: coupon.is_active ?? true,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.code || !formData.name || formData.discount_value <= 0) {
      toast.error("يرجى إدخال اسم الكوبون والكود وقيمة الخصم");
      return;
    }
    saveMutation.mutate(formData);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success("تم نسخ الكود");
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <main className="flex-1 p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">كوبونات الخصم</h1>
              <p className="text-muted-foreground">إدارة كوبونات وعروض المتجر</p>
            </div>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة كوبون
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                قائمة الكوبونات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الكود</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>نوع الخصم</TableHead>
                      <TableHead>القيمة</TableHead>
                      <TableHead>الاستخدام</TableHead>
                      <TableHead>تاريخ الانتهاء</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons?.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded font-mono">
                              {coupon.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyCode(coupon.code)}
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{coupon.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {coupon.discount_type === "percentage" ? "نسبة مئوية" : "مبلغ ثابت"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}%`
                            : formatCurrency(coupon.discount_value)}
                        </TableCell>
                        <TableCell>
                          {coupon.used_count || 0}
                          {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""}
                        </TableCell>
                        <TableCell>
                          {coupon.end_date ? (
                            <span className={isExpired(coupon.end_date) ? "text-destructive" : ""}>
                              {format(new Date(coupon.end_date), "dd/MM/yyyy")}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={(coupon.is_active ?? true) && !isExpired(coupon.end_date)}
                            disabled={isExpired(coupon.end_date)}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: coupon.id, is_active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(coupon)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("هل أنت متأكد من حذف هذا الكوبون؟")) {
                                  deleteMutation.mutate(coupon.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!coupons || coupons.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          لا توجد كوبونات
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Add/Edit Dialog */}
          <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCoupon ? "تعديل الكوبون" : "إضافة كوبون جديد"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم الكوبون *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="خصم العيد"
                  />
                </div>
                <div className="space-y-2">
                  <Label>كود الكوبون *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      placeholder="DISCOUNT20"
                      className="font-mono"
                      dir="ltr"
                    />
                    <Button type="button" variant="outline" onClick={generateCode}>
                      توليد
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع الخصم</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, discount_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">نسبة مئوية</SelectItem>
                        <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>قيمة الخصم *</Label>
                    <Input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_value: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder={formData.discount_type === "percentage" ? "10" : "5000"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الحد الأدنى للطلب</Label>
                    <Input
                      type="number"
                      value={formData.min_order_amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          min_order_amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الحد الأقصى للاستخدام</Label>
                    <Input
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          usage_limit: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="0 = غير محدود"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>تاريخ الانتهاء</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نشط</Label>
                    <div className="pt-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, is_active: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  إلغاء
                </Button>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default EcommerceCoupons;
