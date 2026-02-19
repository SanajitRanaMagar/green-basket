# How to Apply the Notification Fix

## Issue
Notifications are not appearing in the customer portal when farmers accept orders.

## Quick Fix
The farmer order update RLS policy was blocking farmers from changing order status. Here's how to fix it:

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New query**

### Step 2: Run the Migration
Copy and paste this SQL into the editor:

```sql
-- Fix farmer order update RLS policy
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
```

### Step 3: Click Run
Click the **Run** button (or Ctrl+Enter) and wait for success confirmation.

## Testing the Fix
1. **Open 2 browser windows/tabs:**
   - Tab A: Logged in as a **customer** → go to `/customer` (Notifications page)
   - Tab B: Logged in as a **farmer** → go to `/farmer` (Dashboard)

2. **Place a test order:**
   - In Tab A, browse marketplace and add a product to cart
   - Go to cart and checkout
   - Verify order appears in Tab B (farmer dashboard)

3. **Accept the order:**
   - In Tab B, click "View Details" on the order
   - Click the "Accept" button
   - Should see "Order accepted" toast

4. **Check notifications:**
   - In Tab A, watch the Notifications section
   - Within ~10 seconds, a notification should appear saying "Your order # is now accepted"
   - Click to expand and see farmer contact details

## What Changed
- **Before:** RLS policy only allowed admin and customer to update orders
- **After:** RLS policy also allows farmers to update orders for their products
- This enables farmers to change order status (pending → accepted/rejected)
- When status changes, customers get notified via the polling system

## File Location
The migration is at: `db/migrations/20251202_fix_farmer_order_update_rls.sql`

## Troubleshooting
If notifications still don't appear:
1. Check browser console for errors (F12 → Console tab)
2. Make sure customer dashboard (`/customer`) is open BEFORE farmer accepts order
3. Verify the SQL migration ran without errors
4. Check that the farmer's products are correctly linked to the order
