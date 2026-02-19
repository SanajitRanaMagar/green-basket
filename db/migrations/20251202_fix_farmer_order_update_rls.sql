-- Migration: Fix farmer order update RLS policy
-- Allow farmers to update order status for orders containing their products

BEGIN;

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Update orders" ON public.orders;

-- Create new policy that allows:
-- 1. Admins to update orders
-- 2. Customers to update their own orders
-- 3. Farmers to update orders that contain their products
CREATE POLICY "Update orders"
ON public.orders FOR UPDATE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  OR auth.uid() = customer_id
  OR EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = id AND p.created_by = auth.uid()
  )
);

COMMIT;

-- End of migration
