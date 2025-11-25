import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, User, CreditCard, Award, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerInfoCardProps {
  customerId: string;
}

interface CustomerDetails {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  balance: number;
  credit_limit: number;
  loyalty_points: number;
  last_transaction_date: string | null;
  is_active: boolean;
}

export const CustomerInfoCard = ({ customerId }: CustomerInfoCardProps) => {
  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer-details", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (error) throw error;
      return data as any as CustomerDetails;
    },
    enabled: !!customerId,
  });

  if (!customerId) return null;
  if (isLoading) {
    return (
      <Card className="mb-4 animate-pulse">
        <CardContent className="h-32" />
      </Card>
    );
  }

  if (!customer) return null;

  const creditUsagePercent = customer.credit_limit > 0 
    ? (customer.balance / customer.credit_limit) * 100 
    : 0;
  
  const isOverLimit = customer.balance > customer.credit_limit;
  const isNearLimit = creditUsagePercent > 80 && !isOverLimit;

  return (
    <div className="space-y-3 mb-4">
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            معلومات العميل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {/* الهاتف */}
            <div>
              <p className="text-muted-foreground mb-1">الهاتف</p>
              <p className="font-medium">{customer.phone || "-"}</p>
            </div>

            {/* البريد */}
            <div>
              <p className="text-muted-foreground mb-1">البريد الإلكتروني</p>
              <p className="font-medium text-xs">{customer.email || "-"}</p>
            </div>

            {/* الرصيد */}
            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                الرصيد الحالي
              </p>
              <p className={cn(
                "font-bold text-base",
                customer.balance > 0 ? "text-red-600" : customer.balance < 0 ? "text-green-600" : ""
              )}>
                {customer.balance.toFixed(2)} ر.س
              </p>
            </div>

            {/* حد الائتمان */}
            <div>
              <p className="text-muted-foreground mb-1">حد الائتمان</p>
              <p className="font-medium">{customer.credit_limit.toFixed(2)} ر.س</p>
              {customer.credit_limit > 0 && (
                <div className="mt-1">
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all",
                        isOverLimit ? "bg-destructive" : isNearLimit ? "bg-yellow-500" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(creditUsagePercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {creditUsagePercent.toFixed(0)}% مستخدم
                  </p>
                </div>
              )}
            </div>

            {/* نقاط الولاء */}
            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <Award className="h-3 w-3" />
                نقاط الولاء
              </p>
              <p className="font-bold text-base text-primary">
                {customer.loyalty_points} نقطة
              </p>
            </div>

            {/* آخر معاملة */}
            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                آخر معاملة
              </p>
              <p className="font-medium text-xs">
                {customer.last_transaction_date
                  ? new Date(customer.last_transaction_date).toLocaleDateString("ar-SA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "لا توجد معاملات"}
              </p>
            </div>

            {/* الحالة */}
            <div>
              <p className="text-muted-foreground mb-1">الحالة</p>
              <div className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                customer.is_active 
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {customer.is_active ? "نشط" : "غير نشط"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* تحذيرات */}
      {isOverLimit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>تحذير:</strong> تجاوز العميل حد الائتمان المسموح به
            (الرصيد: {customer.balance.toFixed(2)} / الحد: {customer.credit_limit.toFixed(2)})
          </AlertDescription>
        </Alert>
      )}

      {isNearLimit && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-400">
            العميل قريب من تجاوز حد الائتمان ({creditUsagePercent.toFixed(0)}% مستخدم)
          </AlertDescription>
        </Alert>
      )}

      {!customer.is_active && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-400">
            هذا العميل غير نشط. يرجى التحقق قبل المتابعة.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
