import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchCurrencies, getExchangeRate, getBaseCurrencyCode, validateExchangeRateBounds, Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface CurrencyPanelProps {
  currencyCode: string;
  exchangeRate: number;
  onCurrencyChange: (currency: string, rate: number) => void;
  date?: string;
  disabled?: boolean;
  className?: string;
}

export function CurrencyPanel({
  currencyCode,
  exchangeRate,
  onCurrencyChange,
  date = new Date().toISOString().split("T")[0],
  disabled = false,
  className,
}: CurrencyPanelProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string>("YER");
  const [isLoading, setIsLoading] = useState(false);
  const [localRate, setLocalRate] = useState(exchangeRate);
  const [rateWarning, setRateWarning] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [currList, base] = await Promise.all([
        fetchCurrencies(),
        getBaseCurrencyCode(),
      ]);
      setCurrencies(currList);
      setBaseCurrency(base);
    };
    loadData();
  }, []);

  useEffect(() => {
    setLocalRate(exchangeRate);
  }, [exchangeRate]);

  const isBaseCurrency = currencyCode === baseCurrency;

  const fetchRate = useCallback(async () => {
    if (isBaseCurrency) {
      onCurrencyChange(currencyCode, 1);
      return;
    }
    
    setIsLoading(true);
    try {
      const rate = await getExchangeRate(currencyCode, baseCurrency, date);
      setLocalRate(rate);
      onCurrencyChange(currencyCode, rate);
    } catch (error) {
      console.error("Error fetching rate:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currencyCode, baseCurrency, date, isBaseCurrency, onCurrencyChange]);

  const handleCurrencyChange = async (newCurrency: string) => {
    if (newCurrency === baseCurrency) {
      setLocalRate(1);
      onCurrencyChange(newCurrency, 1);
    } else {
      setIsLoading(true);
      try {
        const rate = await getExchangeRate(newCurrency, baseCurrency, date);
        setLocalRate(rate);
        onCurrencyChange(newCurrency, rate);
      } catch (error) {
        console.error("Error fetching rate:", error);
        setLocalRate(1);
        onCurrencyChange(newCurrency, 1);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRateChange = (value: string) => {
    const rate = parseFloat(value) || 1;
    setLocalRate(rate);
    
    // Validate rate bounds
    const boundsCheck = validateExchangeRateBounds(rate);
    if (!boundsCheck.valid) {
      setRateWarning(boundsCheck.message || null);
    } else {
      setRateWarning(null);
    }
    
    onCurrencyChange(currencyCode, rate);
  };

  return (
    <div className={cn("grid gap-4 p-4 border rounded-lg bg-muted/30", className)}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>العملة</Label>
          <Select
            value={currencyCode}
            onValueChange={handleCurrencyChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.code} - {curr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            سعر الصرف
            {isBaseCurrency && <Lock className="h-3 w-3 text-muted-foreground" />}
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={localRate}
              onChange={(e) => handleRateChange(e.target.value)}
              disabled={disabled || isBaseCurrency}
              className="flex-1"
            />
            {!isBaseCurrency && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={fetchRate}
                disabled={disabled || isLoading}
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {!isBaseCurrency && (
        <p className="text-xs text-muted-foreground">
          1 {currencyCode} = {localRate.toFixed(4)} {baseCurrency}
        </p>
      )}

      {rateWarning && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{rateWarning}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
