import { RefreshCw, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ExchangeRateDisplayProps {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  isLocked?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
  className?: string;
}

export function ExchangeRateDisplay({
  fromCurrency,
  toCurrency,
  rate,
  isLocked = false,
  isLoading = false,
  error = null,
  onRefresh,
  showRefreshButton = true,
  className,
}: ExchangeRateDisplayProps) {
  if (fromCurrency === toCurrency) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 p-3 rounded-lg bg-muted/50 border", className)}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">سعر الصرف:</span>
          {error ? (
            <div className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <span className="font-medium">
              1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
            </span>
          )}
        </div>
        {isLocked && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>السعر مثبت</span>
          </div>
        )}
      </div>
      
      {showRefreshButton && !isLocked && onRefresh && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      )}
      
      {isLocked && (
        <Badge variant="secondary" className="text-xs">
          <Lock className="h-3 w-3 ml-1" />
          مثبت
        </Badge>
      )}
    </div>
  );
}
