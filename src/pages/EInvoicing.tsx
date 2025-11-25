import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, FileText, RefreshCw, ExternalLink } from "lucide-react";

const EInvoicing = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["e-invoices", searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("e_invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`invoice_number.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("zatca_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const retryInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      // في تطبيق حقيقي، سنقوم بإرسال الفاتورة مجدداً لـ ZATCA
      const { error } = await supabase
        .from("e_invoices")
        .update({ zatca_status: "pending" })
        .eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إعادة إرسال الفاتورة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["e-invoices"] });
    },
    onError: (error: any) => {
      toast.error(`فشلت إعادة الإرسال: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: "secondary", label: "منتظر" },
      approved: { variant: "default", label: "معتمد" },
      rejected: { variant: "destructive", label: "مرفوض" },
      failed: { variant: "destructive", label: "فشل" },
    };
    const config = variants[status] || variants.pending;
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              الفواتير الإلكترونية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الفاتورة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">منتظر</SelectItem>
                  <SelectItem value="approved">معتمد</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                  <SelectItem value="failed">فشل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>UUID</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead>تاريخ الاعتماد</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>رمز QR</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices?.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.invoice_type === "standard" ? "قياسية" : "مبسطة"}</TableCell>
                    <TableCell className="font-mono text-xs">{invoice.uuid?.substring(0, 8)}...</TableCell>
                    <TableCell>{new Date(invoice.created_at).toLocaleDateString("ar-SA")}</TableCell>
                    <TableCell>
                      {invoice.approved_at 
                        ? new Date(invoice.approved_at).toLocaleDateString("ar-SA")
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.zatca_status)}</TableCell>
                    <TableCell>
                      {invoice.qr_code && (
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {(invoice.zatca_status === "rejected" || invoice.zatca_status === "failed") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryInvoiceMutation.mutate(invoice.id)}
                          disabled={retryInvoiceMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          إعادة
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {invoices?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد فواتير إلكترونية
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EInvoicing;
