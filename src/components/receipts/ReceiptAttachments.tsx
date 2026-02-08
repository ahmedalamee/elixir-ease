import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Paperclip, Upload, Download, Trash2, FileText, Image as ImageIcon } from "lucide-react";

interface ReceiptAttachmentsProps {
  receiptId: string;
}

export const ReceiptAttachments = ({ receiptId }: ReceiptAttachmentsProps) => {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState("");

  const { data: attachments, isLoading } = useQuery({
    queryKey: ["receipt-attachments", receiptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipt_attachments")
        .select("*")
        .eq("receipt_id", receiptId)
        .order("uploaded_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      
      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${receiptId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("receipt-attachments")
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from("receipt-attachments")
        .getPublicUrl(fileName);
      
      // Save attachment record
      const { error: insertError } = await supabase
        .from("receipt_attachments")
        .insert({
          receipt_id: receiptId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          description: description || null,
        });
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success("تم رفع الملف بنجاح");
      queryClient.invalidateQueries({ queryKey: ["receipt-attachments", receiptId] });
      setDescription("");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء رفع الملف");
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from("receipt_attachments")
        .delete()
        .eq("id", attachmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف المرفق");
      queryClient.invalidateQueries({ queryKey: ["receipt-attachments", receiptId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حذف المرفق");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("حجم الملف يجب أن لا يتجاوز 10 ميجابايت");
        return;
      }
      uploadMutation.mutate(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (fileType: string | null) => {
    if (fileType?.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Paperclip className="h-5 w-5" />
          <span>إرفاق ملفات (صور، PDF)</span>
        </div>
        
        <div className="space-y-2">
          <Label>وصف المرفق (اختياري)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="مثال: إيصال التحصيل الموقّع"
          />
        </div>
        
        <div className="flex justify-center">
          <Label
            htmlFor="file-upload"
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "جاري الرفع..." : "اختر ملف"}
          </Label>
          <Input
            id="file-upload"
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
        </div>
        <p className="text-xs text-center text-muted-foreground">
          الحد الأقصى: 10 ميجابايت | الصيغ: JPG, PNG, PDF
        </p>
      </div>

      {/* Attachments List */}
      {attachments && attachments.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الملف</TableHead>
              <TableHead>الوصف</TableHead>
              <TableHead>الحجم</TableHead>
              <TableHead>تاريخ الرفع</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attachments.map((attachment) => (
              <TableRow key={attachment.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getFileIcon(attachment.file_type)}
                    <span className="truncate max-w-[150px]">{attachment.file_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {attachment.description || "-"}
                </TableCell>
                <TableCell className="text-xs">
                  {formatFileSize(attachment.file_size || 0)}
                </TableCell>
                <TableCell className="text-xs">
                  {new Date(attachment.uploaded_at).toLocaleDateString("ar-SA")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(attachment.file_url, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذا المرفق؟")) {
                          deleteMutation.mutate(attachment.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>لا توجد مرفقات</p>
        </div>
      )}
    </div>
  );
};
