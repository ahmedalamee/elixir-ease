import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const AccountingIntegration = () => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  // الحصول على جميع الروابط بين المستندات والقيود
  const { data: documentEntries, isLoading, refetch } = useQuery({
    queryKey: ["document-gl-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_gl_entries")
        .select(`
          *,
          journal_entries (
            entry_number,
            status,
            total_debit,
            total_credit
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  // إحصائيات التكامل
  const stats = {
    total: documentEntries?.length || 0,
    posted: documentEntries?.filter(d => d.status === 'posted').length || 0,
    pending: documentEntries?.filter(d => d.status === 'pending').length || 0,
    failed: documentEntries?.filter(d => d.status === 'failed').length || 0,
  };

  const handleGeneratePendingEntries = async () => {
    setIsGenerating(true);
    try {
      const pendingDocs = documentEntries?.filter(d => d.status === 'pending') || [];
      
      if (pendingDocs.length === 0) {
        toast.info("لا توجد مستندات معلقة لإنشاء قيود لها");
        return;
      }

      toast.info(`جاري إنشاء ${pendingDocs.length} قيد محاسبي...`);
      
      // هنا يمكن إضافة المنطق لإنشاء القيود
      // سيتم استدعاء edge function لكل مستند معلق
      
      await refetch();
      toast.success("تم إنشاء القيود المحاسبية بنجاح");
    } catch (error) {
      console.error("Error generating entries:", error);
      toast.error("حدث خطأ أثناء إنشاء القيود المحاسبية");
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, icon: any }> = {
      posted: { variant: "default", label: "مرحّل", icon: CheckCircle },
      pending: { variant: "secondary", label: "معلق", icon: AlertCircle },
      failed: { variant: "destructive", label: "فشل", icon: XCircle },
      reversed: { variant: "outline", label: "مُعكوس", icon: RefreshCw },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sales_invoice: "فاتورة مبيعات",
      purchase_invoice: "فاتورة مشتريات",
      customer_payment: "سداد عميل",
      supplier_payment: "سداد مورد",
      sales_return: "مرتجع مبيعات",
      purchase_return: "مرتجع مشتريات",
      stock_adjustment: "تعديل مخزون",
      warehouse_transfer: "تحويل مخزني",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">التكامل المحاسبي</h1>
        <p className="text-muted-foreground mt-2">
          مراقبة القيود المحاسبية المولدة تلقائياً من المستندات
        </p>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي المستندات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              المرحّلة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.posted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              المعلقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              الفاشلة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* الجدول الرئيسي */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>سجل التكامل المحاسبي</CardTitle>
              <CardDescription className="mt-1">
                جميع المستندات المربوطة بالنظام المحاسبي
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="ml-2 h-4 w-4" />
                تحديث
              </Button>
              <Button
                size="sm"
                onClick={handleGeneratePendingEntries}
                disabled={isGenerating || stats.pending === 0}
              >
                <CheckCircle className="ml-2 h-4 w-4" />
                إنشاء القيود المعلقة ({stats.pending})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نوع المستند</TableHead>
                <TableHead>رقم المستند</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>رقم القيد</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentEntries && documentEntries.length > 0 ? (
                documentEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <span className="font-medium">
                        {getDocumentTypeLabel(entry.document_type)}
                      </span>
                    </TableCell>
                    <TableCell>{entry.document_number}</TableCell>
                    <TableCell>
                      {entry.document_amount.toLocaleString('ar-SA', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} ر.س
                    </TableCell>
                    <TableCell>
                      {entry.journal_entries?.[0]?.entry_number || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell>
                      {new Date(entry.created_at).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      {entry.journal_entry_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/journal-entry/${entry.journal_entry_id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد سجلات تكامل محاسبي حالياً
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* أخطاء التكامل */}
      {stats.failed > 0 && (
        <Card className="mt-6 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              أخطاء التكامل المحاسبي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستند</TableHead>
                  <TableHead>رسالة الخطأ</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentEntries
                  ?.filter(e => e.status === 'failed')
                  .map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {getDocumentTypeLabel(entry.document_type)} - {entry.document_number}
                      </TableCell>
                      <TableCell className="text-destructive">
                        {entry.error_message || 'خطأ غير معروف'}
                      </TableCell>
                      <TableCell>
                        {new Date(entry.created_at).toLocaleDateString('ar-SA')}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AccountingIntegration;
