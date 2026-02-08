import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface CustomerPendingWarningProps {
  pendingLimit: number;
  remainingBalance: number;
  creditLimit: number;
  invoicesBalance: number;
  currencySymbol?: string;
}

export const CustomerPendingWarning = ({
  pendingLimit,
  remainingBalance,
  creditLimit,
  invoicesBalance,
  currencySymbol = "ر.ي",
}: CustomerPendingWarningProps) => {
  const exceedsPendingLimit = remainingBalance > pendingLimit;
  const exceedsCreditLimit = invoicesBalance > creditLimit;
  const totalExposure = invoicesBalance + remainingBalance;

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("ar-SA", {
      minimumFractionDigits: 2,
    }) + " " + currencySymbol;
  };

  if (!exceedsPendingLimit && !exceedsCreditLimit) {
    return null;
  }

  return (
    <div className="space-y-2">
      {exceedsPendingLimit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>تحذير: تجاوز حد سندات القبض المعلقة</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              <p>رصيد السندات المعلقة: <strong>{formatAmount(remainingBalance)}</strong></p>
              <p>الحد المسموح: <strong>{formatAmount(pendingLimit)}</strong></p>
              <p className="text-destructive font-semibold">
                التجاوز: {formatAmount(remainingBalance - pendingLimit)}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {exceedsCreditLimit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>تحذير: تجاوز حد الائتمان</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              <p>رصيد الفواتير المفتوحة: <strong>{formatAmount(invoicesBalance)}</strong></p>
              <p>حد الائتمان: <strong>{formatAmount(creditLimit)}</strong></p>
              <p className="text-destructive font-semibold">
                التجاوز: {formatAmount(invoicesBalance - creditLimit)}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="p-3 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">إجمالي التعرض المالي للعميل:</p>
        <p className="text-lg font-bold">{formatAmount(totalExposure)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          (رصيد الفواتير + رصيد سندات القبض المعلقة)
        </p>
      </div>
    </div>
  );
};
