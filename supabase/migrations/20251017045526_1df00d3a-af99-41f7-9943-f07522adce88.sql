-- إصلاح مشاكل الأمان - تفعيل RLS على الجداول المتبقية

-- Currencies
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All staff read currencies" ON public.currencies FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role]));
CREATE POLICY "Admin manage currencies" ON public.currencies FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Taxes
ALTER TABLE public.taxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All staff read taxes" ON public.taxes FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role, 'inventory_manager'::app_role]));
CREATE POLICY "Admin manage taxes" ON public.taxes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Warehouse Bins
ALTER TABLE public.warehouse_bins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All staff read bins" ON public.warehouse_bins FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]));
CREATE POLICY "Inventory manager manage bins" ON public.warehouse_bins FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));

-- Reorder Rules
ALTER TABLE public.reorder_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read reorder rules" ON public.reorder_rules FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));
CREATE POLICY "Inventory manager manage reorder rules" ON public.reorder_rules FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));

-- PO Items
ALTER TABLE public.po_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Purchasers read PO items" ON public.po_items FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));
CREATE POLICY "Inventory manager manage PO items" ON public.po_items FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));

-- GRN Items
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inventory staff read GRN items" ON public.grn_items FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));
CREATE POLICY "Inventory manager manage GRN items" ON public.grn_items FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'inventory_manager'::app_role]));

-- Purchase Invoices
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance staff read PI" ON public.purchase_invoices FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]));
CREATE POLICY "Finance manage PI" ON public.purchase_invoices FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- PI Items
ALTER TABLE public.pi_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance staff read PI items" ON public.pi_items FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'inventory_manager'::app_role]));
CREATE POLICY "Finance manage PI items" ON public.pi_items FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Sales Orders
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sales staff read SO" ON public.sales_orders FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));
CREATE POLICY "Sales staff manage SO" ON public.sales_orders FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- SO Items
ALTER TABLE public.so_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sales staff read SO items" ON public.so_items FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));
CREATE POLICY "Sales staff manage SO items" ON public.so_items FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Payment Allocations
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance staff manage allocations" ON public.payment_allocations FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Return Items
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read return items" ON public.return_items FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));
CREATE POLICY "Staff manage return items" ON public.return_items FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));

-- Loyalty Transactions
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read loyalty transactions" ON public.loyalty_transactions FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role, 'cashier'::app_role]));
CREATE POLICY "Staff manage loyalty transactions" ON public.loyalty_transactions FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'pharmacist'::app_role]));