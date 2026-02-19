# GreenBasket - Supabase Backend Setup Guide

This document provides a complete guide to setting up the backend for GreenBasket. It includes the Database Schema, Row Level Security (RLS) policies, Storage configuration, and secure RPC functions.

## 1. Prerequisites
-- --- ORDERS & ORDER_ITEMS (SECURED HELPERS) ---
-- The previous policies caused infinite recursion because policies referred to each other.
-- To avoid recursive RLS evaluation, we create SECURITY DEFINER helper functions
-- that run with the function owner's privileges (bypassing RLS) and perform
-- the necessary joins. Policies then call these functions which are safe and
-- do not trigger recursive policy evaluation.

-- Helper: check whether a given order is visible to a user
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

-- Helper: check whether a given order_item is visible to a user
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

-- Drop any existing policies first (idempotent)
DROP POLICY IF EXISTS "Read orders" ON public.orders;
DROP POLICY IF EXISTS "Read order items" ON public.order_items;

-- Policies that call the helper functions. The helpers run as the function owner
-- and therefore don't trigger RLS recursion.
CREATE POLICY "Read orders" 
ON public.orders FOR SELECT 
USING ( public.order_visible_to_user(id, auth.uid()) );

CREATE POLICY "Create orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Read order items" 
ON public.order_items FOR SELECT 
USING ( public.order_item_visible_to_user(id, auth.uid()) );

-- Insert policy remains permissive for client-side checkout (RPC recommended)
CREATE POLICY "Insert order items" 
ON public.order_items FOR INSERT 
WITH CHECK (true);
);

-- 5. Create Cart Items Table
CREATE TABLE public.cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id) -- Prevent duplicate rows for same product
);

-- 6. Create Orders Table
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Order Items Table (Snapshot of product at purchase)
CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL, 
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Performance Indexes
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_products_created_by ON public.products(created_by);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_cart_user_id ON public.cart_items(user_id);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
```

---

## 3. Row Level Security (RLS) Policies

Enable RLS and apply policies to strictly control access based on roles.

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- --- PROFILES ---
-- Public Read: Needed so users can see who sold a product
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

-- Self Update: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Admin Update: Admins can update any profile (e.g., approve farmers)
CREATE POLICY "Admins can update any profile" 
ON public.profiles FOR UPDATE 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- --- PRODUCTS ---
-- Read: Everyone can see APPROVED products. 
-- Farmers see their OWN products (any status).
-- Admins see ALL products.
CREATE POLICY "Read products" 
ON public.products FOR SELECT 
USING (
  status = 'approved' 
  OR auth.uid() = created_by 
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Insert: Only Farmers can insert.
CREATE POLICY "Farmers insert products" 
ON public.products FOR INSERT 
WITH CHECK (
  auth.uid() = created_by 
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'farmer'
);

-- Update: Farmers update OWN; Admins update ANY.
CREATE POLICY "Farmers update own products" 
ON public.products FOR UPDATE 
USING (auth.uid() = created_by OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Delete: Farmers delete OWN; Admins delete ANY.
CREATE POLICY "Farmers delete own products" 
ON public.products FOR DELETE 
USING (auth.uid() = created_by OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- --- CART ITEMS ---
-- Full Access: Users can only manage their own cart.
CREATE POLICY "Manage own cart" 
ON public.cart_items FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- --- ORDERS ---
-- Read: Customers see OWN; Admins see ALL; Farmers see orders containing their products.
CREATE POLICY "Read orders" 
ON public.orders FOR SELECT 
USING (
  auth.uid() = customer_id 
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = orders.id AND p.created_by = auth.uid()
  )
);

-- Insert: Customers can create orders for themselves.
CREATE POLICY "Create orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

-- --- ORDER ITEMS ---
--   2. User is admin, OR
--   3. User is a farmer and the product in this order item was created by them.
CREATE POLICY "Read order items" 
ON public.order_items FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_items.order_id 
        AND (
            orders.customer_id = auth.uid() 
            OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        WHERE products.id = order_items.product_id
        AND products.created_by = auth.uid()
    )
);

-- Insert: Open to auth users (Backend/RPC usually handles this, but needed for client-side checkout).
CREATE POLICY "Insert order items" 
ON public.order_items FOR INSERT 
WITH CHECK (true);
```

---

## 4. Automation (Triggers)
Automatically create a `profile` row when a user signs up via Supabase Auth.

```sql
    new.id, 
    new.email, 
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'customer'),
    CASE 
        WHEN (new.raw_user_meta_data->>'role') = 'farmer' THEN 'pending'::public.farmer_status
        ELSE 'active'::public.farmer_status
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 5. Storage Setup

1.  Go to **Storage** in the Supabase dashboard.
2.  Create a new bucket named `products`.
3.  Make it **Public**.
4.  Go to **Policies** for the `products` bucket and run this SQL or use the UI:

```sql
-- 1. Public Read Access
-- Allow anyone to view images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'products' );

-- 2. Authenticated Upload Access
-- Allow authenticated users (Farmers) to upload images
-- Ideally, we restrict this further to 'farmer' role, but 'authenticated' is safe enough for MVP
CREATE POLICY "Auth Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'products' AND auth.role() = 'authenticated' );

-- 3. Owner Update/Delete
-- Users can only delete their own images (Assuming path contains userId e.g., 'user_id/image.jpg')
CREATE POLICY "Owner Manage"
ON storage.objects FOR DELETE
USING ( bucket_id = 'products' AND (storage.foldername(name))[1] = auth.uid()::text );
```

---

## 6. Secure RPC Functions (Optional but Recommended)

These PostgreSQL functions allow you to perform complex actions securely from the frontend using `supabase.rpc('function_name', { params })`.

### A. Approve Farmer (Admin Only)
```sql
CREATE OR REPLACE FUNCTION approve_farmer(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if executor is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access Denied: Admins only';
  END IF;

  UPDATE public.profiles
  SET status = 'active'
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### B. Approve Product (Admin Only)
```sql
CREATE OR REPLACE FUNCTION approve_product(target_product_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access Denied: Admins only';
  END IF;

  UPDATE public.products
  SET status = 'approved'
  WHERE id = target_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### C. Secure Checkout (Transactional)
This function handles the entire checkout process (create order, move items, clear cart) in one atomic transaction.

```sql
CREATE OR REPLACE FUNCTION place_order(total_amount NUMERIC)
RETURNS UUID AS $$
DECLARE
  new_order_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  -- 1. Create Order
  INSERT INTO public.orders (customer_id, total_price)
  VALUES (current_user_id, total_amount)
  RETURNING id INTO new_order_id;

  -- 2. Move Cart Items to Order Items
  INSERT INTO public.order_items (order_id, product_id, quantity, price_at_purchase)
  SELECT 
    new_order_id, 
    c.product_id, 
    c.quantity, 
    p.price 
  FROM public.cart_items c
  JOIN public.products p ON c.product_id = p.id
  WHERE c.user_id = current_user_id;

  -- 3. Clear Cart
  DELETE FROM public.cart_items WHERE user_id = current_user_id;

  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 7. Creating an Admin User

Since sign-ups default to `customer` or `farmer`, you must manually promote a user to Admin.

1.  Sign up a new user in your app (e.g., `admin@greenbasket.com`).
2.  Go to Supabase Dashboard > **Table Editor** > **profiles**.
3.  Find the user row.
4.  Change the `role` column to `admin`.
5.  (Optional) Change `status` to `active` if they signed up as a farmer initially.

---

## 8. Testing the Setup

1.  **Farmer Flow**:
    *   Register as Farmer.
    *   Check `profiles` table: `status` should be `pending`.
    *   Try to login: Dashboard should show "Pending" message.
    *   As Admin (see step 7), change status to `active`.
    *   Farmer can now access Dashboard and add products.
    *   Product status defaults to `pending`.

2.  **Admin Flow**:
    *   Login as Admin.
    *   Go to Admin Dashboard.
    *   See pending farmers/products.
    *   Approve them.

3.  **Customer Flow**:
    *   Register as Customer.
    *   Browse Marketplace (only sees `approved` products).
    *   Add to cart, Checkout.
    *   Check `orders` table for new record.
