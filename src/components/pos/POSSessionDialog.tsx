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
import { postPosSession } from "@/lib/pos";
import { DoorOpen, DoorClosed, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [postingResult, setPostingResult] = useState<{
    success: boolean;
    journalEntryNumber?: string;
    totalCashSales?: number;
    totalCardSales?: number;
    totalCogs?: number;
    message?: string;
  } | null>(null);

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
        user_id: user?.id,
        opening_cash: parseFloat(openingCash),
        status: "open",
        notes,
        session_date: new Date().toISOString().split("T")[0],
        start_time: new Date().toISOString(),
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
    setPostingResult(null);
    
    try {
      // Call the post_pos_session function which handles:
      // 1. Aggregating all session sales
      // 2. Calculating COGS using FIFO
      // 3. Creating GL journal entries
      // 4. Closing the session
      const result = await postPosSession(
        currentSession.id,
        parseFloat(closingCash)
      );

      setPostingResult({
        success: result.success,
        journalEntryNumber: result.journalEntryNumber,
        totalCashSales: result.totalCashSales,
        totalCardSales: result.totalCardSales,
        totalCogs: result.totalCogs,
        message: result.message,
      });

      toast({
        title: "✅ تم إغلاق وترحيل الجلسة",
        description: result.journalEntryNumber 
          ? `قيد يومية رقم: ${result.journalEntryNumber}`
          : result.message,
      });

      // Wait a moment to show the result before closing
      setTimeout(() => {
        onSessionUpdate();
        onOpenChange(false);
        setClosingCash("");
        setPostingResult(null);
      }, 2000);

    } catch (error: any) {
      setPostingResult({
        success: false,
        message: error.message,
      });
      
      toast({
        title: "خطأ في ترحيل الجلسة",
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
                إغلاق وترحيل الجلسة
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
                  disabled={loading}
                />
              </div>

              {/* Posting Result Display */}
              {postingResult && (
                <Alert variant={postingResult.success ? "default" : "destructive"}>
                  <div className="flex items-center gap-2">
                    {postingResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {postingResult.success ? (
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-green-600">
                            تم الترحيل بنجاح
                          </p>
                          {postingResult.journalEntryNumber && (
                            <p>قيد يومية: {postingResult.journalEntryNumber}</p>
                          )}
                          {(postingResult.totalCashSales || 0) > 0 && (
                            <p>مبيعات نقدية: {postingResult.totalCashSales?.toFixed(2)} ر.س</p>
                          )}
                          {(postingResult.totalCardSales || 0) > 0 && (
                            <p>مبيعات بطاقة: {postingResult.totalCardSales?.toFixed(2)} ر.س</p>
                          )}
                          {(postingResult.totalCogs || 0) > 0 && (
                            <p>تكلفة البضاعة: {postingResult.totalCogs?.toFixed(2)} ر.س</p>
                          )}
                        </div>
                      ) : (
                        <p>{postingResult.message}</p>
                      )}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            إلغاء
          </Button>
          <Button
            onClick={currentSession ? handleCloseSession : handleOpenSession}
            disabled={loading || (postingResult?.success === true)}
          >
            {loading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جارٍ المعالجة...
              </>
            ) : currentSession ? (
              "إغلاق وترحيل الجلسة"
            ) : (
              "فتح الجلسة"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
