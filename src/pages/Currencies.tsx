import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";

interface Currency {
  code: string;
  name: string;
  name_en: string | null;
  symbol: string | null;
  precision: number;
  is_active: boolean;
  created_at: string;
}

export default function Currencies() {
  const navigate = useNavigate();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Partial<Currency> | null>(null);

  useEffect(() => {
    checkAuth();
    fetchCurrencies();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!roleData);
  };

  const fetchCurrencies = async () => {
    try {
      const { data, error } = await supabase
        .from("currencies")
        .select("*")
        .order("code");

      if (error) throw error;
      setCurrencies(data || []);
    } catch (error: any) {
      toast.error("فشل تحميل العملات");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingCurrency?.code || !editingCurrency?.name) {
      toast.error("الرجاء إدخال الرمز والاسم");
      return;
    }

    try {
      const dataToSubmit = {
        code: editingCurrency.code,
        name: editingCurrency.name,
        name_en: editingCurrency.name_en || null,
        symbol: editingCurrency.symbol || null,
        precision: editingCurrency.precision ?? 2,
        is_active: editingCurrency.is_active ?? true,
      };

      if (editingCurrency.created_at) {
        // Update existing
        const { error } = await supabase
          .from("currencies")
          .update(dataToSubmit)
          .eq("code", editingCurrency.code);

        if (error) throw error;
        toast.success("تم تحديث العملة بنجاح");
      } else {
        // Insert new
        const { error } = await supabase
          .from("currencies")
          .insert([dataToSubmit]);

        if (error) throw error;
        toast.success("تم إضافة العملة بنجاح");
      }

      setDialogOpen(false);
      setEditingCurrency(null);
      fetchCurrencies();
    } catch (error: any) {
      toast.error(error.message || "فشل حفظ العملة");
      console.error(error);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه العملة؟")) return;

    try {
      const { error } = await supabase
        .from("currencies")
        .delete()
        .eq("code", code);

      if (error) throw error;
      toast.success("تم حذف العملة بنجاح");
      fetchCurrencies();
    } catch (error: any) {
      toast.error(error.message || "فشل حذف العملة");
      console.error(error);
    }
  };

  const openDialog = (currency?: Currency) => {
    if (currency) {
      setEditingCurrency({ ...currency });
    } else {
      setEditingCurrency({
        code: "",
        name: "",
        name_en: "",
        symbol: "",
        precision: 2,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6">
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">إدارة العملات</h1>
          {isAdmin && (
            <Button onClick={() => openDialog()}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة عملة
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الرمز</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>الاسم بالإنجليزية</TableHead>
              <TableHead>الرمز</TableHead>
              <TableHead>الدقة</TableHead>
              <TableHead>نشط</TableHead>
              {isAdmin && <TableHead>الإجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currencies.map((currency) => (
              <TableRow key={currency.code}>
                <TableCell className="font-medium">{currency.code}</TableCell>
                <TableCell>{currency.name}</TableCell>
                <TableCell>{currency.name_en || "-"}</TableCell>
                <TableCell>{currency.symbol || "-"}</TableCell>
                <TableCell>{currency.precision}</TableCell>
                <TableCell>{currency.is_active ? "نعم" : "لا"}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(currency)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(currency.code)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCurrency?.created_at ? "تعديل عملة" : "إضافة عملة جديدة"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>رمز العملة (مثل: SAR)</Label>
                <Input
                  value={editingCurrency?.code || ""}
                  onChange={(e) =>
                    setEditingCurrency({ ...editingCurrency, code: e.target.value })
                  }
                  disabled={!!editingCurrency?.created_at}
                  maxLength={3}
                />
              </div>
              <div>
                <Label>الاسم</Label>
                <Input
                  value={editingCurrency?.name || ""}
                  onChange={(e) =>
                    setEditingCurrency({ ...editingCurrency, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>الاسم بالإنجليزية</Label>
                <Input
                  value={editingCurrency?.name_en || ""}
                  onChange={(e) =>
                    setEditingCurrency({ ...editingCurrency, name_en: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>رمز العملة (مثل: ريال)</Label>
                <Input
                  value={editingCurrency?.symbol || ""}
                  onChange={(e) =>
                    setEditingCurrency({ ...editingCurrency, symbol: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>الدقة (عدد الخانات العشرية)</Label>
                <Input
                  type="number"
                  value={editingCurrency?.precision ?? 2}
                  onChange={(e) =>
                    setEditingCurrency({
                      ...editingCurrency,
                      precision: parseInt(e.target.value),
                    })
                  }
                  min={0}
                  max={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingCurrency?.is_active ?? true}
                  onCheckedChange={(checked) =>
                    setEditingCurrency({ ...editingCurrency, is_active: checked })
                  }
                />
                <Label>نشط</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSave}>حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
