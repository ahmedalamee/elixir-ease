import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProductImageUploadProps {
  currentImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
  onImageRemoved?: () => void;
}

export const ProductImageUpload = ({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
}: ProductImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("نوع الملف غير مدعوم. يرجى اختيار صورة (JPEG, PNG, WebP, GIF)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت");
      return;
    }

    setIsUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onImageUploaded(publicUrl);
      toast.success("تم رفع الصورة بنجاح");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error("فشل رفع الصورة: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (previewUrl) {
      try {
        // Extract file path from URL
        const url = new URL(previewUrl);
        const pathParts = url.pathname.split("/");
        const filePath = pathParts.slice(-2).join("/"); // products/filename.ext

        // Delete from storage
        const { error } = await supabase.storage
          .from("product-images")
          .remove([filePath]);

        if (error) {
          console.error("Error removing image:", error);
        }
      } catch (error) {
        console.error("Error parsing URL:", error);
      }
    }

    setPreviewUrl(null);
    onImageRemoved?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="صورة المنتج"
              className="w-20 h-20 object-cover rounded-lg border border-border"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-20 h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/50">
            <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
          </div>
        )}

        <div className="flex-1 space-y-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id="product-image-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الرفع...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {previewUrl ? "تغيير الصورة" : "رفع صورة"}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, GIF (الحد الأقصى 5 ميجابايت)
          </p>
        </div>
      </div>
    </div>
  );
};
