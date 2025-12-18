import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// PURCHASE REQUISITIONS
// ============================================================================

export interface PurchaseRequisition {
  id: string;
  pr_number: string;
  warehouse_id: string;
  requested_by?: string | null;
  department?: string | null;
  priority: string;
  status: string;
  currency_code: string;
  exchange_rate: number;
  subtotal_fc: number;
  subtotal_bc: number;
  discount_fc: number;
  discount_bc: number;
  tax_fc: number;
  tax_bc: number;
  total_fc: number;
  total_bc: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  warehouses?: { name: string } | null;
}

export interface PRItem {
  id?: string;
  pr_id: string;
  product_id: string;
  uom_id?: string | null;
  requested_qty: number;
  estimated_unit_cost_fc?: number | null;
  line_total_fc: number;
  line_total_bc: number;
  notes?: string | null;
  products?: { name: string; name_en?: string | null } | null;
  uoms?: { name: string; name_en?: string | null } | null;
}

export async function fetchPurchaseRequisitions(filters?: {
  status?: string;
  warehouseId?: string;
  search?: string;
}): Promise<PurchaseRequisition[]> {
  let query = supabase
    .from("purchase_requisitions")
    .select(`*, warehouses(name)`)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.warehouseId && filters.warehouseId !== "all") {
    query = query.eq("warehouse_id", filters.warehouseId);
  }

  if (filters?.search) {
    query = query.ilike("pr_number", `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as PurchaseRequisition[];
}

export async function fetchPurchaseRequisitionById(id: string): Promise<PurchaseRequisition | null> {
  const { data, error } = await supabase
    .from("purchase_requisitions")
    .select(`*, warehouses(name)`)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as PurchaseRequisition;
}

export async function fetchPRItems(prId: string): Promise<PRItem[]> {
  const { data, error } = await supabase
    .from("pr_items")
    .select(`*, products(name, name_en), uoms(name, name_en)`)
    .eq("pr_id", prId)
    .order("created_at");

  if (error) throw error;
  return (data || []) as unknown as PRItem[];
}

export async function createPurchaseRequisition(pr: Partial<PurchaseRequisition>): Promise<PurchaseRequisition> {
  const insertData = {
    pr_number: pr.pr_number,
    warehouse_id: pr.warehouse_id,
    requested_by: pr.requested_by,
    department: pr.department,
    priority: pr.priority || 'normal',
    status: pr.status || 'draft',
    currency_code: pr.currency_code || 'YER',
    exchange_rate: pr.exchange_rate || 1,
    subtotal_fc: pr.subtotal_fc || 0,
    subtotal_bc: pr.subtotal_bc || 0,
    discount_fc: pr.discount_fc || 0,
    discount_bc: pr.discount_bc || 0,
    tax_fc: pr.tax_fc || 0,
    tax_bc: pr.tax_bc || 0,
    total_fc: pr.total_fc || 0,
    total_bc: pr.total_bc || 0,
    notes: pr.notes,
  };

  const { data, error } = await supabase
    .from("purchase_requisitions")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as PurchaseRequisition;
}

export async function updatePurchaseRequisition(id: string, updates: Partial<PurchaseRequisition>): Promise<void> {
  const { error } = await supabase
    .from("purchase_requisitions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function createPRItems(items: Array<{
  pr_id: string;
  product_id: string;
  requested_qty: number;
  uom_id?: string | null;
  estimated_unit_cost_fc?: number | null;
  line_total_fc?: number;
  line_total_bc?: number;
  notes?: string | null;
}>): Promise<void> {
  const { error } = await supabase.from("pr_items").insert(items);
  if (error) throw error;
}

export async function deletePRItems(prId: string): Promise<void> {
  const { error } = await supabase.from("pr_items").delete().eq("pr_id", prId);
  if (error) throw error;
}

export async function submitPR(prId: string): Promise<{ success: boolean; message?: string }> {
  const { data, error } = await supabase.rpc("submit_pr", { p_pr_id: prId });
  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function convertPRToRFQ(prId: string): Promise<{ success: boolean; rfqId?: string; message?: string }> {
  const { data, error } = await supabase.rpc("convert_pr_to_rfq", { p_pr_id: prId });
  if (error) return { success: false, message: error.message };
  return { success: true, rfqId: data as string };
}

export async function convertPRToPO(prId: string, supplierId: string): Promise<{ success: boolean; poId?: string; message?: string }> {
  const { data, error } = await supabase.rpc("convert_pr_to_po", { 
    p_pr_id: prId, 
    p_supplier_id: supplierId 
  });
  if (error) return { success: false, message: error.message };
  return { success: true, poId: data as string };
}

// ============================================================================
// RFQ
// ============================================================================

export interface RFQRequest {
  id: string;
  rfq_number: string;
  pr_id?: string | null;
  status: string;
  submission_deadline?: string | null;
  notes?: string | null;
  currency_code: string;
  created_at: string;
  updated_at: string;
  purchase_requisitions?: { pr_number: string } | null;
}

export interface RFQSupplier {
  id: string;
  rfq_id: string;
  supplier_id: string;
  response_status: string;
  invited_at?: string | null;
  suppliers?: { name: string; currency_code?: string | null } | null;
}

export interface RFQQuote {
  id: string;
  rfq_id: string;
  supplier_id: string;
  quote_number?: string | null;
  status: string;
  currency_code: string;
  exchange_rate: number;
  subtotal_fc: number;
  subtotal_bc: number;
  discount_fc: number;
  discount_bc: number;
  tax_fc: number;
  tax_bc: number;
  total_fc: number;
  total_bc: number;
  payment_terms?: string | null;
  delivery_days?: number | null;
  validity_days?: number | null;
  notes?: string | null;
  is_winner: boolean;
  created_at: string;
  suppliers?: { name: string } | null;
}

export interface RFQQuoteItem {
  id: string;
  quote_id: string;
  product_id: string;
  uom_id?: string | null;
  quantity: number;
  unit_price_fc: number;
  line_total_fc: number;
  line_total_bc: number;
  notes?: string | null;
  products?: { name: string } | null;
}

export async function fetchRFQRequests(filters?: {
  status?: string;
  search?: string;
}): Promise<RFQRequest[]> {
  let query = supabase
    .from("rfq_requests")
    .select(`*, purchase_requisitions(pr_number)`)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    query = query.ilike("rfq_number", `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as RFQRequest[];
}

export async function fetchRFQById(id: string): Promise<RFQRequest | null> {
  const { data, error } = await supabase
    .from("rfq_requests")
    .select(`*, purchase_requisitions(pr_number)`)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as RFQRequest;
}

export async function fetchRFQSuppliers(rfqId: string): Promise<RFQSupplier[]> {
  const { data, error } = await supabase
    .from("rfq_suppliers")
    .select(`*, suppliers(name, currency_code)`)
    .eq("rfq_id", rfqId);

  if (error) throw error;
  return (data || []) as unknown as RFQSupplier[];
}

export async function fetchRFQQuotes(rfqId: string): Promise<RFQQuote[]> {
  const { data, error } = await supabase
    .from("rfq_quotes")
    .select(`*, suppliers(name)`)
    .eq("rfq_id", rfqId)
    .order("total_bc");

  if (error) throw error;
  return (data || []) as unknown as RFQQuote[];
}

export async function fetchQuoteItems(quoteId: string): Promise<RFQQuoteItem[]> {
  const { data, error } = await supabase
    .from("rfq_quote_items")
    .select(`*, products(name)`)
    .eq("quote_id", quoteId);

  if (error) throw error;
  return (data || []) as unknown as RFQQuoteItem[];
}

export async function createRFQRequest(rfq: Partial<RFQRequest>): Promise<RFQRequest> {
  const insertData = {
    rfq_number: rfq.rfq_number!,
    pr_id: rfq.pr_id,
    status: rfq.status || 'draft',
    submission_deadline: rfq.submission_deadline,
    notes: rfq.notes,
    currency_code: rfq.currency_code || 'YER',
  };

  const { data, error } = await supabase
    .from("rfq_requests")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as RFQRequest;
}

export async function addRFQSuppliers(rfqId: string, supplierIds: string[]): Promise<void> {
  const items = supplierIds.map(supplierId => ({
    rfq_id: rfqId,
    supplier_id: supplierId,
    response_status: "invited",
    invited_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("rfq_suppliers").insert(items);
  if (error) throw error;
}

export async function createRFQQuote(quote: Partial<RFQQuote>): Promise<RFQQuote> {
  const insertData = {
    rfq_id: quote.rfq_id!,
    supplier_id: quote.supplier_id!,
    quote_number: quote.quote_number,
    status: quote.status || 'draft',
    currency_code: quote.currency_code || 'YER',
    exchange_rate: quote.exchange_rate || 1,
    subtotal_fc: quote.subtotal_fc || 0,
    subtotal_bc: quote.subtotal_bc || 0,
    discount_fc: quote.discount_fc || 0,
    discount_bc: quote.discount_bc || 0,
    tax_fc: quote.tax_fc || 0,
    tax_bc: quote.tax_bc || 0,
    total_fc: quote.total_fc || 0,
    total_bc: quote.total_bc || 0,
    payment_terms: quote.payment_terms,
    delivery_days: quote.delivery_days,
    validity_days: quote.validity_days,
    notes: quote.notes,
    is_winner: quote.is_winner || false,
  };

  const { data, error } = await supabase
    .from("rfq_quotes")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as RFQQuote;
}

export async function createQuoteItems(items: Array<{
  quote_id: string;
  product_id: string;
  quantity: number;
  unit_price_fc: number;
  uom_id?: string | null;
  line_total_fc?: number;
  line_total_bc?: number;
  notes?: string | null;
}>): Promise<void> {
  const { error } = await supabase.from("rfq_quote_items").insert(items);
  if (error) throw error;
}

export async function selectWinningQuote(quoteId: string): Promise<{ success: boolean; message?: string }> {
  // First get the quote to find the rfq_id
  const { data: quote, error: fetchError } = await supabase
    .from("rfq_quotes")
    .select("rfq_id")
    .eq("id", quoteId)
    .single();

  if (fetchError) return { success: false, message: fetchError.message };

  // Reset all quotes for this RFQ
  await supabase
    .from("rfq_quotes")
    .update({ is_winner: false, status: "received" })
    .eq("rfq_id", quote.rfq_id);

  // Mark the selected quote as winner
  const { error } = await supabase
    .from("rfq_quotes")
    .update({ is_winner: true, status: "selected" })
    .eq("id", quoteId);

  if (error) return { success: false, message: error.message };

  // Update RFQ status
  await supabase
    .from("rfq_requests")
    .update({ status: "awarded" })
    .eq("id", quote.rfq_id);

  return { success: true };
}

export async function convertQuoteToPO(quoteId: string): Promise<{ success: boolean; poId?: string; message?: string }> {
  const { data, error } = await supabase.rpc("convert_quote_to_po", { p_quote_id: quoteId });
  if (error) return { success: false, message: error.message };
  return { success: true, poId: data as string };
}

// ============================================================================
// APPROVALS
// ============================================================================

export interface ApprovalRequest {
  id: string;
  workflow_id: string;
  document_type: string;
  document_id: string;
  document_number?: string | null;
  status: string;
  current_step: number | null;
  total_steps: number | null;
  requested_by?: string | null;
  requested_at: string | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at: string | null;
  approval_workflows?: { workflow_name: string } | null;
}

export interface ApprovalHistory {
  id: string;
  request_id: string;
  step_id?: string | null;
  step_order: number | null;
  action: string;
  action_by?: string | null;
  action_at: string | null;
  comments?: string | null;
  approval_steps?: { step_name: string; approver_role: string } | null;
}

export async function fetchApprovalRequests(filters?: {
  status?: string;
  documentType?: string;
}): Promise<ApprovalRequest[]> {
  let query = supabase
    .from("approval_requests")
    .select(`*, approval_workflows(workflow_name)`)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.documentType && filters.documentType !== "all") {
    query = query.eq("document_type", filters.documentType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as ApprovalRequest[];
}

export async function fetchApprovalRequestById(id: string): Promise<ApprovalRequest | null> {
  const { data, error } = await supabase
    .from("approval_requests")
    .select(`*, approval_workflows(workflow_name)`)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as ApprovalRequest;
}

export async function fetchApprovalHistory(requestId: string): Promise<ApprovalHistory[]> {
  const { data, error } = await supabase
    .from("approval_history")
    .select(`*, approval_steps(step_name, approver_role)`)
    .eq("request_id", requestId)
    .order("step_order");

  if (error) throw error;
  return (data || []) as unknown as ApprovalHistory[];
}

export async function approveStep(requestId: string, comments?: string): Promise<{ success: boolean; message?: string }> {
  const { data, error } = await supabase.rpc("approve_approval_step", { 
    p_request_id: requestId,
    p_comments: comments || null
  });
  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function rejectApprovalRequest(requestId: string, reason: string): Promise<{ success: boolean; message?: string }> {
  const { data, error } = await supabase.rpc("reject_approval_request", { 
    p_request_id: requestId,
    p_reason: reason
  });
  if (error) return { success: false, message: error.message };
  return { success: true };
}

// ============================================================================
// HELPERS
// ============================================================================

export async function generatePRNumber(): Promise<string> {
  const { data, error } = await supabase.rpc("generate_pr_number");
  if (error) throw error;
  return data as string;
}

export async function generateRFQNumber(): Promise<string> {
  const { data, error } = await supabase.rpc("generate_rfq_number");
  if (error) throw error;
  return data as string;
}
