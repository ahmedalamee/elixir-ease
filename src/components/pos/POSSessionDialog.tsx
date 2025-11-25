import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DoorOpen, DoorClosed } from "lucide-react";

interface POSSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSession: any;
  onSessionUpdate: () => void;
}

export const POSSessionDialog = ({
  open,
  onOpenChange,
  currentSession,
  onSessionUpdate,
}: POSSessionDialogProps) => {
  const { toast } = useToast();
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpenSession = async () => {
    if (!openingCash) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال المبلغ الافتتاحي",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sessionNumber = `POS-${Date.now()}`;

      const { error } = await supabase.from("pos_sessions").insert({
        session_number: sessionNumber,
        cashier_id: user?.id,
        opening_cash: parseFloat(openingCash),
        status: "open",
        notes,
      });

      if (error) throw error;

      toast({
        title: "تم فتح الجلسة",
        description: `رقم الجلسة: ${sessionNumber}`,
      });

      onSessionUpdate();
      onOpenChange(false);
      setOpeningCash("");
      setNotes("");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!closingCash) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال المبلغ الختامي",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const difference = parseFloat(closingCash) - (currentSession?.expected_cash || 0);

      const { error } = await supabase
        .from("pos_sessions")
        .update({
          closing_cash: parseFloat(closingCash),
          difference,
          status: "closed",
          closed_at: new Date().toISOString(),
        })
        .eq("id", currentSession.id);

      if (error) throw error;

      toast({
        title: "تم إغلاق الجلسة",
        description: `الفرق: ${difference.toFixed(2)} ر.س`,
      });

      onSessionUpdate();
      onOpenChange(false);
      setClosingCash("");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentSession ? (
              <>
                <DoorClosed className="w-5 h-5" />
                إغلاق الجلسة
              </>
            ) : (
              <>
                <DoorOpen className="w-5 h-5" />
                فتح جلسة جديدة
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {currentSession
              ? `رقم الجلسة: ${currentSession.session_number}`
              : "قم بإدخال المبلغ الافتتاحي لبدء جلسة جديدة"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentSession ? (
            <>
              <div className="space-y-2">
                <Label>المبلغ المتوقع</Label>
                <Input
                  value={currentSession.expected_cash?.toFixed(2) || "0.00"}
                  disabled
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closingCash">المبلغ الفعلي *</Label>
                <Input
                  id="closingCash"
                  type="number"
                  step="0.01"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder="0.00"
                  className="text-right"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="openingCash">المبلغ الافتتاحي *</Label>
                <Input
                  id="openingCash"
                  type="number"
                  step="0.01"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0.00"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات اختيارية..."
                  className="text-right"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={currentSession ? handleCloseSession : handleOpenSession}
            disabled={loading}
          >
            {loading ? "جارٍ الحفظ..." : currentSession ? "إغلاق الجلسة" : "فتح الجلسة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
