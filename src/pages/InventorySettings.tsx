import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Store, Receipt, Save, X, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ArrowRight } from "lucide-react";

type ViewType = 'main' | 'general' | 'templates' | 'employee-warehouses';

const InventorySettings = () => {
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [settings, setSettings] = useState<any>({
    default_warehouse: { warehouse_id: null },
    default_price_list: { price_list_id: null },
    inventory_valuation_method: "FIFO",
    allow_negative_stock: false,
    enable_advanced_pricing: true,
    track_expiry_dates: true,
    track_barcodes: true,
    enable_multiple_uoms: true,
    show_stock_alerts: true,
    enable_stock_orders: false,
    enable_sales_stock_vouchers: false,
    enable_purchase_stock_vouchers: false,
    track_by_serial_batch_expiry: false,
    enable_multi_units: false,
    inventory_calculation_by_date: false,
    enable_assemblies_compound_units: false,
    show_total_available_quantity: false,
    inventory_account_id: null,
    sales_return_cost_method: "sales_price",
  });
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [glAccounts, setGLAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchAllData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
    
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", session?.user.id).single();
    setIsAdmin(data?.role === "admin");
  };

  const fetchAllData = async () => {
    await Promise.all([
      fetchSystemSettings(),
      fetchWarehouses(),
      fetchPriceLists(),
      fetchGLAccounts(),
    ]);
  };

  const fetchSystemSettings = async () => {
    const { data } = await supabase.from("system_settings").select("*");
    if (data) {
      const settingsObj: any = {};
      data.forEach((item) => { settingsObj[item.setting_key] = item.setting_value; });
      setSettings({
        default_warehouse: settingsObj.default_warehouse || { warehouse_id: null },
        default_price_list: settingsObj.default_price_list || { price_list_id: null },
        inventory_valuation_method: settingsObj.inventory_valuation_method || "FIFO",
        allow_negative_stock: settingsObj.allow_negative_stock || false,
        enable_advanced_pricing: settingsObj.enable_advanced_pricing !== false,
        track_expiry_dates: settingsObj.track_expiry_dates !== false,
        track_barcodes: settingsObj.track_barcodes !== false,
        enable_multiple_uoms: settingsObj.enable_multiple_uoms !== false,
        show_stock_alerts: settingsObj.show_stock_alerts !== false,
        enable_stock_orders: settingsObj.enable_stock_orders || false,
        enable_sales_stock_vouchers: settingsObj.enable_sales_stock_vouchers || false,
        enable_purchase_stock_vouchers: settingsObj.enable_purchase_stock_vouchers || false,
        track_by_serial_batch_expiry: settingsObj.track_by_serial_batch_expiry || false,
        enable_multi_units: settingsObj.enable_multi_units || false,
        inventory_calculation_by_date: settingsObj.inventory_calculation_by_date || false,
        enable_assemblies_compound_units: settingsObj.enable_assemblies_compound_units || false,
        show_total_available_quantity: settingsObj.show_total_available_quantity || false,
        inventory_account_id: settingsObj.inventory_account_id || null,
        sales_return_cost_method: settingsObj.sales_return_cost_method || "sales_price",
      });
    }
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from("warehouses").select("*").order("name");
    setWarehouses(data || []);
  };

  const fetchPriceLists = async () => {
    const { data } = await supabase.from("price_lists").select("*").eq("is_active", true).order("name");
    setPriceLists(data || []);
  };

  const fetchGLAccounts = async () => {
    const { data } = await supabase.from("gl_accounts").select("*").eq("is_header", false).order("account_code");
    setGLAccounts(data || []);
  };

  const saveSettings = async () => {
    if (!isAdmin) {
      toast({ title: "غير مصرح", description: "تحتاج إلى صلاحيات المدير", variant: "destructive" });
      return;
    }
    setLoading(true);
    
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value as unknown as Json
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(update, { onConflict: 'setting_key' });
        
        if (error) throw error;
      }

      toast({ title: "✅ تم الحفظ بنجاح" });
      await fetchSystemSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ 
        title: "❌ خطأ في الحفظ", 
        description: "حدث خطأ أثناء حفظ الإعدادات",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelChanges = () => {
    fetchSystemSettings();
    setCurrentView('main');
  };

  // Main View - 3 Big Cards
  if (currentView === 'main') {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center gap-2 mb-6">
            <h1 className="text-2xl font-bold">إعدادات المخزون</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Templates Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow bg-card"
              onClick={() => setCurrentView('templates')}
            >
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Receipt className="h-20 w-20 mb-4 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">قوالب للطباعة</h3>
              </CardContent>
            </Card>

            {/* Employee Warehouses Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow bg-card"
              onClick={() => setCurrentView('employee-warehouses')}
            >
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Store className="h-20 w-20 mb-4 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">المستودع الافتراضي للموظف</h3>
              </CardContent>
            </Card>

            {/* General Settings Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow bg-card"
              onClick={() => setCurrentView('general')}
            >
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Settings className="h-20 w-20 mb-4 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">عام</h3>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // General Settings View
  if (currentView === 'general') {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setCurrentView('main')}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">المخزون</h1>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">الإعدادات</span>
          </div>

          <div className="flex gap-2 mb-6">
            <Button 
              onClick={saveSettings} 
              disabled={loading || !isAdmin}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
            <Button 
              variant="outline"
              onClick={cancelChanges}
            >
              <X className="h-4 w-4 ml-2" />
              إلغاء
            </Button>
          </div>

          <Card>
            <CardContent className="py-6 space-y-4">
              {/* Checkboxes Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <Label className="text-base">إتاحة المخزون السالب</Label>
                  <div className="flex items-center gap-2">
                    {settings.allow_negative_stock && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    <Switch
                      checked={settings.allow_negative_stock}
                      onCheckedChange={(checked) => setSettings({...settings, allow_negative_stock: checked})}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <Label className="text-base">خيارات التسعير المتقدمة</Label>
                  <div className="flex items-center gap-2">
                    {settings.enable_advanced_pricing && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    <Switch
                      checked={settings.enable_advanced_pricing}
                      onCheckedChange={(checked) => setSettings({...settings, enable_advanced_pricing: checked})}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <Label className="text-base">تفعيل الطلبيات المخزنية</Label>
                  <div className="flex items-center gap-2">
                    {settings.enable_stock_orders && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    <Switch
                      checked={settings.enable_stock_orders}
                      onCheckedChange={(checked) => setSettings({...settings, enable_stock_orders: checked})}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <Label className="text-base">تفعيل الأذون المخزنية لفواتير المبيعات</Label>
                  <div className="flex items-center gap-2">
                    {settings.enable_sales_stock_vouchers && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    <Switch
                      checked={settings.enable_sales_stock_vouchers}
                      onCheckedChange={(checked) => setSettings({...settings, enable_sales_stock_vouchers: checked})}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <Label className="text-base">تفعيل الأذون المخزنية لفواتير الشراء</Label>
                  <div className="flex items-center gap-2">
                    {settings.enable_purchase_stock_vouchers && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    <Switch
                      checked={settings.enable_purchase_stock_vouchers}
                      onCheckedChange={(checked) => setSettings({...settings, enable_purchase_stock_vouchers: checked})}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <Label className="text-base">تتبع المنتجات بواسطة الرقم المسلسل، رقم الشحنة أو تاريخ الانتهاء</Label>
                  <div className="flex items-center gap-2">
                    {settings.track_by_serial_batch_expiry && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    <Switch
                      checked={settings.track_by_serial_batch_expiry}
                      onCheckedChange={(checked) => setSettings({...settings, track_by_serial_batch_expiry: checked})}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <Label className="text-base">إتاحة نظام الوحدات المتعددة</Label>
                  <div className="flex items-center gap-2">
                    {settings.enable_multi_units && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    <Switch
                      checked={settings.enable_multi_units}
                      onCheckedChange={(checked) => setSettings({...settings, enable_multi_units: checked})}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <Label className="text-base">حساب كمية الجرد حسب تاريخ الجرد</Label>
                  <div className="flex items-center gap-2">
                    {settings.inventory_calculation_by_date && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    <Switch
                      checked={settings.inventory_calculation_by_date}
                      onCheckedChange={(checked) => setSettings({...settings, inventory_calculation_by_date: checked})}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <Label className="text-base">إتاحة نظام التجميعات و الوحدات المركبة</Label>
                  <div className="flex items-center gap-2">
                    {settings.enable_assemblies_compound_units && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    <Switch
                      checked={settings.enable_assemblies_compound_units}
                      onCheckedChange={(checked) => setSettings({...settings, enable_assemblies_compound_units: checked})}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <Label className="text-base">إظهار الكمية الإجمالية و المتوفرة في المخزن للمنتجات</Label>
                  <div className="flex items-center gap-2">
                    {settings.show_total_available_quantity && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    <Switch
                      checked={settings.show_total_available_quantity}
                      onCheckedChange={(checked) => setSettings({...settings, show_total_available_quantity: checked})}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
              </div>

              {/* Dropdown Sections */}
              <div className="space-y-4 pt-4">
                <div className="py-3 border-b">
                  <Label className="text-base mb-2 block">الحساب الفرعي</Label>
                  <Select 
                    value={settings.inventory_account_id || "none"} 
                    onValueChange={(inventory_account_id) => {
                      setSettings({...settings, inventory_account_id: inventory_account_id === 'none' ? null : inventory_account_id});
                    }}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="bg-muted">
                      <SelectValue placeholder="من فضلك اختر" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">من فضلك اختر</SelectItem>
                      {glAccounts
                        .filter(acc => acc.account_type === 'asset')
                        .map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.account_code} - {acc.account_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="py-3 border-b">
                  <Label className="text-base mb-2 block">المستودع الافتراضي</Label>
                  <Select 
                    value={settings.default_warehouse?.warehouse_id || "none"} 
                    onValueChange={(warehouse_id) => {
                      setSettings({...settings, default_warehouse: { warehouse_id: warehouse_id === 'none' ? null : warehouse_id }});
                    }}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="bg-muted">
                      <SelectValue placeholder="من فضلك اختر" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">من فضلك اختر</SelectItem>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="py-3 border-b">
                  <Label className="text-base mb-2 block">قائمة الأسعار الافتراضية</Label>
                  <Select 
                    value={settings.default_price_list?.price_list_id || "none"} 
                    onValueChange={(price_list_id) => {
                      setSettings({...settings, default_price_list: { price_list_id: price_list_id === 'none' ? null : price_list_id }});
                    }}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="bg-muted">
                      <SelectValue placeholder="من فضلك اختر" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">من فضلك اختر</SelectItem>
                      {priceLists.map((pl) => (
                        <SelectItem key={pl.id} value={pl.id}>
                          {pl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="py-3 border-b">
                  <Label className="text-base mb-2 block">طريقة حساب تكلفة مرتجع المبيعات؟</Label>
                  <Select 
                    value={settings.sales_return_cost_method} 
                    onValueChange={(v) => setSettings({...settings, sales_return_cost_method: v})} 
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="bg-muted">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_price">حسب تكلفة سعر البيع</SelectItem>
                      <SelectItem value="purchase_cost">حسب تكلفة الشراء</SelectItem>
                      <SelectItem value="average_cost">حسب المتوسط المرجح</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Templates View (Placeholder)
  if (currentView === 'templates') {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setCurrentView('main')}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">قوالب الطباعة</h1>
          </div>
          <Card>
            <CardContent className="py-16 text-center">
              <Receipt className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">سيتم إضافة قوالب الطباعة قريباً</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Employee Warehouses View (Placeholder)
  if (currentView === 'employee-warehouses') {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setCurrentView('main')}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">المستودعات الافتراضية للموظفين</h1>
            <Button className="mr-auto">
              إضافة
            </Button>
          </div>
          
          <div className="flex gap-2 mb-6">
            <Button 
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
            <Button 
              variant="outline"
              onClick={() => setCurrentView('main')}
            >
              إلغاء
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>معلومات الموظف</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>موظف *</Label>
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="إختر موظف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">إختر موظف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المستودع الافتراضي للموظف *</Label>
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="من فضلك اختر" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">من فضلك اختر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
};

export default InventorySettings;
