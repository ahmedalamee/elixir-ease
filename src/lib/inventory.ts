/**
 * Inventory Management & FIFO Costing Engine
 * محرك إدارة المخزون وتكلفة FIFO
 */

import { supabase } from "@/integrations/supabase/client";

// =====================================================
// Types / الأنواع
// =====================================================

export interface CostLayer {
  id: string;
  product_id: string;
  warehouse_id: string;
  batch_number: string | null;
  unit_cost: number;
  quantity_original: number;
  quantity_remaining: number;
  source_document_type: string;
  source_document_id: string | null;
  source_document_number: string | null;
  received_date: string;
  expiry_date: string | null;
  created_at: string;
}

export interface FifoAllocation {
  layer_id: string;
  quantity_allocated: number;
  unit_cost: number;
  total_cost: number;
  batch_number: string | null;
}

export interface InventoryValuation {
  product_id: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  total_quantity: number;
  total_value: number;
  average_cost: number;
  layer_count: number;
}

export interface AddCostLayerParams {
  productId: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string | null;
  sourceType?: string;
  sourceId?: string | null;
  sourceNumber?: string | null;
  expiryDate?: string | null;
}

// =====================================================
// FIFO Cost Allocation / تخصيص تكلفة FIFO
// =====================================================

/**
 * Get FIFO cost allocation without consuming layers
 * الحصول على تخصيص تكلفة FIFO بدون استهلاك الطبقات
 */
export async function allocateFifoCost(
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<FifoAllocation[]> {
  const { data, error } = await supabase.rpc('allocate_fifo_cost', {
    p_product_id: productId,
    p_warehouse_id: warehouseId,
    p_quantity: quantity
  });

  if (error) {
    console.error('Error allocating FIFO cost:', error);
    throw new Error(`فشل في حساب تكلفة FIFO: ${error.message}`);
  }

  return (data || []).map((item: any) => ({
    layer_id: item.layer_id,
    quantity_allocated: Number(item.quantity_allocated),
    unit_cost: Number(item.unit_cost),
    total_cost: Number(item.total_cost),
    batch_number: item.batch_number
  }));
}

/**
 * Consume FIFO layers and return total COGS
 * استهلاك طبقات FIFO وإرجاع إجمالي تكلفة البضاعة المباعة
 */
export async function consumeFifoLayers(
  productId: string,
  warehouseId: string,
  quantity: number,
  referenceType: string,
  referenceId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('consume_fifo_layers', {
    p_product_id: productId,
    p_warehouse_id: warehouseId,
    p_quantity: quantity,
    p_reference_type: referenceType,
    p_reference_id: referenceId
  });

  if (error) {
    console.error('Error consuming FIFO layers:', error);
    throw new Error(`فشل في استهلاك طبقات التكلفة: ${error.message}`);
  }

  return Number(data) || 0;
}

/**
 * Calculate total COGS for multiple items
 * حساب إجمالي تكلفة البضاعة المباعة لعدة منتجات
 */
export async function calculateTotalCogs(
  items: Array<{ productId: string; warehouseId: string; quantity: number }>
): Promise<{ totalCogs: number; allocations: Map<string, FifoAllocation[]> }> {
  let totalCogs = 0;
  const allocations = new Map<string, FifoAllocation[]>();

  for (const item of items) {
    const allocation = await allocateFifoCost(
      item.productId,
      item.warehouseId,
      item.quantity
    );
    
    const itemCogs = allocation.reduce((sum, a) => sum + a.total_cost, 0);
    totalCogs += itemCogs;
    allocations.set(item.productId, allocation);
  }

  return { totalCogs, allocations };
}

// =====================================================
// Cost Layer Management / إدارة طبقات التكلفة
// =====================================================

/**
 * Add a new cost layer (on purchase/GRN)
 * إضافة طبقة تكلفة جديدة (عند الشراء/استلام البضاعة)
 */
export async function addCostLayer(params: AddCostLayerParams): Promise<string> {
  const { data, error } = await supabase.rpc('add_cost_layer', {
    p_product_id: params.productId,
    p_warehouse_id: params.warehouseId,
    p_quantity: params.quantity,
    p_unit_cost: params.unitCost,
    p_batch_number: params.batchNumber || null,
    p_source_type: params.sourceType || 'purchase_invoice',
    p_source_id: params.sourceId || null,
    p_source_number: params.sourceNumber || null,
    p_expiry_date: params.expiryDate || null
  });

  if (error) {
    console.error('Error adding cost layer:', error);
    throw new Error(`فشل في إضافة طبقة التكلفة: ${error.message}`);
  }

  return data as string;
}

/**
 * Get cost layers for a product
 * الحصول على طبقات التكلفة لمنتج
 */
export async function getCostLayers(
  productId: string,
  warehouseId?: string,
  includeEmpty: boolean = false
): Promise<CostLayer[]> {
  let query = supabase
    .from('inventory_cost_layers')
    .select('*')
    .eq('product_id', productId)
    .order('received_date', { ascending: true });

  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId);
  }

  if (!includeEmpty) {
    query = query.gt('quantity_remaining', 0);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching cost layers:', error);
    throw new Error(`فشل في جلب طبقات التكلفة: ${error.message}`);
  }

  return data || [];
}

// =====================================================
// Inventory Valuation / تقييم المخزون
// =====================================================

/**
 * Get inventory valuation report
 * الحصول على تقرير تقييم المخزون
 */
export async function getInventoryValuation(
  warehouseId?: string
): Promise<InventoryValuation[]> {
  const { data, error } = await supabase.rpc('get_inventory_valuation', {
    p_warehouse_id: warehouseId || null
  });

  if (error) {
    console.error('Error fetching inventory valuation:', error);
    throw new Error(`فشل في جلب تقييم المخزون: ${error.message}`);
  }

  return (data || []).map((item: any) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    warehouse_id: item.warehouse_id,
    warehouse_name: item.warehouse_name,
    total_quantity: Number(item.total_quantity),
    total_value: Number(item.total_value),
    average_cost: Number(item.average_cost),
    layer_count: Number(item.layer_count)
  }));
}

/**
 * Get total inventory value
 * الحصول على إجمالي قيمة المخزون
 */
export async function getTotalInventoryValue(
  warehouseId?: string
): Promise<number> {
  const valuation = await getInventoryValuation(warehouseId);
  return valuation.reduce((sum, item) => sum + item.total_value, 0);
}

/**
 * Get product average cost
 * الحصول على متوسط تكلفة المنتج
 */
export async function getProductAverageCost(
  productId: string,
  warehouseId?: string
): Promise<number> {
  const valuation = await getInventoryValuation(warehouseId);
  const productValuation = valuation.find(v => v.product_id === productId);
  return productValuation?.average_cost || 0;
}

// =====================================================
// Stock Availability / توفر المخزون
// =====================================================

/**
 * Check if sufficient stock is available
 * التحقق من توفر مخزون كافٍ
 */
export async function checkStockAvailability(
  productId: string,
  warehouseId: string,
  requiredQuantity: number
): Promise<{ available: boolean; currentQuantity: number; shortage: number }> {
  const { data, error } = await supabase
    .from('inventory_cost_layers')
    .select('quantity_remaining')
    .eq('product_id', productId)
    .eq('warehouse_id', warehouseId)
    .gt('quantity_remaining', 0);

  if (error) {
    console.error('Error checking stock availability:', error);
    throw new Error(`فشل في التحقق من توفر المخزون: ${error.message}`);
  }

  const currentQuantity = (data || []).reduce(
    (sum, layer) => sum + Number(layer.quantity_remaining),
    0
  );

  const shortage = Math.max(0, requiredQuantity - currentQuantity);

  return {
    available: currentQuantity >= requiredQuantity,
    currentQuantity,
    shortage
  };
}

/**
 * Check stock availability for multiple items
 * التحقق من توفر المخزون لعدة منتجات
 */
export async function checkMultipleStockAvailability(
  items: Array<{ productId: string; warehouseId: string; quantity: number }>
): Promise<{
  allAvailable: boolean;
  results: Array<{
    productId: string;
    available: boolean;
    currentQuantity: number;
    requiredQuantity: number;
    shortage: number;
  }>;
}> {
  const results = await Promise.all(
    items.map(async (item) => {
      const availability = await checkStockAvailability(
        item.productId,
        item.warehouseId,
        item.quantity
      );
      return {
        productId: item.productId,
        available: availability.available,
        currentQuantity: availability.currentQuantity,
        requiredQuantity: item.quantity,
        shortage: availability.shortage
      };
    })
  );

  const allAvailable = results.every((r) => r.available);

  return { allAvailable, results };
}

// =====================================================
// Expiry Management / إدارة انتهاء الصلاحية
// =====================================================

/**
 * Get expiring cost layers
 * الحصول على طبقات التكلفة المنتهية الصلاحية
 */
export async function getExpiringLayers(
  daysThreshold: number = 30,
  warehouseId?: string
): Promise<CostLayer[]> {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  let query = supabase
    .from('inventory_cost_layers')
    .select('*')
    .gt('quantity_remaining', 0)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', thresholdDate.toISOString().split('T')[0])
    .order('expiry_date', { ascending: true });

  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching expiring layers:', error);
    throw new Error(`فشل في جلب المنتجات المنتهية الصلاحية: ${error.message}`);
  }

  return data || [];
}

/**
 * Get expired cost layers
 * الحصول على طبقات التكلفة المنتهية
 */
export async function getExpiredLayers(
  warehouseId?: string
): Promise<CostLayer[]> {
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('inventory_cost_layers')
    .select('*')
    .gt('quantity_remaining', 0)
    .not('expiry_date', 'is', null)
    .lt('expiry_date', today)
    .order('expiry_date', { ascending: true });

  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching expired layers:', error);
    throw new Error(`فشل في جلب المنتجات المنتهية: ${error.message}`);
  }

  return data || [];
}
