-- تقييد وصول Cashier للعملاء - فقط أثناء جلسة POS نشطة
CREATE POLICY "customers_cashier_active_session" ON public.customers
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'cashier'::app_role) 
  AND EXISTS (
    SELECT 1 FROM pos_sessions ps 
    WHERE ps.user_id = auth.uid() 
    AND ps.status = 'open'
  )
);