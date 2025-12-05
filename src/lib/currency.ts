import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface Currency {
  code: string;
  name: string;
  name_en: string | null;
  symbol: string | null;
  precision: number;
  is_active: boolean;
  is_base: boolean;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
  created_by: string | null;
  created_at: string;
  notes: string | null;
}

export interface ExchangeRateInsert {
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
  notes?: string;
}

// ============================================================================
// CURRENCY FUNCTIONS
// ============================================================================

/**
 * Fetch all active currencies
 */
export async function fetchCurrencies(includeInactive = false): Promise<Currency[]> {
  let query = supabase
    .from("currencies")
    .select("*")
    .order("code");

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching currencies:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get the base currency (YER)
 */
export async function getBaseCurrency(): Promise<Currency | null> {
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .eq("is_base", true)
    .single();

  if (error) {
    console.error("Error fetching base currency:", error);
    return null;
  }

  return data;
}

/**
 * Get base currency code (cached for performance)
 */
let cachedBaseCurrency: string | null = null;

export async function getBaseCurrencyCode(): Promise<string> {
  if (cachedBaseCurrency) return cachedBaseCurrency;
  
  const base = await getBaseCurrency();
  cachedBaseCurrency = base?.code || "YER";
  return cachedBaseCurrency;
}

// ============================================================================
// EXCHANGE RATE FUNCTIONS
// ============================================================================

/**
 * Fetch exchange rate for a specific date
 * Uses database function for consistency
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date: string = new Date().toISOString().split("T")[0]
): Promise<number> {
  // Same currency = 1.0
  if (fromCurrency === toCurrency) {
    return 1.0;
  }

  const { data, error } = await supabase.rpc("get_exchange_rate", {
    p_from_currency: fromCurrency,
    p_to_currency: toCurrency,
    p_date: date,
  });

  if (error) {
    console.error("Error fetching exchange rate:", error);
    throw new Error(`لا يوجد سعر صرف لـ ${fromCurrency}/${toCurrency} بتاريخ ${date}`);
  }

  return data;
}

/**
 * Convert amount to base currency
 */
export async function convertToBaseCurrency(
  amount: number,
  fromCurrency: string,
  date: string = new Date().toISOString().split("T")[0]
): Promise<{ amountBC: number; rate: number }> {
  const baseCurrency = await getBaseCurrencyCode();
  
  if (fromCurrency === baseCurrency) {
    return { amountBC: amount, rate: 1.0 };
  }

  const rate = await getExchangeRate(fromCurrency, baseCurrency, date);
  return {
    amountBC: amount * rate,
    rate,
  };
}

/**
 * Fetch all exchange rates
 */
export async function fetchExchangeRates(filters?: {
  fromCurrency?: string;
  toCurrency?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ExchangeRate[]> {
  let query = supabase
    .from("exchange_rates")
    .select("*")
    .order("effective_date", { ascending: false });

  if (filters?.fromCurrency) {
    query = query.eq("from_currency", filters.fromCurrency);
  }

  if (filters?.toCurrency) {
    query = query.eq("to_currency", filters.toCurrency);
  }

  if (filters?.startDate) {
    query = query.gte("effective_date", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("effective_date", filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching exchange rates:", error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch latest exchange rates (one per currency pair)
 */
export async function fetchLatestExchangeRates(): Promise<ExchangeRate[]> {
  const { data, error } = await supabase
    .from("vw_latest_exchange_rates")
    .select("*");

  if (error) {
    console.error("Error fetching latest exchange rates:", error);
    throw error;
  }

  // Map view data to full ExchangeRate type
  return (data || []).map((row: any) => ({
    id: row.id,
    from_currency: row.from_currency,
    to_currency: row.to_currency,
    rate: row.rate,
    effective_date: row.effective_date,
    created_by: null,
    created_at: row.created_at,
    notes: null,
  }));
}

/**
 * Create new exchange rate
 */
export async function createExchangeRate(rate: ExchangeRateInsert): Promise<ExchangeRate> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .insert(rate)
    .select()
    .single();

  if (error) {
    console.error("Error creating exchange rate:", error);
    if (error.code === "23505") {
      throw new Error("سعر الصرف موجود مسبقاً لهذا التاريخ");
    }
    throw error;
  }

  return data;
}

/**
 * Update exchange rate
 */
export async function updateExchangeRate(
  id: string,
  updates: Partial<ExchangeRateInsert>
): Promise<ExchangeRate> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating exchange rate:", error);
    throw error;
  }

  return data;
}

/**
 * Delete exchange rate
 */
export async function deleteExchangeRate(id: string): Promise<void> {
  const { error } = await supabase
    .from("exchange_rates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting exchange rate:", error);
    throw error;
  }
}

// ============================================================================
// FX GAIN/LOSS FUNCTIONS
// ============================================================================

/**
 * Calculate realized FX gain/loss when settling an invoice
 * @param originalAmountFC - Original invoice amount in foreign currency
 * @param originalRate - Exchange rate at invoice date
 * @param settlementAmountFC - Payment amount in foreign currency
 * @param settlementRate - Exchange rate at payment date
 * @returns Positive = gain, Negative = loss
 */
export function calculateFxGainLoss(
  originalAmountFC: number,
  originalRate: number,
  settlementAmountFC: number,
  settlementRate: number
): number {
  const originalBC = originalAmountFC * originalRate;
  const settlementBC = settlementAmountFC * settlementRate;
  return settlementBC - originalBC;
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format amount with currency symbol
 */
export function formatCurrency(
  amount: number,
  currency: Currency | null,
  showSymbol = true
): string {
  const precision = currency?.precision ?? 2;
  const formatted = amount.toLocaleString("ar-YE", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });

  if (showSymbol && currency?.symbol) {
    return `${formatted} ${currency.symbol}`;
  }

  return formatted;
}

/**
 * Format amount with currency code
 */
export function formatCurrencyWithCode(
  amount: number,
  currencyCode: string,
  precision = 2
): string {
  const formatted = amount.toLocaleString("ar-YE", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });

  return `${formatted} ${currencyCode}`;
}
