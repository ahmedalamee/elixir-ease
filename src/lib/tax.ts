import { supabase } from '@/integrations/supabase/client';

// Cache for tax rates
let cachedTaxRate: number | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get the default tax rate from the database
 * Returns rate as decimal (e.g., 0.15 for 15%)
 */
export async function getDefaultTaxRate(): Promise<number> {
  // Check cache
  if (cachedTaxRate !== null && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedTaxRate;
  }

  try {
    const { data, error } = await supabase
      .from('taxes')
      .select('rate')
      .eq('is_active', true)
      .eq('tax_code', 'VAT15')
      .single();

    if (error || !data) {
      console.warn('Could not fetch tax rate, using default 15%');
      cachedTaxRate = 0.15;
    } else {
      cachedTaxRate = Number(data.rate) / 100;
    }
    
    cacheTimestamp = Date.now();
    return cachedTaxRate;
  } catch (error) {
    console.error('Error fetching tax rate:', error);
    return 0.15; // Fallback to 15%
  }
}

/**
 * Get all active taxes
 */
export async function getActiveTaxes() {
  const { data, error } = await supabase
    .from('taxes')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching taxes:', error);
    return [];
  }

  return data || [];
}

/**
 * Get tax rate by tax code
 */
export async function getTaxRateByCode(taxCode: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('taxes')
      .select('rate')
      .eq('tax_code', taxCode)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return 0;
    }

    return Number(data.rate) / 100;
  } catch {
    return 0;
  }
}

/**
 * Clear the tax rate cache
 */
export function clearTaxCache(): void {
  cachedTaxRate = null;
  cacheTimestamp = null;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    'YER': 'ر.ي',
    'SAR': 'ر.س',
    'USD': '$',
    'EUR': '€',
    'AED': 'د.إ',
  };
  return symbols[currencyCode] || currencyCode;
}
