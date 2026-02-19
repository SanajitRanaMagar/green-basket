# Notification Issue - Root Cause & Fix

## Problem
When a farmer accepts an order, no notification appears in the customer portal.

## Root Cause
The RLS (Row Level Security) policy on the `orders` table was blocking farmers from updating order statuses.

**Original Policy:**
```sql
CREATE POLICY "Update orders"
ON public.orders FOR UPDATE
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR auth.uid() = customer_id );
```

This policy only allowed:
- Admins to update orders
- Customers to update their own orders

It **blocked farmers** from updating orders because a farmer is neither an admin nor the customer.

## Solution
Updated the RLS policy to also allow farmers to update orders that contain their products:

```sql
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
```

Now farmers can update the status of orders that contain products they created.

## How Notifications Work
1. Customer opens Dashboard → `NotificationContext` starts polling every 10 seconds
2. First poll loads all customer's orders and stores their current status in memory
3. Farmer accepts an order → order status changes to "accepted" in database
4. Next poll (10s later) detects the status change → creates a notification
5. Notification appears in customer dashboard with farmer contact details and order items

## Implementation Steps
1. Run the migration: `20251202_fix_farmer_order_update_rls.sql` in Supabase SQL editor
2. Test: Farmer accepts an order while customer has dashboard open
3. Within 10 seconds, a notification should appear in the customer dashboard

## Related Files Changed
- `db/migrations/20251202_fix_farmer_order_update_rls.sql` - New RLS policy migration
- Previously: `services/api.ts` - Updated to fetch phone numbers from farmer profiles
- Previously: `context/NotificationContext.tsx` - Polls for order status changes
- Previously: `pages/customer/Dashboard.tsx` - Displays notifications with order details
