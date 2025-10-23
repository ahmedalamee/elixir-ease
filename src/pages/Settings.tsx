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
import { Settings as SettingsIcon, Users, Shield, Building, Save, Hash, FileText } from "lucide-react";

const Settings = () => {
  const [settings, setSettings] = useState<any>({
    default_currency: { code: "SAR", symbol: "ر.س" },
    default_tax: { tax_code: "VAT", rate: 15 },
    default_warehouse: { warehouse_id: null },
    company_info: { name: "", address: "", phone: "", email: "", tax_number: "" },
    inventory_valuation_method: "FIFO",
  });
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
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
        company_info: settingsObj.company_info || { name: "", address: "", phone: "", email: "", tax_number: "" },
        inventory_valuation_method: settingsObj.inventory_valuation_method || "FIFO",
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
      await supabase.from("system_settings").update({ setting_value: update.value as Json }).eq("setting_key", update.key);
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
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>اسم الشركة</Label><Input value={settings.company_info.name} onChange={(e) => setSettings({...settings, company_info: {...settings.company_info, name: e.target.value}})} disabled={!isAdmin} /></div>
                  <div><Label>الرقم الضريبي</Label><Input value={settings.company_info.tax_number} onChange={(e) => setSettings({...settings, company_info: {...settings.company_info, tax_number: e.target.value}})} disabled={!isAdmin} /></div>
                </div>
                {isAdmin && <Button onClick={saveSettings} disabled={loading}><Save className="h-4 w-4 ml-2" />حفظ</Button>}
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

          <TabsContent value="inventory">
            <Card>
              <CardHeader><CardTitle>تقييم المخزون</CardTitle></CardHeader>
              <CardContent>
                <Label>الطريقة</Label>
                <Select value={settings.inventory_valuation_method} onValueChange={(v) => setSettings({...settings, inventory_valuation_method: v})} disabled={!isAdmin || valuationLocked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIFO">FIFO</SelectItem>
                    <SelectItem value="WEIGHTED_AVERAGE">المتوسط المرجّح</SelectItem>
                  </SelectContent>
                </Select>
                {valuationLocked && <p className="text-sm text-amber-600 mt-2">⚠️ تم القفل بعد بدء الحركات</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
