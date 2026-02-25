# GreenBasket SQL Quick Reference

## Files
- **database.sql** - Complete SQL schema (305 lines, no comments, ready to run)
- **DATABASE_SCHEMA.md** - Detailed documentation
- **Original migrations** - In db/migrations/ folder

## Tables Overview

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| profiles | User metadata | id, email, role, status, city |
| products | Product listings | id, name, price, stock_quantity, status, created_by |
| farmer_applications | Farmer verification | id, user_id, farm_address, status |
| orders | Purchase orders | id, customer_id, customer_email, total_price, status |
| order_items | Items in orders | id, order_id, product_id, quantity, price_at_purchase |
| cart_items | Shopping cart | id, user_id, product_id, quantity |
| notifications | Order notifications | id, customer_id, order_id, status, is_read |

## Common SQL Queries

### Get approved products with farmer location
```sql
SELECT p.*, pr.city as location
FROM products p
JOIN auth.users au ON p.created_by = au.id
JOIN profiles pr ON au.id = pr.id
WHERE p.status = 'approved'
ORDER BY p.created_at DESC;
```

### Get farmer's orders with details
```sql
SELECT o.*, oi.product_id, oi.quantity, pr.name
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products pr ON oi.product_id = pr.id
WHERE pr.created_by = AUTH.UID()
ORDER BY o.created_at DESC;
```

### Get customer's cart
```sql
SELECT ci.*, p.name, p.price, p.stock_quantity
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
WHERE ci.user_id = AUTH.UID();
```

### Deduct stock after order
```sql
UPDATE products
SET stock_quantity = stock_quantity - (
  SELECT SUM(quantity) FROM order_items WHERE order_id = $1
)
WHERE id IN (
  SELECT product_id FROM order_items WHERE order_id = $1
);
```

### Get pending farmer applications
```sql
SELECT fa.*, pr.email
FROM farmer_applications fa
JOIN profiles pr ON fa.user_id = pr.id
WHERE fa.status = 'pending'
ORDER BY fa.created_at ASC;
```

### Approve farmer application
```sql
UPDATE farmer_applications
SET status = 'approved', reviewed_at = NOW()
WHERE id = $1;

UPDATE profiles
SET status = 'approved', city = ($2->>'city')
WHERE id = (SELECT user_id FROM farmer_applications WHERE id = $1);
```

### Get user's notifications
```sql
SELECT * FROM notifications
WHERE customer_id = AUTH.UID()
ORDER BY created_at DESC;
```

### Mark notification as read
```sql
UPDATE notifications
SET is_read = true
WHERE id = $1 AND customer_id = AUTH.UID();
```

## Security Functions

### place_order(items JSONB, total NUMERIC) → UUID
Places an order atomically.

Input:
```json
{
  "items": [
    {"product_id": "uuid", "quantity": 5, "price_at_purchase": 100},
    {"product_id": "uuid", "quantity": 3, "price_at_purchase": 50}
  ],
  "total": 650
}
```

### order_visible_to_user(order_id UUID, user_id UUID) → BOOLEAN
Checks if user can view order.

### order_item_visible_to_user(item_id UUID, user_id UUID) → BOOLEAN
Checks if user can view order item.

## RLS Policies Summary

### Who Can Do What?

**Farmers:**
- ✅ Create products (must be approved first)
- ✅ Read/Update/Delete own products
- ✅ Read/Update own farmer_applications
- ✅ Read orders containing their products
- ✅ Manage their cart

**Customers:**
- ✅ Read approved products
- ✅ Create/Read/Update own orders
- ✅ Manage own cart
- ✅ Read own notifications

**Admin:**
- ✅ Read all profiles
- ✅ Approve/Reject products
- ✅ Approve/Reject farmer applications
- ✅ Read all orders
- ✅ Full database access

## Data Integrity

### Constraints
- price >= 0
- stock_quantity >= 0
- quantity > 0
- role IN ('farmer', 'customer', 'admin')
- status IN ('pending', 'approved', 'rejected')
- order status IN ('pending', 'accepted', 'rejected')

### Cascades
- Delete auth.user → Delete profile, products, orders, farmer_applications
- Delete order → Delete order_items
- Delete product → Delete order_items (SET NULL)

## Indexes (Performance)

Total: 15 indexes optimizing:
- Role-based access (role, status)
- Farmer product queries (created_by, category)
- Order lookups (customer_id, status)
- Notification retrieval (customer_id, created_at DESC)
- User cart management (user_id)

## Running the SQL

### Method 1: Supabase Dashboard
1. Go to SQL Editor
2. Create new query
3. Paste database.sql
4. Click Run

### Method 2: Supabase CLI
```bash
supabase db push < database.sql
```

### Method 3: Direct PostgreSQL
```bash
psql -h [host] -U [user] -d [database] < database.sql
```

## Maintenance

### Backup Database
```bash
pg_dump -U postgres -d greenbasket > backup.sql
```

### View Table Sizes
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check RLS Policies
```sql
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public';
```

### Monitor Query Performance
```sql
EXPLAIN ANALYZE
SELECT * FROM products WHERE status = 'approved' LIMIT 10;
```

## Key Design Decisions

1. **JSONB for farm_address** - Flexible, scalable structure
2. **Historical data in order_items** - Preserves name/price/image at purchase time
3. **SECURITY DEFINER functions** - Avoids RLS recursion overhead
4. **Helper functions for visibility** - Centralized access control logic
5. **Indexes on status fields** - Enables fast filtering
6. **cascade deletes** - Maintains data integrity
7. **customer_email in orders** - Avoids extra joins for farmer communication

## Troubleshooting

### "Need to be authenticated" Error
- Ensure auth.uid() is available in Supabase context
- Check JWT token validity

### RLS Policy Errors
- Verify role in profiles table
- Check farmer application status
- Ensure user has required permissions

### Performance Issues
- Run ANALYZE to update statistics
- Check index usage with EXPLAIN ANALYZE
- Consider adding missing indexes for your queries
