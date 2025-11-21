import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, FileText, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const VATReturns = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const queryClient = useQueryClient();

  const { data: returns, isLoading } = useQuery({
    queryKey: ["vat-returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vat_returns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: taxPeriods } = useQuery({
    queryKey: ["tax-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_periods")
        .select("*")
        .eq("status", "open")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      if (!startDate || !endDate) {
        throw new Error("يرجى تحديد تاريخ البداية والنهاية");
      }

      const { data, error } = await supabase.rpc("generate_vat_report", {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("تم إنشاء التقرير بنجاح");
      console.log("VAT Report:", data);
    },
    onError: (error: any) => {
      toast.error(`فشل إنشاء التقرير: ${error.message}`);
    },
  });

  const submitReturnMutation = useMutation({
    mutationFn: async (returnId: string) => {
      const { error } = await supabase
        .from("vat_returns")
        .update({ status: "submitted", submission_date: new Date().toISOString() })
        .eq("id", returnId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تقديم الإقرار بنجاح");
      queryClient.invalidateQueries({ queryKey: ["vat-returns"] });
    },
    onError: (error: any) => {
      toast.error(`فشل تقديم الإقرار: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="p-8">جارٍ التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              الإقرارات الضريبية
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  إقرار جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>إنشاء إقرار ضريبي جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>من تاريخ</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>إلى تاريخ</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => generateReportMutation.mutate()}
                    disabled={generateReportMutation.isPending}
                  >
                    إنشاء التقرير
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفترة</TableHead>
                  <TableHead>من تاريخ</TableHead>
                  <TableHead>إلى تاريخ</TableHead>
                  <TableHead>المبيعات</TableHead>
                  <TableHead>المشتريات</TableHead>
                  <TableHead>صافي الضريبة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns?.map((ret: any) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-medium">{ret.period_name}</TableCell>
                    <TableCell>{new Date(ret.period_start).toLocaleDateString("ar-SA")}</TableCell>
                    <TableCell>{new Date(ret.period_end).toLocaleDateString("ar-SA")}</TableCell>
                    <TableCell>{ret.total_sales_vat?.toFixed(2)} ر.س</TableCell>
                    <TableCell>{ret.total_purchase_vat?.toFixed(2)} ر.س</TableCell>
                    <TableCell className="font-bold">{ret.net_vat?.toFixed(2)} ر.س</TableCell>
                    <TableCell>
                      <Badge variant={ret.status === "submitted" ? "default" : "secondary"}>
                        {ret.status === "submitted" ? "مقدم" : "مسودة"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ret.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => submitReturnMutation.mutate(ret.id)}
                          disabled={submitReturnMutation.isPending}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          تقديم
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {returns?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد إقرارات ضريبية
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VATReturns;
