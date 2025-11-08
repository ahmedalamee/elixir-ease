import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Phone, Mail, MapPin, CreditCard, TrendingUp, FileText, LogOut, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  balance: number;
  credit_limit: number;
  loyalty_points: number;
  last_transaction_date: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  payment_status: string;
}

const CustomerPortal = () => {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/customer-auth");
        return;
      }

      // Fetch customer data
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Fetch customer invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("sales_invoices")
        .select("id, invoice_number, invoice_date, total_amount, status, payment_status")
        .eq("customer_id", customerData.id)
        .order("invoice_date", { ascending: false })
        .limit(10);

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/customer-auth");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      draft: { variant: "secondary", label: "مسودة" },
      pending: { variant: "outline", label: "معلق" },
      posted: { variant: "default", label: "منشور" },
      cancelled: { variant: "destructive", label: "ملغي" },
      returned: { variant: "destructive", label: "مرتجع" },
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      unpaid: { variant: "destructive", label: "غير مدفوع" },
      partial: { variant: "outline", label: "مدفوع جزئياً" },
      paid: { variant: "default", label: "مدفوع" },
      overdue: { variant: "destructive", label: "متأخر" },
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">لم يتم العثور على بيانات العميل</p>
          <Button onClick={() => navigate("/customer-auth")}>
            العودة لتسجيل الدخول
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-hover text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <User className="w-8 h-8" />
              {customer.name}
            </h1>
            <p className="text-primary-foreground/80 mt-1">مرحباً بك في بوابة العملاء</p>
          </div>
          <Button variant="secondary" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Customer Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 card-elegant">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
                <p className="text-2xl font-bold">{customer.balance.toFixed(2)} ر.س</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 card-elegant">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 rounded-lg">
                <CreditCard className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">حد الائتمان</p>
                <p className="text-2xl font-bold">{customer.credit_limit.toFixed(2)} ر.س</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 card-elegant">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">نقاط الولاء</p>
                <p className="text-2xl font-bold">{customer.loyalty_points}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 card-elegant">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عدد الفواتير</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Contact Information */}
        <Card className="p-6 card-elegant">
          <h2 className="text-xl font-bold mb-4">البيانات الشخصية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                <p className="font-medium">{customer.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                <p className="font-medium">{customer.phone || "غير محدد"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">العنوان</p>
                <p className="font-medium">{customer.address || "غير محدد"}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Invoices Table */}
        <Card className="p-6 card-elegant">
          <h2 className="text-xl font-bold mb-4">فواتير المبيعات</h2>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد فواتير حتى الآن</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المبلغ الإجمالي</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>حالة الدفع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{new Date(invoice.invoice_date).toLocaleDateString("ar-SA")}</TableCell>
                      <TableCell>{invoice.total_amount.toFixed(2)} ر.س</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(invoice.payment_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CustomerPortal;