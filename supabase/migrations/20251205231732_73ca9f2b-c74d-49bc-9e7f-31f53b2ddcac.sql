-- 1. إضافة قيد فريد على user_id (إن لم يكن موجوداً)
ALTER TABLE public.customers
DROP CONSTRAINT IF EXISTS customers_user_id_unique;

ALTER TABLE public.customers
ADD CONSTRAINT customers_user_id_unique UNIQUE (user_id);

-- 2. سياسة السماح للعملاء بتسجيل أنفسهم (INSERT)
DROP POLICY IF EXISTS "Customers can self-register once" ON public.customers;

CREATE POLICY "Customers can self-register once"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NOT NULL 
  AND auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.customers c WHERE c.user_id = auth.uid()
  )
);

-- 3. سياسة قراءة العميل لسجله فقط (إن لم تكن موجودة)
DROP POLICY IF EXISTS "Customers can read own record" ON public.customers;

CREATE POLICY "Customers can read own record"
ON public.customers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. سياسة تعديل العميل لسجله فقط
DROP POLICY IF EXISTS "Customers can update own record" ON public.customers;

CREATE POLICY "Customers can update own record"
ON public.customers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- تعليق توضيحي
COMMENT ON CONSTRAINT customers_user_id_unique ON public.customers IS 'يضمن أن كل مستخدم له سجل عميل واحد فقط';