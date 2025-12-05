import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerBalanceCardProps {
  customerName: string;
  balanceFC: number;
  balanceBC?: number;
  currencyFC: string;
  currencyBC?: string;
  creditLimit?: number;
  className?: string;
}

export function CustomerBalanceCard({
  customerName,
  balanceFC,
  balanceBC,
  currencyFC,
  currencyBC = "YER",
  creditLimit,
  className,
}: CustomerBalanceCardProps) {
  const isOverLimit = creditLimit ? balanceFC > creditLimit : false;
  const isSameCurrency = currencyFC === currencyBC;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          رصيد العميل
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">بعملة الحساب:</span>
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-bold text-lg",
              balanceFC > 0 ? "text-destructive" : "text-green-600"
            )}>
              {balanceFC.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} {currencyFC}
            </span>
            {balanceFC > 0 ? (
              <TrendingUp className="h-4 w-4 text-destructive" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>

        {!isSameCurrency && balanceBC !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">بالعملة الأساسية:</span>
            <span className="text-sm text-muted-foreground">
              ≈ {balanceBC.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} {currencyBC}
            </span>
          </div>
        )}

        {creditLimit !== undefined && creditLimit > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">حد الائتمان:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {creditLimit.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} {currencyFC}
              </span>
              {isOverLimit && (
                <Badge variant="destructive" className="text-xs">
                  تجاوز الحد
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
