import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Users, Shield, Building, Save } from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  assigned_at: string;
}

interface SystemSettings {
  default_currency: { code: string; symbol: string };
  default_tax: { tax_code: string; rate: number };
  default_warehouse: { warehouse_id: string | null };
  company_info: {
    name: string;
    address: string;
    phone: string;
    email: string;
    tax_number: string;
  };
}

const Settings = () => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    default_currency: { code: "SAR", symbol: "ر.س" },
    default_tax: { tax_code: "VAT", rate: 15 },
    default_warehouse: { warehouse_id: null },
    company_info: { name: "", address: "", phone: "", email: "", tax_number: "" },
  });
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchUserRoles();
    fetchCurrentUserRole();
    fetchSystemSettings();
    fetchWarehouses();
    fetchCurrencies();
    fetchTaxes();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchCurrentUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setCurrentUserRole(data.role);
      }
    }
  };

  const fetchUserRoles = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .order("assigned_at", { ascending: false });

    if (error) {
      toast({
        title: "خطأ في تحميل البيانات",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUserRoles(data || []);
    }
  };

  const fetchSystemSettings = async () => {
    const { data, error } = await supabase
      .from("system_settings")
      .select("*");

    if (!error && data) {
      const settingsObj: any = {};
      data.forEach((item) => {
        settingsObj[item.setting_key] = item.setting_value;
      });
      setSettings({
        default_currency: settingsObj.default_currency || { code: "SAR", symbol: "ر.س" },
        default_tax: settingsObj.default_tax || { tax_code: "VAT", rate: 15 },
        default_warehouse: settingsObj.default_warehouse || { warehouse_id: null },
        company_info: settingsObj.company_info || { name: "", address: "", phone: "", email: "", tax_number: "" },
      });
    }
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase
      .from("warehouses")
      .select("*")
      .order("name");
    setWarehouses(data || []);
  };

  const fetchCurrencies = async () => {
    const { data } = await supabase
      .from("currencies")
      .select("*")
      .eq("is_active", true)
      .order("name");
    setCurrencies(data || []);
  };

  const fetchTaxes = async () => {
    const { data } = await supabase
      .from("taxes")
      .select("*")
      .eq("is_active", true)
      .order("name");
    setTaxes(data || []);
  };

  const saveSettings = async () => {
    if (currentUserRole !== "admin") {
      toast({
        title: "غير مصرح",
        description: "تحتاج إلى صلاحيات مدير النظام لحفظ الإعدادات",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const updates = [
      { key: "default_currency", value: settings.default_currency },
      { key: "default_tax", value: settings.default_tax },
      { key: "default_warehouse", value: settings.default_warehouse },
      { key: "company_info", value: settings.company_info },
    ];

    let hasError = false;
    for (const update of updates) {
      const { error } = await supabase
        .from("system_settings")
        .update({
          setting_value: update.value,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("setting_key", update.key);

      if (error) {
        hasError = true;
        break;
      }
    }

    setLoading(false);
    if (!hasError) {
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ الإعدادات العامة",
      });
    } else {
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ الإعدادات",
        variant: "destructive",
      });
    }
  };

  const getRoleLabel = (role: string) => {
    const roles: { [key: string]: string } = {
      admin: "مدير النظام",
      pharmacist: "صيدلي",
      cashier: "كاشير",
      inventory_manager: "مدير المخزون",
    };
    return roles[role] || role;
  };

  const getRoleVariant = (role: string) => {
    const variants: { [key: string]: any } = {
      admin: "default",
      pharmacist: "secondary",
      cashier: "outline",
      inventory_manager: "secondary",
    };
    return variants[role] || "outline";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <Tabs defaultValue="system" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="system">إعدادات النظام</TabsTrigger>
            <TabsTrigger value="users">المستخدمون</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  معلومات الشركة
                </CardTitle>
                <CardDescription>
                  المعلومات الأساسية التي ستظهر في الفواتير والمستندات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">اسم الشركة *</Label>
                    <Input
                      id="company_name"
                      value={settings.company_info.name}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          company_info: { ...settings.company_info, name: e.target.value },
                        })
                      }
                      disabled={currentUserRole !== "admin"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_number">الرقم الضريبي</Label>
                    <Input
                      id="tax_number"
                      value={settings.company_info.tax_number}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          company_info: { ...settings.company_info, tax_number: e.target.value },
                        })
                      }
                      disabled={currentUserRole !== "admin"}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">العنوان</Label>
                  <Input
                    id="address"
                    value={settings.company_info.address}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        company_info: { ...settings.company_info, address: e.target.value },
                      })
                    }
                    disabled={currentUserRole !== "admin"}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input
                      id="phone"
                      value={settings.company_info.phone}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          company_info: { ...settings.company_info, phone: e.target.value },
                        })
                      }
                      disabled={currentUserRole !== "admin"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.company_info.email}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          company_info: { ...settings.company_info, email: e.target.value },
                        })
                      }
                      disabled={currentUserRole !== "admin"}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  الإعدادات الافتراضية
                </CardTitle>
                <CardDescription>
                  الإعدادات التي ستُطبق تلقائياً على الفواتير والمعاملات الجديدة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">العملة الافتراضية *</Label>
                    <Select
                      value={settings.default_currency.code}
                      onValueChange={(value) => {
                        const currency = currencies.find((c) => c.code === value);
                        if (currency) {
                          setSettings({
                            ...settings,
                            default_currency: { code: currency.code, symbol: currency.symbol },
                          });
                        }
                      }}
                      disabled={currentUserRole !== "admin"}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.name} ({currency.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax">الضريبة الافتراضية *</Label>
                    <Select
                      value={settings.default_tax.tax_code}
                      onValueChange={(value) => {
                        const tax = taxes.find((t) => t.tax_code === value);
                        if (tax) {
                          setSettings({
                            ...settings,
                            default_tax: { tax_code: tax.tax_code, rate: tax.rate },
                          });
                        }
                      }}
                      disabled={currentUserRole !== "admin"}
                    >
                      <SelectTrigger id="tax">
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
                  <div className="space-y-2">
                    <Label htmlFor="warehouse">الفرع/المستودع الافتراضي</Label>
                    <Select
                      value={settings.default_warehouse.warehouse_id || ""}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          default_warehouse: { warehouse_id: value || null },
                        })
                      }
                      disabled={currentUserRole !== "admin"}
                    >
                      <SelectTrigger id="warehouse">
                        <SelectValue placeholder="اختر المستودع" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {currentUserRole === "admin" && (
                  <div className="pt-4">
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
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  صلاحيات الأدوار
                </CardTitle>
                <CardDescription>
                  وصف الصلاحيات المتاحة لكل دور في النظام
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Badge variant="default">مدير النظام</Badge>
                    <div className="text-sm">
                      <p className="font-medium mb-1">جميع الصلاحيات:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>إدارة المستخدمين والصلاحيات</li>
                        <li>إدارة الإعدادات العامة</li>
                        <li>إدارة المنتجات والمخزون</li>
                        <li>إدارة المبيعات والعملاء</li>
                        <li>عرض جميع التقارير</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Badge variant="secondary">صيدلي</Badge>
                    <div className="text-sm">
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>إدارة المبيعات والفواتير</li>
                        <li>إدارة العملاء</li>
                        <li>عرض المخزون والمنتجات</li>
                        <li>إصدار المرتجعات</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Badge variant="outline">كاشير</Badge>
                    <div className="text-sm">
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>نقطة البيع (POS)</li>
                        <li>عرض المنتجات والأسعار</li>
                        <li>عرض معلومات العملاء</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Badge variant="secondary">مدير المخزون</Badge>
                    <div className="text-sm">
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>إدارة المنتجات والمخزون</li>
                        <li>إدارة المستودعات</li>
                        <li>إدارة الموردين</li>
                        <li>إدارة أوامر الشراء</li>
                        <li>عمليات الجرد</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  المستخدمون والصلاحيات
                </CardTitle>
                <CardDescription>
                  قائمة بجميع المستخدمين وصلاحياتهم في النظام
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentUserRole === "admin" ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>معرف المستخدم</TableHead>
                          <TableHead>الصلاحية</TableHead>
                          <TableHead>تاريخ التعيين</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userRoles.map((userRole) => (
                          <TableRow key={userRole.id}>
                            <TableCell className="font-mono text-xs">
                              {userRole.user_id.substring(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <Badge variant={getRoleVariant(userRole.role)}>
                                {getRoleLabel(userRole.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(userRole.assigned_at).toLocaleDateString("ar-SA")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>تحتاج إلى صلاحيات مدير النظام لعرض هذه المعلومات</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
