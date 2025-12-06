import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCompanyBranding, CompanyBranding } from "@/hooks/useCompanyBranding";
import { useUserRole } from "@/hooks/useUserRole";
import { Navbar } from "@/components/Navbar";
import { 
  Building2, 
  Upload, 
  Save, 
  X, 
  Loader2,
  Image as ImageIcon,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  Palette,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

const CompanyBrandingPage = () => {
  const navigate = useNavigate();
  const { branding, isLoading, updateBranding, uploadLogo, deleteLogo } = useCompanyBranding();
  const { isAdmin, loading: roleLoading } = useUserRole();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<CompanyBranding>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (branding) {
      setFormData(branding);
      setLogoPreview(branding.company_logo_url);
    }
  }, [branding]);

  const handleInputChange = (field: keyof CompanyBranding, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const url = await uploadLogo(file);
      if (url) {
        setFormData(prev => ({ ...prev, company_logo_url: url }));
        setLogoPreview(url);
        setHasChanges(true);
        toast.success("تم رفع الشعار بنجاح");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (formData.company_logo_url) {
      await deleteLogo(formData.company_logo_url);
    }
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, company_logo_url: null }));
    setHasChanges(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    updateBranding.mutate(formData, {
      onSuccess: () => {
        setHasChanges(false);
      }
    });
  };

  if (isLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="container mx-auto p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              إعدادات الهوية التجارية
            </h1>
            <p className="text-muted-foreground mt-1">
              قم بتخصيص معلومات الشركة التي تظهر في الفواتير والتقارير
            </p>
          </div>
          {!isAdmin && (
            <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-sm">
              عرض فقط - ليس لديك صلاحية التعديل
            </div>
          )}
        </div>

        <div className="grid gap-6">
          {/* Logo Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                شعار الشركة
              </CardTitle>
              <CardDescription>
                رفع شعار الشركة (PNG, JPG, SVG - حد أقصى 2MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="شعار الشركة" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Building2 className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={!isAdmin || isUploading}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isAdmin || isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="ml-2 h-4 w-4" />
                    )}
                    {isUploading ? "جاري الرفع..." : "رفع شعار جديد"}
                  </Button>
                  {logoPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={handleRemoveLogo}
                      disabled={!isAdmin}
                    >
                      <Trash2 className="ml-2 h-4 w-4" />
                      إزالة الشعار
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                معلومات الشركة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">اسم الشركة (عربي) *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name || ""}
                    onChange={(e) => handleInputChange("company_name", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="أدخل اسم الشركة"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_name_en">اسم الشركة (إنجليزي)</Label>
                  <Input
                    id="company_name_en"
                    value={formData.company_name_en || ""}
                    onChange={(e) => handleInputChange("company_name_en", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="Company Name"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_number">الرقم الضريبي</Label>
                  <Input
                    id="tax_number"
                    value={formData.tax_number || ""}
                    onChange={(e) => handleInputChange("tax_number", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="أدخل الرقم الضريبي"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commercial_register">السجل التجاري</Label>
                  <Input
                    id="commercial_register"
                    value={formData.commercial_register || ""}
                    onChange={(e) => handleInputChange("commercial_register", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="أدخل رقم السجل التجاري"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                معلومات الاتصال
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    رقم الهاتف الأساسي
                  </Label>
                  <Input
                    id="company_phone"
                    value={formData.company_phone || ""}
                    onChange={(e) => handleInputChange("company_phone", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="+967-XXXXXXXXX"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_phone_2" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    رقم الهاتف الثانوي
                  </Label>
                  <Input
                    id="company_phone_2"
                    value={formData.company_phone_2 || ""}
                    onChange={(e) => handleInputChange("company_phone_2", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="+967-XXXXXXXXX"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    البريد الإلكتروني
                  </Label>
                  <Input
                    id="company_email"
                    type="email"
                    value={formData.company_email || ""}
                    onChange={(e) => handleInputChange("company_email", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="email@company.com"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    الموقع الإلكتروني
                  </Label>
                  <Input
                    id="website"
                    value={formData.website || ""}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="https://www.company.com"
                    dir="ltr"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    العنوان (عربي)
                  </Label>
                  <Textarea
                    id="company_address"
                    value={formData.company_address || ""}
                    onChange={(e) => handleInputChange("company_address", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="أدخل عنوان الشركة"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_address_en" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    العنوان (إنجليزي)
                  </Label>
                  <Textarea
                    id="company_address_en"
                    value={formData.company_address_en || ""}
                    onChange={(e) => handleInputChange("company_address_en", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="Enter company address"
                    rows={3}
                    dir="ltr"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Footer Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                تذييل الفواتير
              </CardTitle>
              <CardDescription>
                نص يظهر في أسفل جميع الفواتير
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_footer_note">ملاحظة التذييل (عربي)</Label>
                  <Textarea
                    id="invoice_footer_note"
                    value={formData.invoice_footer_note || ""}
                    onChange={(e) => handleInputChange("invoice_footer_note", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="مثال: شكراً لتعاملكم معنا"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_footer_note_en">ملاحظة التذييل (إنجليزي)</Label>
                  <Textarea
                    id="invoice_footer_note_en"
                    value={formData.invoice_footer_note_en || ""}
                    onChange={(e) => handleInputChange("invoice_footer_note_en", e.target.value)}
                    disabled={!isAdmin}
                    placeholder="e.g. Thank you for your business"
                    rows={3}
                    dir="ltr"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme Color Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                لون العلامة التجارية
              </CardTitle>
              <CardDescription>
                اختر اللون الرئيسي للفواتير والتقارير
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input
                  type="color"
                  value={formData.theme_color || "#3b82f6"}
                  onChange={(e) => handleInputChange("theme_color", e.target.value)}
                  disabled={!isAdmin}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.theme_color || "#3b82f6"}
                  onChange={(e) => handleInputChange("theme_color", e.target.value)}
                  disabled={!isAdmin}
                  className="w-32"
                  dir="ltr"
                />
                <span className="text-muted-foreground text-sm">
                  سيتم استخدام هذا اللون في رأس الفواتير
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => navigate("/settings")}
            >
              <X className="ml-2 h-4 w-4" />
              إلغاء
            </Button>
            {isAdmin && (
              <Button
                onClick={handleSave}
                disabled={updateBranding.isPending || !hasChanges}
              >
                {updateBranding.isPending ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="ml-2 h-4 w-4" />
                )}
                حفظ الإعدادات
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyBrandingPage;
