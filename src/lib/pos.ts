import { supabase } from "@/integrations/supabase/client";

/**
 * Post POS session and create GL entries
 * This function calls the database function that:
 * - Aggregates all sales from the session
 * - Calculates COGS using FIFO
 * - Creates a balanced GL journal entry
 */
export async function postPosSession(
  sessionId: string,
  closingCash: number
): Promise<{
  success: boolean;
  journalEntryId?: string;
  journalEntryNumber?: string;
  totalCashSales?: number;
  totalCardSales?: number;
  totalCogs?: number;
  totalRevenue?: number;
  totalTax?: number;
  message: string;
}> {
  const { data, error } = await supabase.rpc("post_pos_session", {
    p_session_id: sessionId,
    p_closing_cash: closingCash,
  });

  if (error) {
    console.error("Error posting POS session:", error);
    throw new Error(error.message || "فشل ترحيل جلسة POS");
  }

  const result = data as {
    success: boolean;
    session_id: string;
    journal_entry_id?: string;
    journal_entry_number?: string;
    total_cash_sales?: number;
    total_card_sales?: number;
    total_cogs?: number;
    total_revenue?: number;
    total_tax?: number;
    message: string;
  };

  return {
    success: result.success,
    journalEntryId: result.journal_entry_id,
    journalEntryNumber: result.journal_entry_number,
    totalCashSales: result.total_cash_sales,
    totalCardSales: result.total_card_sales,
    totalCogs: result.total_cogs,
    totalRevenue: result.total_revenue,
    totalTax: result.total_tax,
    message: result.message,
  };
}

/**
 * Calculate POS session totals without posting
 */
export async function calculatePosSessionTotals(sessionId: string): Promise<{
  totalCash: number;
  totalCard: number;
  totalTax: number;
  totalSales: number;
  invoiceCount: number;
}> {
  const { data, error } = await supabase
    .from("sales_invoices")
    .select(`
      id,
      total_amount,
      tax_amount,
      payment_methods!inner(name)
    `)
    .eq("pos_session_id", sessionId)
    .eq("status", "posted");

  if (error) {
    console.error("Error calculating session totals:", error);
    throw new Error(error.message);
  }

  let totalCash = 0;
  let totalCard = 0;
  let totalTax = 0;

  (data || []).forEach((invoice: any) => {
    const paymentMethodName = invoice.payment_methods?.name?.toLowerCase() || "نقدي";
    const amount = invoice.total_amount || 0;
    const tax = invoice.tax_amount || 0;

    if (["نقدي", "cash", "نقد"].includes(paymentMethodName)) {
      totalCash += amount;
    } else {
      totalCard += amount;
    }
    totalTax += tax;
  });

  return {
    totalCash,
    totalCard,
    totalTax,
    totalSales: totalCash + totalCard,
    invoiceCount: data?.length || 0,
  };
}

/**
 * Check if session can be posted
 */
export async function canPostSession(sessionId: string): Promise<{
  canPost: boolean;
  reason?: string;
}> {
  const { data: session, error } = await supabase
    .from("pos_sessions")
    .select("status, is_posted")
    .eq("id", sessionId)
    .single();

  if (error) {
    return { canPost: false, reason: "فشل جلب بيانات الجلسة" };
  }

  if (session.status === "closed") {
    return { canPost: false, reason: "الجلسة مغلقة مسبقاً" };
  }

  if (session.is_posted) {
    return { canPost: false, reason: "الجلسة مرحلة مسبقاً" };
  }

  return { canPost: true };
}
