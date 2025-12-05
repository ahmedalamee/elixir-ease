import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import {
  fetchCurrencies,
  fetchExchangeRates,
  fetchLatestExchangeRates,
  createExchangeRate,
  deleteExchangeRate,
  type Currency,
  type ExchangeRate,
  type ExchangeRateInsert,
} from "@/lib/currency";

export default function ExchangeRates() {
  const navigate = useNavigate();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [latestRates, setLatestRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRate, setNewRate] = useState<Partial<ExchangeRateInsert>>({
    from_currency: "",
    to_currency: "YER",
    rate: 0,
    effective_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Filters
  const [filterCurrency, setFilterCurrency] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  useEffect(() => {
    checkAuth();
    loadData();
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [currenciesData, ratesData, latestData] = await Promise.all([
        fetchCurrencies(),
        fetchExchangeRates({
          fromCurrency: filterCurrency || undefined,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
        }),
        fetchLatestExchangeRates(),
      ]);

      setCurrencies(currenciesData);
      setExchangeRates(ratesData);
      setLatestRates(latestData);
    } catch (error: any) {
      toast.error("فشل تحميل البيانات");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newRate.from_currency || !newRate.to_currency || !newRate.rate || !newRate.effective_date) {
      toast.error("الرجاء إدخال جميع الحقول المطلوبة");
      return;
    }

    if (newRate.from_currency === newRate.to_currency) {
      toast.error("لا يمكن إنشاء سعر صرف لنفس العملة");
      return;
    }

    if (newRate.rate <= 0) {
      toast.error("سعر الصرف يجب أن يكون أكبر من صفر");
      return;
    }

    try {
      await createExchangeRate(newRate as ExchangeRateInsert);
      toast.success("تم إضافة سعر الصرف بنجاح");
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message || "فشل إضافة سعر الصرف");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف سعر الصرف هذا؟")) return;

    try {
      await deleteExchangeRate(id);
      toast.success("تم حذف سعر الصرف بنجاح");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "فشل حذف سعر الصرف");
    }
  };

  const resetForm = () => {
    setNewRate({
      from_currency: "",
      to_currency: "YER",
      rate: 0,
      effective_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  const baseCurrency = currencies.find(c => c.is_base);
  const foreignCurrencies = currencies.filter(c => !c.is_base && c.is_active);

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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">أسعار الصرف</h1>
            <p className="text-muted-foreground mt-1">
              إدارة أسعار صرف العملات مقابل العملة الأساسية ({baseCurrency?.name || "YER"})
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة سعر صرف
            </Button>
          )}
        </div>

        {/* Latest Rates Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {latestRates.map((rate) => (
            <Card key={rate.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{rate.from_currency} / {rate.to_currency}</span>
                  <Badge variant="outline">{rate.effective_date}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-primary">
                    {rate.rate.toLocaleString("ar-YE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </span>
                  <TrendingUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  1 {rate.from_currency} = {rate.rate.toFixed(2)} {rate.to_currency}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">البحث والتصفية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>العملة</Label>
                <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع العملات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع العملات</SelectItem>
                    {foreignCurrencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadData} variant="outline" className="w-full">
                  <RefreshCw className="ml-2 h-4 w-4" />
                  بحث
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exchange Rates Table */}
        <Card>
          <CardHeader>
            <CardTitle>سجل أسعار الصرف</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>من عملة</TableHead>
                  <TableHead>إلى عملة</TableHead>
                  <TableHead>سعر الصرف</TableHead>
                  <TableHead>تاريخ السريان</TableHead>
                  <TableHead>ملاحظات</TableHead>
                  {isAdmin && <TableHead>الإجراءات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchangeRates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      لا توجد أسعار صرف مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  exchangeRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.from_currency}</TableCell>
                      <TableCell>{rate.to_currency}</TableCell>
                      <TableCell className="font-mono">
                        {rate.rate.toLocaleString("ar-YE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </TableCell>
                      <TableCell>{rate.effective_date}</TableCell>
                      <TableCell className="text-muted-foreground">{rate.notes || "-"}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(rate.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Rate Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة سعر صرف جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>من عملة</Label>
                <Select
                  value={newRate.from_currency}
                  onValueChange={(v) => setNewRate({ ...newRate, from_currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العملة" />
                  </SelectTrigger>
                  <SelectContent>
                    {foreignCurrencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>إلى عملة (العملة الأساسية)</Label>
                <Input value={baseCurrency?.name || "YER"} disabled />
              </div>

              <div>
                <Label>سعر الصرف</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={newRate.rate || ""}
                  onChange={(e) => setNewRate({ ...newRate, rate: parseFloat(e.target.value) })}
                  placeholder="مثال: 66.50"
                />
                {newRate.from_currency && newRate.rate > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    1 {newRate.from_currency} = {newRate.rate} {baseCurrency?.code || "YER"}
                  </p>
                )}
              </div>

              <div>
                <Label>تاريخ السريان</Label>
                <Input
                  type="date"
                  value={newRate.effective_date}
                  onChange={(e) => setNewRate({ ...newRate, effective_date: e.target.value })}
                />
              </div>

              <div>
                <Label>ملاحظات (اختياري)</Label>
                <Input
                  value={newRate.notes || ""}
                  onChange={(e) => setNewRate({ ...newRate, notes: e.target.value })}
                  placeholder="أي ملاحظات إضافية..."
                />
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
