import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Save, Globe, Phone, Mail, MapPin, FileText, Banknote, Receipt } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CompanyInfo {
  name: string;
  name_en: string;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  tax_number: string;
  commercial_registration: string;
  logo_url: string;
  established_date: string;
  fiscal_year_start: string;
  default_currency_code: string;
  default_language: string;
}

const CompanyProfile = () => {
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "",
    name_en: "",
    address: "",
    city: "",
    country: "المملكة العربية السعودية",
    postal_code: "",
    phone: "",
    mobile: "",
    email: "",
    website: "",
    tax_number: "",
    commercial_registration: "",
    logo_url: "",
    established_date: "",
    fiscal_year_start: "01-01",
    default_currency_code: "SAR",
    default_language: "ar",
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();
    
    setIsAdmin(data?.role === "admin");
  };

  const fetchData = async () => {
    // Fetch company info from system_settings
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("*")
      .eq("setting_key", "company_info")
      .single();

    if (settingsData?.setting_value) {
      const info = settingsData.setting_value as any;
      setCompanyInfo({
        name: info.name || "",
        name_en: info.name_en || "",
        address: info.address || "",
        city: info.city || "",
        country: info.country || "المملكة العربية السعودية",
        postal_code: info.postal_code || "",
        phone: info.phone || "",
        mobile: info.mobile || "",
        email: info.email || "",
        website: info.website || "",
        tax_number: info.tax_number || "",
        commercial_registration: info.commercial_registration || "",
        logo_url: info.logo_url || "",
        established_date: info.established_date || "",
        fiscal_year_start: info.fiscal_year_start || "01-01",
        default_currency_code: info.default_currency_code || "SAR",
        default_language: info.default_language || "ar",
      });
    }

    // Fetch currencies
    const { data: currenciesData } = await supabase
      .from("currencies")
      .select("*")
      .eq("is_active", true)
      .order("name");
    setCurrencies(currenciesData || []);
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast({
        title: "غير مصرح",
        description: "تحتاج إلى صلاحيات المدير لحفظ البيانات",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          setting_key: "company_info",
          setting_value: companyInfo as any,
          description: "معلومات الشركة الكاملة",
        }, { onConflict: "setting_key" });

      if (error) throw error;

      toast({
        title: "✅ تم الحفظ بنجاح",
        description: "تم حفظ معلومات الشركة",
      });
    } catch (error) {
      console.error("Error saving company info:", error);
      toast({
        title: "❌ خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            الملف التعريفي للشركة
          </h1>
          <p className="text-muted-foreground mt-2">
            إدارة المعلومات الأساسية والقانونية للشركة
          </p>
        </div>

        <div className="grid gap-6">
          {/* المعلومات الأساسية */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                المعلومات الأساسية
              </CardTitle>
              <CardDescription>اسم الشركة والمعلومات التعريفية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">اسم الشركة (عربي) *</Label>
                  <Input
                    id="name"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                    placeholder="مثال: شركة التقنية المتقدمة"
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <Label htmlFor="name_en">Company Name (English)</Label>
                  <Input
                    id="name_en"
                    value={companyInfo.name_en}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, name_en: e.target.value })}
                    placeholder="Example: Advanced Tech Company"
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <Label htmlFor="established_date">تاريخ التأسيس</Label>
                  <Input
                    id="established_date"
                    type="date"
                    value={companyInfo.established_date}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, established_date: e.target.value })}
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <Label htmlFor="fiscal_year_start">بداية السنة المالية (MM-DD)</Label>
                  <Input
                    id="fiscal_year_start"
                    value={companyInfo.fiscal_year_start}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, fiscal_year_start: e.target.value })}
                    placeholder="01-01"
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* المعلومات القانونية */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                المعلومات القانونية
              </CardTitle>
              <CardDescription>الأرقام الرسمية والتسجيلات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tax_number">
                    <Receipt className="h-4 w-4 inline ml-2" />
                    الرقم الضريبي *
                  </Label>
                  <Input
                    id="tax_number"
                    value={companyInfo.tax_number}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, tax_number: e.target.value })}
                    placeholder="300000000000003"
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <Label htmlFor="commercial_registration">السجل التجاري</Label>
                  <Input
                    id="commercial_registration"
                    value={companyInfo.commercial_registration}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, commercial_registration: e.target.value })}
                    placeholder="1010000000"
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* معلومات الاتصال */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                معلومات الاتصال
              </CardTitle>
              <CardDescription>طرق التواصل مع الشركة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">
                    <Phone className="h-4 w-4 inline ml-2" />
                    الهاتف
                  </Label>
                  <Input
                    id="phone"
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                    placeholder="+966 11 234 5678"
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">الجوال</Label>
                  <Input
                    id="mobile"
                    value={companyInfo.mobile}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, mobile: e.target.value })}
                    placeholder="+966 50 123 4567"
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <Label htmlFor="email">
                    <Mail className="h-4 w-4 inline ml-2" />
                    البريد الإلكتروني
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                    placeholder="info@company.com"
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <Label htmlFor="website">
                    <Globe className="h-4 w-4 inline ml-2" />
                    الموقع الإلكتروني
                  </Label>
                  <Input
                    id="website"
                    value={companyInfo.website}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })}
                    placeholder="https://www.company.com"
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* العنوان */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                العنوان
              </CardTitle>
              <CardDescription>العنوان الكامل للشركة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">العنوان</Label>
                <Textarea
                  id="address"
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                  placeholder="الشارع، الحي، المدينة"
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">المدينة</Label>
                  <Input
                    id="city"
                    value={companyInfo.city}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, city: e.target.value })}
                    placeholder="الرياض"
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <Label htmlFor="country">الدولة</Label>
                  <Input
                    id="country"
                    value={companyInfo.country}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, country: e.target.value })}
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">الرمز البريدي</Label>
                  <Input
                    id="postal_code"
                    value={companyInfo.postal_code}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, postal_code: e.target.value })}
                    placeholder="12345"
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الإعدادات الافتراضية */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                الإعدادات الافتراضية
              </CardTitle>
              <CardDescription>العملة واللغة الافتراضية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="default_currency_code">العملة الافتراضية</Label>
                  <Select
                    value={companyInfo.default_currency_code}
                    onValueChange={(value) => setCompanyInfo({ ...companyInfo, default_currency_code: value })}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
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
                <div>
                  <Label htmlFor="default_language">اللغة الافتراضية</Label>
                  <Select
                    value={companyInfo.default_language}
                    onValueChange={(value) => setCompanyInfo({ ...companyInfo, default_language: value })}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* زر الحفظ */}
          {isAdmin && (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/settings")}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                حفظ البيانات
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;
