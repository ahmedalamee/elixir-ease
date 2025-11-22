import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Building2, CheckCircle } from "lucide-react";

const BankReconciliation = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [formData, setFormData] = useState({
    reconciliation_date: new Date().toISOString().split("T")[0],
    statement_balance: 0,
    book_balance: 0,
  });

  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("is_active", true)
        .order("account_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: reconciliations, isLoading } = useQuery({
    queryKey: ["bank-reconciliations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_reconciliations")
        .select(`
          *,
          bank_accounts(account_name, account_number)
        `)
        .order("reconciliation_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Generate reconciliation number
      const { data: lastRecon } = await supabase
        .from("bank_reconciliations")
        .select("reconciliation_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const lastNum = lastRecon?.reconciliation_number?.match(/\d+$/)?.[0] || "0";
      const newNum = `BR-${String(parseInt(lastNum) + 1).padStart(6, "0")}`;

      const { error } = await supabase.from("bank_reconciliations").insert([
        {
          ...data,
          reconciliation_number: newNum,
          adjusted_balance: data.book_balance,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إنشاء تسوية بنكية جديدة");
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`فشل في إنشاء التسوية: ${error.message}`);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bank_reconciliations")
        .update({
          status: "completed",
          reconciled_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إتمام التسوية البنكية");
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] });
    },
    onError: (error: any) => {
      toast.error(`فشل في إتمام التسوية: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      reconciliation_date: new Date().toISOString().split("T")[0],
      statement_balance: 0,
      book_balance: 0,
    });
    setSelectedBankAccount("");
  };

  const handleSubmit = () => {
    if (!selectedBankAccount) {
      toast.error("يرجى اختيار حساب بنكي");
      return;
    }
    createMutation.mutate({
      ...formData,
      bank_account_id: selectedBankAccount,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: "secondary", label: "مسودة" },
      in_progress: { variant: "outline", label: "قيد العمل" },
      completed: { variant: "default", label: "مكتمل" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

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
              <Building2 className="h-6 w-6" />
              تسوية البنوك
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 ml-2" />
                  تسوية جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>إنشاء تسوية بنكية جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>الحساب البنكي</Label>
                    <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحساب البنكي" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts?.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name} - {account.account_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>تاريخ التسوية</Label>
                    <Input
                      type="date"
                      value={formData.reconciliation_date}
                      onChange={(e) =>
                        setFormData({ ...formData, reconciliation_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>رصيد الكشف البنكي</Label>
                      <Input
                        type="number"
                        value={formData.statement_balance}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            statement_balance: parseFloat(e.target.value),
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>رصيد الدفاتر</Label>
                      <Input
                        type="number"
                        value={formData.book_balance}
                        onChange={(e) =>
                          setFormData({ ...formData, book_balance: parseFloat(e.target.value) })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleSubmit}>
                    إنشاء التسوية
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم التسوية</TableHead>
                  <TableHead>الحساب البنكي</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>رصيد الكشف</TableHead>
                  <TableHead>رصيد الدفاتر</TableHead>
                  <TableHead>الفرق</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliations?.map((recon: any) => {
                  const difference = recon.statement_balance - recon.book_balance;
                  return (
                    <TableRow key={recon.id}>
                      <TableCell className="font-mono">{recon.reconciliation_number}</TableCell>
                      <TableCell>{recon.bank_accounts?.account_name}</TableCell>
                      <TableCell>
                        {new Date(recon.reconciliation_date).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>{recon.statement_balance?.toFixed(2)} ر.س</TableCell>
                      <TableCell>{recon.book_balance?.toFixed(2)} ر.س</TableCell>
                      <TableCell
                        className={Math.abs(difference) < 0.01 ? "text-green-600" : "text-red-600"}
                      >
                        {difference.toFixed(2)} ر.س
                      </TableCell>
                      <TableCell>{getStatusBadge(recon.status)}</TableCell>
                      <TableCell>
                        {recon.status !== "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => completeMutation.mutate(recon.id)}
                          >
                            <CheckCircle className="h-4 w-4 ml-2" />
                            إتمام
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {reconciliations?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">لا توجد تسويات بنكية</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BankReconciliation;
