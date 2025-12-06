import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CompanyBranding {
  id: string;
  company_name: string;
  company_name_en: string | null;
  company_logo_url: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_phone_2: string | null;
  company_address: string | null;
  company_address_en: string | null;
  invoice_footer_note: string | null;
  invoice_footer_note_en: string | null;
  tax_number: string | null;
  commercial_register: string | null;
  website: string | null;
  theme_color: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

const BRANDING_ID = "00000000-0000-0000-0000-000000000001";

export const useCompanyBranding = () => {
  const queryClient = useQueryClient();

  const { data: branding, isLoading, error } = useQuery({
    queryKey: ["company-branding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_branding")
        .select("*")
        .eq("id", BRANDING_ID)
        .single();

      if (error) throw error;
      return data as CompanyBranding;
    },
  });

  const updateBranding = useMutation({
    mutationFn: async (updates: Partial<CompanyBranding>) => {
      const { data, error } = await supabase
        .from("company_branding")
        .update(updates)
        .eq("id", BRANDING_ID)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-branding"] });
      toast.success("تم حفظ الإعدادات بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حفظ الإعدادات");
    },
  });

  const uploadLogo = async (file: File): Promise<string | null> => {
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الملف يجب أن يكون أقل من 2 ميجابايت");
      return null;
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("نوع الملف غير مدعوم. يرجى استخدام PNG، JPG، SVG أو WebP");
      return null;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `company-logo-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("company-logos")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      toast.error("فشل رفع الصورة: " + error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("company-logos")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const deleteLogo = async (logoUrl: string): Promise<boolean> => {
    try {
      // Extract file name from URL
      const urlParts = logoUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];

      const { error } = await supabase.storage
        .from("company-logos")
        .remove([fileName]);

      if (error) {
        console.error("Error deleting logo:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error deleting logo:", error);
      return false;
    }
  };

  return {
    branding,
    isLoading,
    error,
    updateBranding,
    uploadLogo,
    deleteLogo,
  };
};
