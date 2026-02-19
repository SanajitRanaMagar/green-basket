-- Migration: Allow farmers to delete orders
-- Farmers should be able to delete orders containing their products

BEGIN;

-- Add DELETE policy for orders
-- Allow farmers to delete orders that contain their products
CREATE POLICY "Delete orders"
ON public.orders FOR DELETE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  OR auth.uid() = customer_id
  OR EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = orders.id AND p.created_by = auth.uid()
  )
);

COMMIT;

-- End of migration
