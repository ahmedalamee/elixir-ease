import { cn } from "@/lib/utils";

interface DualAmountDisplayProps {
  amountFC: number;
  amountBC: number;
  currencyFC: string;
  currencyBC: string;
  showBC?: boolean;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function DualAmountDisplay({
  amountFC,
  amountBC,
  currencyFC,
  currencyBC,
  showBC = true,
  label,
  className,
  size = "md",
}: DualAmountDisplayProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg font-semibold",
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const isSameCurrency = currencyFC === currencyBC;

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <div className={cn(sizeClasses[size])}>
        <span className="font-medium">
          {formatAmount(amountFC)} {currencyFC}
        </span>
      </div>
      {showBC && !isSameCurrency && (
        <div className="text-xs text-muted-foreground">
          ≈ {formatAmount(amountBC)} {currencyBC}
        </div>
      )}
    </div>
  );
}

interface InvoiceTotalsSummaryProps {
  subtotalFC: number;
  discountFC: number;
  taxFC: number;
  totalFC: number;
  exchangeRate: number;
  currencyFC: string;
  currencyBC: string;
  className?: string;
}

export function InvoiceTotalsSummary({
  subtotalFC,
  discountFC,
  taxFC,
  totalFC,
  exchangeRate,
  currencyFC,
  currencyBC,
  className,
}: InvoiceTotalsSummaryProps) {
  const subtotalBC = subtotalFC * exchangeRate;
  const discountBC = discountFC * exchangeRate;
  const taxBC = taxFC * exchangeRate;
  const totalBC = totalFC * exchangeRate;

  const isSameCurrency = currencyFC === currencyBC;

  return (
    <div className={cn("space-y-3 p-4 bg-muted/30 rounded-lg", className)}>
      <div className="grid grid-cols-2 gap-4">
        {/* FC Column */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm border-b pb-1">
            بعملة الفاتورة ({currencyFC})
          </h4>
          <div className="flex justify-between text-sm">
            <span>المجموع الفرعي:</span>
            <span>{subtotalFC.toFixed(2)}</span>
          </div>
          {discountFC > 0 && (
            <div className="flex justify-between text-sm text-destructive">
              <span>الخصم:</span>
              <span>-{discountFC.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>الضريبة:</span>
            <span>{taxFC.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-2">
            <span>الإجمالي:</span>
            <span>{totalFC.toFixed(2)} {currencyFC}</span>
          </div>
        </div>

        {/* BC Column */}
        {!isSameCurrency && (
          <div className="space-y-2 border-r pr-4">
            <h4 className="font-medium text-sm border-b pb-1">
              بالعملة الأساسية ({currencyBC})
            </h4>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>المجموع الفرعي:</span>
              <span>{subtotalBC.toFixed(2)}</span>
            </div>
            {discountBC > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>الخصم:</span>
                <span>-{discountBC.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>الضريبة:</span>
              <span>{taxBC.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2 text-muted-foreground">
              <span>الإجمالي:</span>
              <span>{totalBC.toFixed(2)} {currencyBC}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
