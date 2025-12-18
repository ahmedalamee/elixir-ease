import { cn } from "@/lib/utils";

interface TotalsSummaryProps {
  subtotalFC: number;
  discountFC?: number;
  taxFC?: number;
  totalFC: number;
  subtotalBC: number;
  discountBC?: number;
  taxBC?: number;
  totalBC: number;
  currencyFC: string;
  currencyBC: string;
  showBC?: boolean;
  className?: string;
}

export function TotalsSummary({
  subtotalFC,
  discountFC = 0,
  taxFC = 0,
  totalFC,
  subtotalBC,
  discountBC = 0,
  taxBC = 0,
  totalBC,
  currencyFC,
  currencyBC,
  showBC = true,
  className,
}: TotalsSummaryProps) {
  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toLocaleString("ar-YE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const isDifferentCurrency = currencyFC !== currencyBC;

  return (
    <div className={cn("border rounded-lg p-4 bg-muted/30", className)}>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">المجموع الفرعي:</span>
          <div className="text-left">
            <span>{formatAmount(subtotalFC, currencyFC)}</span>
            {showBC && isDifferentCurrency && (
              <span className="text-muted-foreground text-xs block">
                {formatAmount(subtotalBC, currencyBC)}
              </span>
            )}
          </div>
        </div>

        {discountFC > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الخصم:</span>
            <div className="text-left text-red-600">
              <span>- {formatAmount(discountFC, currencyFC)}</span>
              {showBC && isDifferentCurrency && (
                <span className="text-muted-foreground text-xs block">
                  - {formatAmount(discountBC, currencyBC)}
                </span>
              )}
            </div>
          </div>
        )}

        {taxFC > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الضريبة:</span>
            <div className="text-left">
              <span>{formatAmount(taxFC, currencyFC)}</span>
              {showBC && isDifferentCurrency && (
                <span className="text-muted-foreground text-xs block">
                  {formatAmount(taxBC, currencyBC)}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between font-semibold">
            <span>الإجمالي:</span>
            <div className="text-left">
              <span className="text-lg">{formatAmount(totalFC, currencyFC)}</span>
              {showBC && isDifferentCurrency && (
                <span className="text-primary text-sm block">
                  {formatAmount(totalBC, currencyBC)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
