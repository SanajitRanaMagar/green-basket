CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE public.application_status AS ENUM ('pending','approved','rejected');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('farmer', 'customer', 'admin')),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  description TEXT,
  category TEXT,
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.farmer_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  farm_name TEXT NOT NULL,
  farm_type TEXT NOT NULL,
  farm_address JSONB,
  status public.application_status DEFAULT 'pending',
  review_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_email TEXT,
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase NUMERIC(10, 2) NOT NULL,
  name TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  total_price NUMERIC,
  items JSONB,
  farmer_contacts JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_products_created_by ON public.products(created_by);

CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

CREATE INDEX IF NOT EXISTS idx_farmer_applications_user_id ON public.farmer_applications(user_id);

CREATE INDEX IF NOT EXISTS idx_farmer_applications_status ON public.farmer_applications(status);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_cart_user_id ON public.cart_items(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON public.notifications(customer_id);

CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON public.notifications(order_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.farmer_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view any profile" ON public.profiles;
CREATE POLICY "Users can view any profile" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can insert profile" ON public.profiles;
CREATE POLICY "Anyone can insert profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Approved farmers can create products" ON public.products;
CREATE POLICY "Approved farmers can create products" ON public.products FOR INSERT WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'farmer'
  AND (SELECT status FROM public.profiles WHERE id = auth.uid()) = 'approved'
);

DROP POLICY IF EXISTS "Farmers can read own products" ON public.products;
CREATE POLICY "Farmers can read own products" ON public.products FOR SELECT USING (
  created_by = auth.uid() OR status = 'approved' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Farmers can update own products" ON public.products;
CREATE POLICY "Farmers can update own products" ON public.products FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Farmers can delete own products" ON public.products;
CREATE POLICY "Farmers can delete own products" ON public.products FOR DELETE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
CREATE POLICY "Admins can manage all products" ON public.products FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Farmer insert own application" ON public.farmer_applications;
CREATE POLICY "Farmer insert own application" ON public.farmer_applications FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Farmer select own application" ON public.farmer_applications;
CREATE POLICY "Farmer select own application" ON public.farmer_applications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Farmer update own application" ON public.farmer_applications;
CREATE POLICY "Farmer update own application" ON public.farmer_applications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id
  AND (status = 'pending' OR status = 'rejected')
);

DROP POLICY IF EXISTS "Admins full access to applications" ON public.farmer_applications;
CREATE POLICY "Admins full access to applications" ON public.farmer_applications FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Read orders" ON public.orders;
CREATE POLICY "Read orders" ON public.orders FOR SELECT USING (
  public.order_visible_to_user(id, auth.uid())
);

DROP POLICY IF EXISTS "Create orders" ON public.orders;
CREATE POLICY "Create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Update orders" ON public.orders;
CREATE POLICY "Update orders" ON public.orders FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  OR auth.uid() = customer_id
  OR EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = id AND p.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Delete orders" ON public.orders;
CREATE POLICY "Delete orders" ON public.orders FOR DELETE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  OR auth.uid() = customer_id
  OR EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = orders.id AND p.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Read order items" ON public.order_items;
CREATE POLICY "Read order items" ON public.order_items FOR SELECT USING (
  public.order_item_visible_to_user(id, auth.uid())
);

DROP POLICY IF EXISTS "Insert order items" ON public.order_items;
CREATE POLICY "Insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Manage own cart" ON public.cart_items;
CREATE POLICY "Manage own cart" ON public.cart_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can create notifications for themselves" ON public.notifications;
CREATE POLICY "Users can create notifications for themselves" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can update their notification read status" ON public.notifications;
CREATE POLICY "Users can update their notification read status" ON public.notifications FOR UPDATE USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = customer_id);

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

  DELETE FROM public.cart_items WHERE user_id = auth.uid();

  RETURN new_order;
END;
$$;
