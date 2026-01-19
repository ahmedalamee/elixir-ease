import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Phone, Mail, MapPin, CreditCard, TrendingUp, FileText, LogOut, Wallet, Edit, UserPlus, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EditCustomerInfoDialog } from "@/components/customers/EditCustomerInfoDialog";

interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  balance: number;
  credit_limit: number;
  loyalty_points: number;
  last_transaction_date: string;
  currency_code: string | null;
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Get current session
  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/customer-auth");
        return null;
      }
      return session;
    },
  });

  // Fetch customer data
  const { data: customer, isLoading: customerLoading, refetch: refetchCustomer } = useQuery({
    queryKey: ["customer-portal", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", session.user.id)
        .limit(1);

      if (error) throw error;
      return (data?.[0] ?? null) as CustomerData | null;
    },
    enabled: !!session?.user?.id,
  });

  // Create customer profile mutation
  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user) throw new Error("لم يتم تسجيل الدخول");
      
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || "عميل جديد",
          email: session.user.email,
          user_id: session.user.id,
          balance: 0,
          credit_limit: 0,
          loyalty_points: 0,
          is_active: true,
          currency_code: 'YER',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء الملف الشخصي",
        description: "مرحباً بك في بوابة العملاء",
      });
      refetchCustomer();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["customer-invoices", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];

      const { data, error } = await supabase
        .from("sales_invoices")
        .select("*")
        .eq("customer_id", customer.id)
        .order("invoice_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!customer?.id,
  });

  const loading = customerLoading || invoicesLoading;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
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

  // دالة للحصول على رمز العملة
  const getCurrencySymbol = (code: string | null) => {
    switch (code?.toUpperCase()) {
      case 'SAR': return 'ر.س';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'YER':
      default: return 'ر.ي';
    }
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
        <Card className="p-8 text-center max-w-md">
          <div className="mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">مرحباً بك!</h2>
            <p className="text-muted-foreground">
              لم يتم العثور على ملف شخصي مرتبط بحسابك. يمكنك إنشاء ملفك الشخصي الآن.
            </p>
          </div>
          <div className="space-y-3">
            <Button 
              onClick={() => createCustomerMutation.mutate()} 
              disabled={createCustomerMutation.isPending}
              className="w-full"
            >
              {createCustomerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 ml-2" />
                  إنشاء الملف الشخصي
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleLogout} className="w-full">
              <LogOut className="w-4 h-4 ml-2" />
              تسجيل الخروج
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currencySymbol = getCurrencySymbol(customer.currency_code);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 shadow-lg">
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
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
                <p className="text-2xl font-bold">{customer.balance.toFixed(2)} {currencySymbol}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 rounded-lg">
                <CreditCard className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">حد الائتمان</p>
                <p className="text-2xl font-bold">{customer.credit_limit.toFixed(2)} {currencySymbol}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
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

          <Card className="p-6">
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
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">البيانات الشخصية</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="w-4 h-4 ml-2" />
                تعديل البيانات
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/customers/${customer.id}`)}>
                <User className="w-4 h-4 ml-2" />
                عرض الملف الكامل
              </Button>
            </div>
          </div>
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
        <Card className="p-6">
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
                    <TableRow 
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/sales-invoice/${invoice.id}`)}
                    >
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{new Date(invoice.invoice_date).toLocaleDateString("ar-SA")}</TableCell>
                      <TableCell>{invoice.total_amount.toFixed(2)} {currencySymbol}</TableCell>
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

      {customer && (
        <EditCustomerInfoDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          customer={{
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
          }}
        />
      )}
    </div>
  );
};

export default CustomerPortal;
