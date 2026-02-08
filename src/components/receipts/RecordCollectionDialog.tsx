import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Banknote, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Receipt {
  id: string;
  receipt_number: string;
  original_amount: number;
  collected_amount: number;
  remaining_amount: number;
  currency_code: string;
}

interface RecordCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: Receipt;
  onSuccess: () => void;
}

export const RecordCollectionDialog = ({
  open,
  onOpenChange,
  receipt,
  onSuccess,
}: RecordCollectionDialogProps) => {
  const [amount, setAmount] = useState("");
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const recordMutation = useMutation({
    mutationFn: async () => {
      const collectionAmount = parseFloat(amount);
      
      if (!collectionAmount || collectionAmount <= 0) {
        throw new Error("الرجاء إدخال مبلغ صحيح");
      }

      if (collectionAmount > receipt.remaining_amount) {
        throw new Error(`المبلغ يتجاوز المتبقي (${receipt.remaining_amount.toFixed(2)})`);
      }

      const { data, error } = await supabase.rpc("record_receipt_collection", {
        p_receipt_id: receipt.id,
        p_amount: collectionAmount,
        p_notes: notes || null,
        p_collection_date: collectionDate,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "تم تسجيل التحصيل بنجاح");
      setAmount("");
      setNotes("");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تسجيل التحصيل");
    },
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " " + (receipt.currency_code === "YER" ? "ر.ي" : receipt.currency_code === "SAR" ? "ر.س" : receipt.currency_code);
  };

  const handleFullAmount = () => {
    setAmount(receipt.remaining_amount.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            تسجيل تحصيل - {receipt.receipt_number}
          </DialogTitle>
          <DialogDescription>
            سجّل المبلغ الذي تم تحصيله فعلياً من العميل
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Receipt Summary */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-muted rounded-lg text-center">
            <div>
              <p className="text-xs text-muted-foreground">الأصلي</p>
              <p className="font-semibold text-sm">{formatCurrency(receipt.original_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المحصّل</p>
              <p className="font-semibold text-sm text-green-600">{formatCurrency(receipt.collected_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المتبقي</p>
              <p className="font-semibold text-sm text-orange-600">{formatCurrency(receipt.remaining_amount)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>مبلغ التحصيل *</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                max={receipt.remaining_amount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleFullAmount}>
                المبلغ كاملاً
              </Button>
            </div>
            {parseFloat(amount) > receipt.remaining_amount && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  المبلغ يتجاوز المتبقي!
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label>تاريخ التحصيل</Label>
            <Input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>ملاحظات</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات عن عملية التحصيل..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={() => recordMutation.mutate()}
            disabled={recordMutation.isPending || !amount || parseFloat(amount) <= 0}
          >
            {recordMutation.isPending ? "جاري التسجيل..." : "تسجيل التحصيل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
