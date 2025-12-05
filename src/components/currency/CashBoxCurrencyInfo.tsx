import { Badge } from "@/components/ui/badge";
import { Banknote, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface CashBoxCurrencyInfoProps {
  cashBoxName: string;
  cashBoxCurrency: string;
  currentBalance: number;
  transactionCurrency?: string;
  className?: string;
}

export function CashBoxCurrencyInfo({
  cashBoxName,
  cashBoxCurrency,
  currentBalance,
  transactionCurrency,
  className,
}: CashBoxCurrencyInfoProps) {
  const currencyMismatch = transactionCurrency && transactionCurrency !== cashBoxCurrency;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{cashBoxName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{cashBoxCurrency}</Badge>
          <span className="font-bold">
            {currentBalance.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {currencyMismatch && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            عملة الصندوق ({cashBoxCurrency}) لا تتوافق مع عملة المعاملة ({transactionCurrency}).
            يرجى اختيار صندوق بنفس العملة.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface CashBoxSelectorWithCurrencyProps {
  cashBoxes: Array<{
    id: string;
    box_name: string;
    currency_code: string;
    current_balance: number;
  }>;
  selectedCashBoxId: string;
  transactionCurrency: string;
  onSelect: (cashBoxId: string) => void;
  className?: string;
}

export function CashBoxSelectorWithCurrency({
  cashBoxes,
  selectedCashBoxId,
  transactionCurrency,
  onSelect,
  className,
}: CashBoxSelectorWithCurrencyProps) {
  // Filter cash boxes by transaction currency
  const compatibleCashBoxes = cashBoxes.filter(
    (cb) => cb.currency_code === transactionCurrency
  );

  const incompatibleCashBoxes = cashBoxes.filter(
    (cb) => cb.currency_code !== transactionCurrency
  );

  return (
    <div className={cn("space-y-2", className)}>
      {compatibleCashBoxes.length === 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            لا يوجد صندوق نقدي بعملة {transactionCurrency}. يرجى إنشاء صندوق جديد بهذه العملة.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">
            الصناديق المتوافقة ({transactionCurrency}):
          </span>
          <div className="grid gap-2">
            {compatibleCashBoxes.map((cashBox) => (
              <div
                key={cashBox.id}
                onClick={() => onSelect(cashBox.id)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedCashBoxId === cashBox.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  <span>{cashBox.box_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{cashBox.currency_code}</Badge>
                  <span className="font-medium">
                    {cashBox.current_balance.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {incompatibleCashBoxes.length > 0 && (
        <div className="space-y-2 opacity-50">
          <span className="text-sm text-muted-foreground">
            صناديق بعملات أخرى (غير متوافقة):
          </span>
          <div className="grid gap-2">
            {incompatibleCashBoxes.map((cashBox) => (
              <div
                key={cashBox.id}
                className="flex items-center justify-between p-3 rounded-lg border cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  <span>{cashBox.box_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{cashBox.currency_code}</Badge>
                  <span className="text-muted-foreground">
                    {cashBox.current_balance.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
