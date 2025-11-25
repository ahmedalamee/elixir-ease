import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus } from "lucide-react";

const StockAlerts = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [reorderRules, setReorderRules] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [newRule, setNewRule] = useState({
    item_id: "",
    warehouse_id: "",
    supplier_id: "",
    min_qty: 0,
    reorder_point: 0,
    reorder_qty: 0,
  });

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const fetchData = async () => {
    await Promise.all([
      fetchStockAlerts(),
      fetchReorderRules(),
      fetchProducts(),
      fetchWarehouses(),
      fetchSuppliers(),
    ]);
  };

  const fetchStockAlerts = async () => {
    const response = await supabase
      .from("reorder_rules")
      .select("*, item:item_id(id, name, sku, quantity), warehouse:warehouse_id(name)")
      .eq("is_active", true);
    
    const alerts = (response.data || [])
      .filter((r: any) => r.item && (r.item.quantity <= r.reorder_point || r.item.quantity <= r.min_qty))
      .map((r: any) => ({
        product_id: r.item.id,
        product_name: r.item.name,
        sku: r.item.sku,
        warehouse_id: r.warehouse_id,
        warehouse_name: r.warehouse?.name,
        min_qty: r.min_qty,
        reorder_point: r.reorder_point,
        reorder_qty: r.reorder_qty,
        current_quantity: r.item.quantity,
        alert_level: r.item.quantity <= r.min_qty ? 'critical' : 'low'
      }));
    setAlerts(alerts);
  };

  const fetchReorderRules = async () => {
    const response = await supabase
      .from("reorder_rules")
      .select("*, item:item_id(name, sku), warehouse:warehouse_id(name), supplier:supplier_id(name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setReorderRules(response.data || []);
  };

  const fetchProducts = async () => {
    const response = await supabase.from("products").select("id, name, sku").eq("is_active", true).order("name");
    setProducts(response.data || []);
  };

  const fetchWarehouses = async () => {
    const response = await supabase.from("warehouses").select("id, name").order("name");
    setWarehouses(response.data || []);
  };

  const fetchSuppliers = async () => {
    // Temporary workaround for TypeScript issue with suppliers table
    // TODO: Fix this when Supabase types are updated
    setSuppliers([]);
  };

  const handleCreateRule = async () => {
    if (!newRule.item_id || !newRule.warehouse_id) {
      toast({ title: "خطأ", description: "اختر المنتج والمستودع", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("reorder_rules").insert([newRule]);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الإنشاء بنجاح" });
      setIsDialogOpen(false);
      setNewRule({ item_id: "", warehouse_id: "", supplier_id: "", min_qty: 0, reorder_point: 0, reorder_qty: 0 });
      fetchData();
    }
    setLoading(false);
  };

  const getAlertBadge = (level: string) => {
    switch (level) {
      case "critical": return <Badge variant="destructive">حرج</Badge>;
      case "low": return <Badge variant="secondary">منخفض</Badge>;
      default: return <Badge variant="default">عادي</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              تنبيهات المخزون
            </CardTitle>
            <CardDescription>المنتجات التي وصلت أو قاربت حد إعادة الطلب</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>رمز المنتج</TableHead>
                  <TableHead>المستودع</TableHead>
                  <TableHead>الكمية الحالية</TableHead>
                  <TableHead>حد الطلب</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">لا توجد تنبيهات</TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert) => (
                    <TableRow key={`${alert.product_id}-${alert.warehouse_id}`}>
                      <TableCell>{alert.product_name}</TableCell>
                      <TableCell>{alert.sku}</TableCell>
                      <TableCell>{alert.warehouse_name}</TableCell>
                      <TableCell>{alert.current_quantity}</TableCell>
                      <TableCell>{alert.reorder_point}</TableCell>
                      <TableCell>{getAlertBadge(alert.alert_level)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>قواعد إعادة الطلب</span>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 ml-2" />إضافة قاعدة</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>قاعدة إعادة طلب جديدة</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>المنتج</Label>
                      <Select value={newRule.item_id} onValueChange={(v) => setNewRule({ ...newRule, item_id: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر المنتج" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>المستودع</Label>
                      <Select value={newRule.warehouse_id} onValueChange={(v) => setNewRule({ ...newRule, warehouse_id: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                        <SelectContent>
                          {warehouses.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>المورد المفضل</Label>
                      <Select value={newRule.supplier_id} onValueChange={(v) => setNewRule({ ...newRule, supplier_id: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div><Label>الحد الأدنى</Label><Input type="number" value={newRule.min_qty} onChange={(e) => setNewRule({ ...newRule, min_qty: parseFloat(e.target.value) })} /></div>
                      <div><Label>نقطة الطلب</Label><Input type="number" value={newRule.reorder_point} onChange={(e) => setNewRule({ ...newRule, reorder_point: parseFloat(e.target.value) })} /></div>
                      <div><Label>كمية الطلب</Label><Input type="number" value={newRule.reorder_qty} onChange={(e) => setNewRule({ ...newRule, reorder_qty: parseFloat(e.target.value) })} /></div>
                    </div>
                    <Button onClick={handleCreateRule} disabled={loading}>حفظ</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>المستودع</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>الحد الأدنى</TableHead>
                  <TableHead>نقطة الطلب</TableHead>
                  <TableHead>كمية الطلب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reorderRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.item?.name}</TableCell>
                    <TableCell>{rule.warehouse?.name}</TableCell>
                    <TableCell>{rule.supplier?.name || "-"}</TableCell>
                    <TableCell>{rule.min_qty}</TableCell>
                    <TableCell>{rule.reorder_point}</TableCell>
                    <TableCell>{rule.reorder_qty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StockAlerts;
