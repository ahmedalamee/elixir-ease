import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { customerSchema } from "@/lib/validationSchemas";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EditCustomerInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
  };
}

export function EditCustomerInfoDialog({ 
  open, 
  onOpenChange, 
  customer 
}: EditCustomerInfoDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: customer.name,
    phone: customer.phone || "",
    address: customer.address || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);

    try {
      // Prepare data for validation
      const dataToValidate = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
      };

      // Validate using customerSchema (only the fields we're updating)
      const validationSchema = customerSchema.pick({
        name: true,
        phone: true,
        address: true,
      });

      const validatedData = validationSchema.parse(dataToValidate);

      // Update with validated data
      const { error } = await supabase
        .from("customers")
        .update(validatedData)
        .eq("id", customer.id);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث بياناتك بنجاح",
      });

      // Invalidate and refetch customer data
      queryClient.invalidateQueries({ queryKey: ["customer", customer.id] });
      queryClient.invalidateQueries({ queryKey: ["customer-portal"] });
      
      onOpenChange(false);
    } catch (error: any) {
      // Handle validation errors
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: "خطأ في البيانات",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطأ",
          description: "فشل تحديث البيانات، يرجى المحاولة مرة أخرى",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>تعديل البيانات الشخصية</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">الاسم *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="الاسم الكامل"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="05xxxxxxxx"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">العنوان</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="العنوان الكامل"
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
