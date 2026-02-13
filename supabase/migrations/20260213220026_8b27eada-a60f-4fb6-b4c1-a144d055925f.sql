
-- Free Samples header table
CREATE TABLE public.free_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  date_received DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  created_by UUID,
  posted_by UUID,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Free Sample items table
CREATE TABLE public.free_sample_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  free_sample_id UUID NOT NULL REFERENCES public.free_samples(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  qty NUMERIC DEFAULT 0 NOT NULL CHECK (qty >= 0),
  free_qty NUMERIC NOT NULL CHECK (free_qty >= 0),
  unit TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.free_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_sample_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for free_samples
CREATE POLICY "Authenticated users can view free_samples"
ON public.free_samples FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/inventory_manager can insert free_samples"
ON public.free_samples FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Admin/inventory_manager can update free_samples"
ON public.free_samples FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Admin can delete free_samples"
ON public.free_samples FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for free_sample_items
CREATE POLICY "Authenticated users can view free_sample_items"
ON public.free_sample_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/inventory_manager can insert free_sample_items"
ON public.free_sample_items FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Admin/inventory_manager can update free_sample_items"
ON public.free_sample_items FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Admin/inventory_manager can delete free_sample_items"
ON public.free_sample_items FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager')
);

-- Post free sample function
CREATE OR REPLACE FUNCTION public.post_free_sample(p_sample_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sample RECORD;
  v_item RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check role
  IF NOT (has_role(v_user_id, 'admin') OR has_role(v_user_id, 'inventory_manager')) THEN
    RAISE EXCEPTION 'غير مصرح: يجب أن يكون لديك صلاحية مدير المخزون أو المسؤول';
  END IF;

  -- Get sample
  SELECT * INTO v_sample FROM free_samples WHERE id = p_sample_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على العينة المجانية';
  END IF;
  IF v_sample.status != 'draft' THEN
    RAISE EXCEPTION 'لا يمكن ترحيل عينة بحالة: %', v_sample.status;
  END IF;

  -- Process each item
  FOR v_item IN SELECT * FROM free_sample_items WHERE free_sample_id = p_sample_id AND free_qty > 0
  LOOP
    -- Update warehouse_stock free_quantity (bypass trigger via allowed function)
    INSERT INTO warehouse_stock (warehouse_id, item_id, qty_on_hand, free_quantity, reserved_quantity)
    VALUES (v_sample.warehouse_id, v_item.product_id, 0, v_item.free_qty, 0)
    ON CONFLICT (warehouse_id, item_id) DO UPDATE SET
      free_quantity = warehouse_stock.free_quantity + v_item.free_qty,
      updated_at = now();

    -- Audit log
    INSERT INTO free_stock_audit_log (product_id, warehouse_id, quantity, operation_type, reference_id, reference_type, performed_by, notes)
    VALUES (v_item.product_id, v_sample.warehouse_id, v_item.free_qty, 'free_purchase', p_sample_id, 'free_sample', v_user_id, 'ترحيل عينة مجانية: ' || v_sample.sample_number);

    -- Stock ledger entry
    INSERT INTO stock_ledger (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
    VALUES (v_item.product_id, v_sample.warehouse_id, 'free_purchase', v_item.free_qty, 'free_sample', p_sample_id, 'عينة مجانية: ' || v_sample.sample_number, v_user_id);
  END LOOP;

  -- Update sample status
  UPDATE free_samples SET status = 'posted', posted_by = v_user_id, posted_at = now() WHERE id = p_sample_id;

  RETURN jsonb_build_object('success', true, 'message', 'تم ترحيل العينة المجانية بنجاح');
END;
$$;

-- Sequence for sample numbers
CREATE SEQUENCE IF NOT EXISTS free_sample_number_seq START 1;
