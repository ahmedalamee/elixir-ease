import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fetchCurrencies, getExchangeRate, type Currency } from "@/lib/currency";

interface CurrencySelectProps {
  value: string;
  onChange: (currency: string, exchangeRate: number) => void;
  date?: string;
  disabled?: boolean;
  showRate?: boolean;
  defaultToBase?: boolean;
}

export function CurrencySelect({
  value,
  onChange,
  date = new Date().toISOString().split("T")[0],
  disabled = false,
  showRate = true,
  defaultToBase = true,
}: CurrencySelectProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrencies();
  }, []);

  useEffect(() => {
    if (value) {
      loadExchangeRate(value);
    }
  }, [value, date]);

  const loadCurrencies = async () => {
    try {
      const data = await fetchCurrencies();
      setCurrencies(data);

      // Set default to base currency if no value
      if (defaultToBase && !value) {
        const baseCurrency = data.find((c) => c.is_base);
        if (baseCurrency) {
          onChange(baseCurrency.code, 1);
        }
      }
    } catch (error) {
      console.error("Error loading currencies:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadExchangeRate = async (currencyCode: string) => {
    try {
      setRateError(null);
      const baseCurrency = currencies.find((c) => c.is_base);
      
      if (!baseCurrency || currencyCode === baseCurrency.code) {
        setExchangeRate(1);
        return;
      }

      const rate = await getExchangeRate(currencyCode, baseCurrency.code, date);
      setExchangeRate(rate);
    } catch (error: any) {
      setRateError("سعر الصرف غير متوفر");
      setExchangeRate(0);
    }
  };

  const handleChange = async (newValue: string) => {
    try {
      setRateError(null);
      const baseCurrency = currencies.find((c) => c.is_base);
      
      if (!baseCurrency || newValue === baseCurrency.code) {
        setExchangeRate(1);
        onChange(newValue, 1);
        return;
      }

      const rate = await getExchangeRate(newValue, baseCurrency.code, date);
      setExchangeRate(rate);
      onChange(newValue, rate);
    } catch (error: any) {
      setRateError("سعر الصرف غير متوفر");
      setExchangeRate(0);
      onChange(newValue, 0);
    }
  };

  const selectedCurrency = currencies.find((c) => c.code === value);
  const baseCurrency = currencies.find((c) => c.is_base);

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={handleChange} disabled={disabled || loading}>
        <SelectTrigger>
          <SelectValue placeholder="اختر العملة">
            {selectedCurrency && (
              <span className="flex items-center gap-2">
                {selectedCurrency.symbol && (
                  <span className="text-muted-foreground">{selectedCurrency.symbol}</span>
                )}
                {selectedCurrency.name}
                {selectedCurrency.is_base && (
                  <Badge variant="secondary" className="mr-2 text-xs">أساسية</Badge>
                )}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {currencies.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              <span className="flex items-center gap-2">
                {currency.symbol && (
                  <span className="text-muted-foreground">{currency.symbol}</span>
                )}
                {currency.name} ({currency.code})
                {currency.is_base && (
                  <Badge variant="secondary" className="mr-2 text-xs">أساسية</Badge>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showRate && value && baseCurrency && value !== baseCurrency.code && (
        <div className="text-sm">
          {rateError ? (
            <span className="text-destructive">{rateError}</span>
          ) : (
            <span className="text-muted-foreground">
              سعر الصرف: 1 {value} = {exchangeRate.toFixed(2)} {baseCurrency.code}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
