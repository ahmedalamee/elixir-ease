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
  // CRITICAL: For base currency (YER), always use rate = 1
  const effectiveRate = currencyFC === currencyBC || currencyFC === "YER" ? 1 : exchangeRate;
  
  const subtotalBC = subtotalFC * effectiveRate;
  const discountBC = discountFC * effectiveRate;
  const taxBC = taxFC * effectiveRate;
  const totalBC = totalFC * effectiveRate;

  // Don't show dual columns if currency is base currency (YER)
  const isBaseCurrency = currencyFC === currencyBC || currencyFC === "YER";

  // Format number helper
  const formatNumber = (num: number) => num.toLocaleString("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className={cn("space-y-3 p-4 bg-muted/30 rounded-lg", className)}>
      <div className={isBaseCurrency ? "" : "grid grid-cols-2 gap-4"}>
        {/* FC Column (or single column for base currency) */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm border-b pb-1">
            {isBaseCurrency ? `الإجماليات (${currencyFC})` : `بعملة الفاتورة (${currencyFC})`}
          </h4>
          <div className="flex justify-between text-sm">
            <span>المجموع الفرعي:</span>
            <span>{formatNumber(subtotalFC)}</span>
          </div>
          {discountFC > 0 && (
            <div className="flex justify-between text-sm text-destructive">
              <span>الخصم:</span>
              <span>-{formatNumber(discountFC)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>الضريبة:</span>
            <span>{formatNumber(taxFC)}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-2">
            <span>الإجمالي:</span>
            <span>{formatNumber(totalFC)} {currencyFC}</span>
          </div>
        </div>

        {/* BC Column - only show when currency is NOT base currency */}
        {!isBaseCurrency && (
          <div className="space-y-2 border-r pr-4">
            <h4 className="font-medium text-sm border-b pb-1">
              بالعملة الأساسية ({currencyBC})
            </h4>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>المجموع الفرعي:</span>
              <span>{formatNumber(subtotalBC)}</span>
            </div>
            {discountBC > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>الخصم:</span>
                <span>-{formatNumber(discountBC)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>الضريبة:</span>
              <span>{formatNumber(taxBC)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2 text-muted-foreground">
              <span>الإجمالي:</span>
              <span>{formatNumber(totalBC)} {currencyBC}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
