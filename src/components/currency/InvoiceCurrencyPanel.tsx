import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { ExchangeRateDisplay } from "./ExchangeRateDisplay";
import { getExchangeRate, getBaseCurrencyCode } from "@/lib/currency";

interface InvoiceCurrencyPanelProps {
  currencyCode: string;
  onCurrencyChange: (currency: string, rate: number) => void;
  invoiceDate: string;
  customerCurrency?: string | null;
  isLocked?: boolean;
  className?: string;
}

export function InvoiceCurrencyPanel({
  currencyCode,
  onCurrencyChange,
  invoiceDate,
  customerCurrency,
  isLocked = false,
  className,
}: InvoiceCurrencyPanelProps) {
  const [baseCurrency, setBaseCurrency] = useState<string>("YER");
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [rateError, setRateError] = useState<string | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  useEffect(() => {
    loadBaseCurrency();
  }, []);

  useEffect(() => {
    if (currencyCode && baseCurrency) {
      fetchRate();
    }
  }, [currencyCode, invoiceDate, baseCurrency]);

  const loadBaseCurrency = async () => {
    try {
      const base = await getBaseCurrencyCode();
      setBaseCurrency(base);
    } catch (error) {
      console.error("Error loading base currency:", error);
      // Default to YER if error
      setBaseCurrency("YER");
    }
  };

  const fetchRate = useCallback(async () => {
    // Base currency (YER) always has rate = 1
    if (currencyCode === baseCurrency) {
      setExchangeRate(1);
      setRateError(null);
      onCurrencyChange(currencyCode, 1);
      return;
    }

    setIsLoadingRate(true);
    setRateError(null);

    try {
      const rate = await getExchangeRate(currencyCode, baseCurrency, invoiceDate);
      setExchangeRate(rate);
      onCurrencyChange(currencyCode, rate);
    } catch (error: any) {
      setRateError("سعر الصرف غير متوفر لهذا التاريخ");
      setExchangeRate(0);
    } finally {
      setIsLoadingRate(false);
    }
  }, [currencyCode, baseCurrency, invoiceDate, onCurrencyChange]);

  const handleCurrencyChange = (currency: string, rate: number) => {
    // Force rate = 1 for base currency
    const effectiveRate = currency === baseCurrency ? 1 : rate;
    setExchangeRate(effectiveRate);
    onCurrencyChange(currency, effectiveRate);
  };

  const showCurrencyMismatchWarning = customerCurrency && customerCurrency !== currencyCode;
  const isBaseCurrency = currencyCode === baseCurrency;

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>العملة</Label>
          <CurrencySelect
            value={currencyCode}
            onChange={handleCurrencyChange}
            date={invoiceDate}
            disabled={isLocked}
            showRate={false}
          />
        </div>

        {/* Only show exchange rate display for non-base currencies */}
        {!isBaseCurrency && (
          <ExchangeRateDisplay
            fromCurrency={currencyCode}
            toCurrency={baseCurrency}
            rate={exchangeRate}
            isLocked={isLocked}
            isLoading={isLoadingRate}
            error={rateError}
            onRefresh={fetchRate}
            showRefreshButton={!isLocked}
          />
        )}

        {showCurrencyMismatchWarning && (
          <Alert variant="default" className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              تنبيه: عملة الفاتورة ({currencyCode}) مختلفة عن العملة الافتراضية للعميل ({customerCurrency})
            </AlertDescription>
          </Alert>
        )}

        {rateError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {rateError} - لا يمكن ترحيل الفاتورة بدون سعر صرف صالح
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
