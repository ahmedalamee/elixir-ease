import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface OrderItem {
  product_id?: string;
  product_name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_percent?: number;
}

interface OrderPayload {
  external_order_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  shipping_address?: string;
  shipping_city?: string;
  order_type?: "retail" | "wholesale";
  payment_method?: string;
  payment_status?: "pending" | "paid" | "partially_paid";
  currency_code?: string;
  exchange_rate?: number;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  shipping_amount?: number;
  total_amount: number;
  notes?: string;
  items: OrderItem[];
}

interface WholesaleRequestPayload {
  company_name: string;
  company_name_en?: string;
  contact_name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  commercial_register_number?: string;
  commercial_register_image?: string;
  national_id_number?: string;
  national_id_image?: string;
  tax_number?: string;
  notes?: string;
}

interface CustomerPayload {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  customer_type?: "retail" | "wholesale";
  external_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("ECOMMERCE_WEBHOOK_SECRET");

    // Verify webhook secret if configured
    const requestSecret = req.headers.get("x-webhook-secret");
    if (webhookSecret && requestSecret !== webhookSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const body = await req.json();

    let result;

    switch (action) {
      case "order":
        result = await handleOrder(supabase, body as OrderPayload);
        break;
      case "wholesale_request":
        result = await handleWholesaleRequest(supabase, body as WholesaleRequestPayload);
        break;
      case "customer":
        result = await handleCustomer(supabase, body as CustomerPayload);
        break;
      case "sync_inventory":
        result = await syncInventory(supabase, body);
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: order, wholesale_request, customer, or sync_inventory" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Log sync
    await supabase.from("ecommerce_sync_log").insert({
      sync_type: action === "wholesale_request" ? "customer" : action,
      external_id: body.external_order_id || body.external_id || null,
      internal_id: result.id,
      action: "create",
      status: "success",
      request_data: body,
      response_data: result,
    });

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleOrder(supabase: any, payload: OrderPayload) {
  // Generate order number
  const { data: orderNumber } = await supabase.rpc("generate_ecommerce_order_number");

  const exchangeRate = payload.exchange_rate || 1;
  const currencyCode = payload.currency_code || "YER";

  // Calculate BC amounts
  const subtotalFc = payload.subtotal || 0;
  const subtotalBc = subtotalFc * exchangeRate;
  const discountFc = payload.discount_amount || 0;
  const discountBc = discountFc * exchangeRate;
  const taxFc = payload.tax_amount || 0;
  const taxBc = taxFc * exchangeRate;
  const shippingFc = payload.shipping_amount || 0;
  const shippingBc = shippingFc * exchangeRate;
  const totalFc = payload.total_amount;
  const totalBc = totalFc * exchangeRate;

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("ecommerce_orders")
    .insert({
      order_number: orderNumber,
      external_order_id: payload.external_order_id,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      customer_phone: payload.customer_phone,
      shipping_address: payload.shipping_address,
      shipping_city: payload.shipping_city,
      order_type: payload.order_type || "retail",
      payment_method: payload.payment_method,
      payment_status: payload.payment_status || "pending",
      currency_code: currencyCode,
      exchange_rate: exchangeRate,
      subtotal_fc: subtotalFc,
      subtotal_bc: subtotalBc,
      discount_amount_fc: discountFc,
      discount_amount_bc: discountBc,
      tax_amount_fc: taxFc,
      tax_amount_bc: taxBc,
      shipping_amount_fc: shippingFc,
      shipping_amount_bc: shippingBc,
      total_amount_fc: totalFc,
      total_amount_bc: totalBc,
      notes: payload.notes,
      source: "api",
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create order items
  if (payload.items && payload.items.length > 0) {
    const orderItems = payload.items.map((item) => {
      const unitPriceFc = item.unit_price;
      const unitPriceBc = unitPriceFc * exchangeRate;
      const discountPercent = item.discount_percent || 0;
      const taxPercent = item.tax_percent || 0;
      
      const baseAmount = unitPriceFc * item.quantity;
      const discountAmountFc = baseAmount * (discountPercent / 100);
      const taxAmountFc = (baseAmount - discountAmountFc) * (taxPercent / 100);
      const lineTotalFc = baseAmount - discountAmountFc + taxAmountFc;

      return {
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        unit_price_fc: unitPriceFc,
        unit_price_bc: unitPriceBc,
        discount_percent: discountPercent,
        discount_amount_fc: discountAmountFc,
        discount_amount_bc: discountAmountFc * exchangeRate,
        tax_percent: taxPercent,
        tax_amount_fc: taxAmountFc,
        tax_amount_bc: taxAmountFc * exchangeRate,
        line_total_fc: lineTotalFc,
        line_total_bc: lineTotalFc * exchangeRate,
      };
    });

    const { error: itemsError } = await supabase
      .from("ecommerce_order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;
  }

  return order;
}

async function handleWholesaleRequest(supabase: any, payload: WholesaleRequestPayload) {
  // Generate request number
  const { data: requestNumber } = await supabase.rpc("generate_wholesale_request_number");

  const { data: request, error } = await supabase
    .from("wholesale_account_requests")
    .insert({
      request_number: requestNumber,
      company_name: payload.company_name,
      company_name_en: payload.company_name_en,
      contact_name: payload.contact_name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      city: payload.city,
      commercial_register_number: payload.commercial_register_number,
      commercial_register_image: payload.commercial_register_image,
      national_id_number: payload.national_id_number,
      national_id_image: payload.national_id_image,
      tax_number: payload.tax_number,
      notes: payload.notes,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return request;
}

async function handleCustomer(supabase: any, payload: CustomerPayload) {
  // Check if customer exists by phone
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", payload.phone)
    .single();

  if (existing) {
    // Update existing customer
    const { data: customer, error } = await supabase
      .from("customers")
      .update({
        name: payload.name,
        email: payload.email,
        address: payload.address,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return customer;
  }

  // Create new customer
  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      customer_type: payload.customer_type || "retail",
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return customer;
}

async function syncInventory(supabase: any, payload: { products: Array<{ product_id: string; available: boolean }> }) {
  const updates = payload.products.map(async (p) => {
    await supabase
      .from("ecommerce_products")
      .update({ is_available: p.available })
      .eq("product_id", p.product_id);
  });

  await Promise.all(updates);
  return { synced: payload.products.length };
}
