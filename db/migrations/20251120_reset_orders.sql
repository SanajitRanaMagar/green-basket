-- Migration: destructive reset of ordering system (orders, order_items, cart_items)
-- WARNING: This will destroy existing data in orders, order_items and cart_items.
-- Run this in Supabase SQL editor as a project SQL admin.

BEGIN;

-- 1) Drop old policies and functions (idempotent)
DROP POLICY IF EXISTS "Read orders" ON public.orders;
DROP POLICY IF EXISTS "Create orders" ON public.orders;
DROP POLICY IF EXISTS "Read order items" ON public.order_items;
DROP POLICY IF EXISTS "Insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Manage own cart" ON public.cart_items;
DROP POLICY IF EXISTS "Insert cart items" ON public.cart_items;

DROP FUNCTION IF EXISTS public.place_order(jsonb, numeric);
DROP FUNCTION IF EXISTS public.order_visible_to_user(uuid, uuid);
DROP FUNCTION IF EXISTS public.order_item_visible_to_user(uuid, uuid);

-- 2) Drop tables
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;

-- 3) Recreate tables

-- Orders table (with status)
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart items
CREATE TABLE public.cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON public.cart_items(user_id);

-- 5) Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 6) Helper functions (SECURITY DEFINER) to avoid recursive RLS evaluation
CREATE OR REPLACE FUNCTION public.order_visible_to_user(p_order_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id
      AND (
        o.customer_id = p_user_id
        OR (SELECT role FROM public.profiles WHERE id = p_user_id) = 'admin'
        OR EXISTS (
          SELECT 1 FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
          WHERE oi.order_id = o.id AND p.created_by = p_user_id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.order_item_visible_to_user(p_order_item_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    LEFT JOIN public.orders o ON o.id = oi.order_id
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.id = p_order_item_id
      AND (
        (o.customer_id = p_user_id)
        OR (SELECT role FROM public.profiles WHERE id = p_user_id) = 'admin'
        OR (p.created_by = p_user_id)
      )
  );
$$;

-- 7) Policies calling helpers (safe)
CREATE POLICY "Read orders"
ON public.orders FOR SELECT
USING ( public.order_visible_to_user(id, auth.uid()) );

CREATE POLICY "Create orders"
ON public.orders FOR INSERT
WITH CHECK ( auth.uid() = customer_id );

CREATE POLICY "Update orders"
ON public.orders FOR UPDATE
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR auth.uid() = customer_id );

CREATE POLICY "Read order items"
ON public.order_items FOR SELECT
USING ( public.order_item_visible_to_user(id, auth.uid()) );

CREATE POLICY "Insert order items"
ON public.order_items FOR INSERT
WITH CHECK ( true );

-- Cart policies: users manage their own cart
CREATE POLICY "Manage own cart"
ON public.cart_items FOR ALL
USING ( auth.uid() = user_id )
WITH CHECK ( auth.uid() = user_id );

-- 8) Server-side atomic checkout RPC (VOLATILE to allow INSERTs)
CREATE OR REPLACE FUNCTION public.place_order(p_items jsonb, p_total numeric)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
  new_order uuid;
  item jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.orders (customer_id, total_price)
  VALUES (auth.uid(), p_total)
  RETURNING id INTO new_order;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (order_id, product_id, quantity, price_at_purchase)
    VALUES (
      new_order,
      (item->>'product_id')::uuid,
      (item->>'quantity')::int,
      (item->>'price_at_purchase')::numeric
    );
  END LOOP;

  -- Clear the customer's cart
  DELETE FROM public.cart_items WHERE user_id = auth.uid();

  RETURN new_order;
END;
$$;

COMMIT;

-- End of migration
