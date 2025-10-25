import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Users, Shield, Building, Save, Hash, FileText, DollarSign, Receipt, Package, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const [settings, setSettings] = useState<any>({
    default_currency: { code: "SAR", symbol: "ر.س" },
    default_tax: { tax_code: "VAT", rate: 15 },
    default_warehouse: { warehouse_id: null },
    default_price_list: { price_list_id: null },
    company_info: { name: "", address: "", phone: "", email: "", tax_number: "" },
    inventory_valuation_method: "FIFO",
    allow_negative_stock: false,
    enable_advanced_pricing: true,
    track_expiry_dates: true,
    track_barcodes: true,
    enable_multiple_uoms: true,
    show_stock_alerts: true,
    low_stock_alert_days: 30,
    expiry_alert_days: 30,
    inventory_account_id: null,
  });
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [numberingRules, setNumberingRules] = useState<any[]>([]);
  const [postingRules, setPostingRules] = useState<any[]>([]);
  const [glAccounts, setGLAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [valuationLocked, setValuationLocked] = useState(false);
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
      fetchCurrencies(),
      fetchTaxes(),
      fetchPriceLists(),
      fetchNumberingRules(),
      fetchPostingRules(),
      fetchGLAccounts(),
    ]);
  };

  const fetchSystemSettings = async () => {
    const { data } = await supabase.from("system_settings").select("*");
    if (data) {
      const settingsObj: any = {};
      data.forEach((item) => { settingsObj[item.setting_key] = item.setting_value; });
      setSettings({
        default_currency: settingsObj.default_currency || { code: "SAR", symbol: "ر.س" },
        default_tax: settingsObj.default_tax || { tax_code: "VAT", rate: 15 },
        default_warehouse: settingsObj.default_warehouse || { warehouse_id: null },
        default_price_list: settingsObj.default_price_list || { price_list_id: null },
        company_info: settingsObj.company_info || { name: "", address: "", phone: "", email: "", tax_number: "" },
        inventory_valuation_method: settingsObj.inventory_valuation_method || "FIFO",
        allow_negative_stock: settingsObj.allow_negative_stock || false,
        enable_advanced_pricing: settingsObj.enable_advanced_pricing !== false,
        track_expiry_dates: settingsObj.track_expiry_dates !== false,
        track_barcodes: settingsObj.track_barcodes !== false,
        enable_multiple_uoms: settingsObj.enable_multiple_uoms !== false,
        show_stock_alerts: settingsObj.show_stock_alerts !== false,
        low_stock_alert_days: settingsObj.low_stock_alert_days || 30,
        expiry_alert_days: settingsObj.expiry_alert_days || 30,
        inventory_account_id: settingsObj.inventory_account_id || null,
      });
      setValuationLocked(settingsObj.inventory_valuation_locked === true);
    }
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from("warehouses").select("*").order("name");
    setWarehouses(data || []);
  };

  const fetchCurrencies = async () => {
    const { data } = await supabase.from("currencies").select("*").eq("is_active", true).order("name");
    setCurrencies(data || []);
  };

  const fetchTaxes = async () => {
    const { data } = await supabase.from("taxes").select("*").eq("is_active", true).order("name");
    setTaxes(data || []);
  };

  const fetchPriceLists = async () => {
    const { data } = await supabase.from("price_lists").select("*").eq("is_active", true).order("name");
    setPriceLists(data || []);
  };

  const fetchNumberingRules = async () => {
    const { data } = await supabase.from("document_numbering_rules").select("*").order("document_type");
    setNumberingRules(data || []);
  };

  const fetchPostingRules = async () => {
    const { data } = await supabase.from("posting_rules").select("*, debit_account:debit_account_id(account_code, account_name), credit_account:credit_account_id(account_code, account_name)").order("document_type");
    setPostingRules(data || []);
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
    const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));
    for (const update of updates) {
      await supabase.from("system_settings").update({ setting_value: update.value as unknown as Json }).eq("setting_key", update.key);
    }
    setLoading(false);
    toast({ title: "تم الحفظ بنجاح" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <Tabs defaultValue="system">
          <TabsList>
            <TabsTrigger value="system">النظام</TabsTrigger>
            <TabsTrigger value="numbering">الترقيم</TabsTrigger>
            <TabsTrigger value="posting">الترحيل</TabsTrigger>
            <TabsTrigger value="inventory">المخزون</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />معلومات الشركة</CardTitle>
                <CardDescription>المعلومات الأساسية للشركة والفرع</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>اسم الشركة</Label>
                    <Input 
                      value={settings.company_info.name} 
                      onChange={(e) => setSettings({...settings, company_info: {...settings.company_info, name: e.target.value}})} 
                      disabled={!isAdmin}
                      placeholder="أدخل اسم الشركة"
                    />
                  </div>
                  <div>
                    <Label>الرقم الضريبي</Label>
                    <Input 
                      value={settings.company_info.tax_number} 
                      onChange={(e) => setSettings({...settings, company_info: {...settings.company_info, tax_number: e.target.value}})} 
                      disabled={!isAdmin}
                      placeholder="مثال: 300000000000003"
                    />
                  </div>
                  <div>
                    <Label>رقم الهاتف</Label>
                    <Input 
                      value={settings.company_info.phone} 
                      onChange={(e) => setSettings({...settings, company_info: {...settings.company_info, phone: e.target.value}})} 
                      disabled={!isAdmin}
                      placeholder="مثال: +966 50 123 4567"
                    />
                  </div>
                  <div>
                    <Label>البريد الإلكتروني</Label>
                    <Input 
                      type="email"
                      value={settings.company_info.email} 
                      onChange={(e) => setSettings({...settings, company_info: {...settings.company_info, email: e.target.value}})} 
                      disabled={!isAdmin}
                      placeholder="info@company.com"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>العنوان</Label>
                    <Input 
                      value={settings.company_info.address} 
                      onChange={(e) => setSettings({...settings, company_info: {...settings.company_info, address: e.target.value}})} 
                      disabled={!isAdmin}
                      placeholder="العنوان الكامل للشركة"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الإعدادات الافتراضية</CardTitle>
                <CardDescription>العملة والضريبة والمستودع الافتراضي</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>العملة الافتراضية</Label>
                    <Select 
                      value={settings.default_currency?.code || "SAR"} 
                      onValueChange={(code) => {
                        const currency = currencies.find(c => c.code === code);
                        setSettings({...settings, default_currency: { code: currency?.code, symbol: currency?.symbol }});
                      }}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((cur) => (
                          <SelectItem key={cur.code} value={cur.code}>
                            {cur.name} ({cur.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>الضريبة الافتراضية</Label>
                    <Select 
                      value={settings.default_tax?.tax_code || "VAT"} 
                      onValueChange={(tax_code) => {
                        const tax = taxes.find(t => t.tax_code === tax_code);
                        setSettings({...settings, default_tax: { tax_code: tax?.tax_code, rate: tax?.rate }});
                      }}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {taxes.map((tax) => (
                          <SelectItem key={tax.tax_code} value={tax.tax_code}>
                            {tax.name} ({tax.rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>المستودع/الفرع الافتراضي</Label>
                    <Select 
                      value={settings.default_warehouse?.warehouse_id || ""} 
                      onValueChange={(warehouse_id) => {
                        setSettings({...settings, default_warehouse: { warehouse_id }});
                      }}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المستودع" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>
                            {wh.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex justify-end pt-4">
                    <Button onClick={saveSettings} disabled={loading}>
                      <Save className="h-4 w-4 ml-2" />
                      حفظ الإعدادات
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الإعدادات الإضافية</CardTitle>
                <CardDescription>إدارة العملات والضرائب والإعدادات الأخرى</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center gap-2"
                    onClick={() => navigate("/settings/currencies")}
                  >
                    <DollarSign className="h-6 w-6" />
                    <span>إدارة العملات</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center gap-2"
                    onClick={() => navigate("/settings/taxes")}
                  >
                    <Receipt className="h-6 w-6" />
                    <span>إدارة الضرائب</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="numbering">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Hash className="h-5 w-5" />قواعد الترقيم</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>المستند</TableHead><TableHead>البادئة</TableHead><TableHead>الرقم التالي</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {numberingRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>{rule.description}</TableCell>
                        <TableCell>{rule.prefix}</TableCell>
                        <TableCell>{rule.next_number}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posting">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />قواعد الترحيل</CardTitle></CardHeader>
              <CardContent><p>تم إنشاء قواعد الترحيل المحاسبي للمستندات</p></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6 mt-6">
            {/* الإعدادات الافتراضية */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  الإعدادات الافتراضية للمخزون
                </CardTitle>
                <CardDescription>تحديد الخيارات الافتراضية لإدارة المخزون</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>المستودع الافتراضي</Label>
                    <Select 
                      value={settings.default_warehouse?.warehouse_id || ""} 
                      onValueChange={(warehouse_id) => {
                        setSettings({...settings, default_warehouse: { warehouse_id }});
                      }}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المستودع" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>
                            {wh.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>قائمة الأسعار الافتراضية</Label>
                    <Select 
                      value={settings.default_price_list?.price_list_id || ""} 
                      onValueChange={(price_list_id) => {
                        setSettings({...settings, default_price_list: { price_list_id }});
                      }}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر قائمة الأسعار" />
                      </SelectTrigger>
                      <SelectContent>
                        {priceLists.map((pl) => (
                          <SelectItem key={pl.id} value={pl.id}>
                            {pl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>طريقة تقييم المخزون</Label>
                    <Select 
                      value={settings.inventory_valuation_method} 
                      onValueChange={(v) => setSettings({...settings, inventory_valuation_method: v})} 
                      disabled={!isAdmin || valuationLocked}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIFO">FIFO - الوارد أولاً صادر أولاً</SelectItem>
                        <SelectItem value="WEIGHTED_AVERAGE">المتوسط المرجّح</SelectItem>
                        <SelectItem value="STANDARD_COST">التكلفة المعيارية</SelectItem>
                      </SelectContent>
                    </Select>
                    {valuationLocked && (
                      <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        تم القفل بعد بدء الحركات
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>حساب المخزون الرئيسي</Label>
                    <Select 
                      value={settings.inventory_account_id || ""} 
                      onValueChange={(inventory_account_id) => {
                        setSettings({...settings, inventory_account_id});
                      }}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحساب" />
                      </SelectTrigger>
                      <SelectContent>
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
                </div>
              </CardContent>
            </Card>

            {/* الإعدادات العامة */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  الإعدادات العامة للمخزون
                </CardTitle>
                <CardDescription>تفعيل أو تعطيل الميزات الخاصة بإدارة المخزون</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>السماح بالمخزون السالب</Label>
                    <p className="text-sm text-muted-foreground">السماح بالبيع حتى لو كانت الكمية المتاحة صفر</p>
                  </div>
                  <Switch
                    checked={settings.allow_negative_stock}
                    onCheckedChange={(checked) => setSettings({...settings, allow_negative_stock: checked})}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>تفعيل خيارات التسعير المتقدمة</Label>
                    <p className="text-sm text-muted-foreground">استخدام قوائم أسعار متعددة وتسعير حسب الكمية</p>
                  </div>
                  <Switch
                    checked={settings.enable_advanced_pricing}
                    onCheckedChange={(checked) => setSettings({...settings, enable_advanced_pricing: checked})}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>تتبع تاريخ الصلاحية</Label>
                    <p className="text-sm text-muted-foreground">تفعيل إدارة المنتجات حسب تاريخ الصلاحية</p>
                  </div>
                  <Switch
                    checked={settings.track_expiry_dates}
                    onCheckedChange={(checked) => setSettings({...settings, track_expiry_dates: checked})}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>تتبع الباركود</Label>
                    <p className="text-sm text-muted-foreground">تفعيل إدارة الباركود للمنتجات</p>
                  </div>
                  <Switch
                    checked={settings.track_barcodes}
                    onCheckedChange={(checked) => setSettings({...settings, track_barcodes: checked})}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>تفعيل وحدات القياس المتعددة</Label>
                    <p className="text-sm text-muted-foreground">السماح باستخدام أكثر من وحدة قياس للمنتج الواحد</p>
                  </div>
                  <Switch
                    checked={settings.enable_multiple_uoms}
                    onCheckedChange={(checked) => setSettings({...settings, enable_multiple_uoms: checked})}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>إظهار تنبيهات المخزون</Label>
                    <p className="text-sm text-muted-foreground">عرض تنبيهات عند انخفاض الكمية أو قرب انتهاء الصلاحية</p>
                  </div>
                  <Switch
                    checked={settings.show_stock_alerts}
                    onCheckedChange={(checked) => setSettings({...settings, show_stock_alerts: checked})}
                    disabled={!isAdmin}
                  />
                </div>
              </CardContent>
            </Card>

            {/* إعدادات التنبيهات */}
            {settings.show_stock_alerts && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    إعدادات التنبيهات
                  </CardTitle>
                  <CardDescription>تخصيص متى يتم عرض التنبيهات للمستخدمين</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>عدد الأيام للتنبيه بالمخزون المنخفض</Label>
                      <Input
                        type="number"
                        value={settings.low_stock_alert_days}
                        onChange={(e) => setSettings({...settings, low_stock_alert_days: parseInt(e.target.value) || 30})}
                        disabled={!isAdmin}
                        min="1"
                        max="365"
                      />
                      <p className="text-xs text-muted-foreground mt-1">عدد الأيام المتبقية للوصول إلى الحد الأدنى</p>
                    </div>

                    <div>
                      <Label>عدد الأيام للتنبيه بقرب انتهاء الصلاحية</Label>
                      <Input
                        type="number"
                        value={settings.expiry_alert_days}
                        onChange={(e) => setSettings({...settings, expiry_alert_days: parseInt(e.target.value) || 30})}
                        disabled={!isAdmin}
                        min="1"
                        max="365"
                      />
                      <p className="text-xs text-muted-foreground mt-1">عدد الأيام قبل انتهاء صلاحية المنتج</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAdmin && (
              <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={loading}>
                  <Save className="h-4 w-4 ml-2" />
                  حفظ إعدادات المخزون
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
