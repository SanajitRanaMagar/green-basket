# GreenBasket Database Schema - database.sql

## Overview
Complete SQL schema for GreenBasket marketplace. Run this file in Supabase SQL editor to set up the entire database.

## File Structure

### 1. EXTENSIONS
- pgcrypto - For UUID generation
- uuid-ossp - For UUID functions

### 2. TYPES
- application_status ENUM - Values: pending, approved, rejected

### 3. TABLES (in dependency order)

#### profiles
- id (UUID, PRIMARY KEY, FK to auth.users)
- email (TEXT, UNIQUE)
- role (farmer | customer | admin)
- status (pending | approved | rejected)
- city (TEXT)
- created_at

#### products
- id (UUID, PRIMARY KEY)
- name (TEXT, required)
- price (NUMERIC, non-negative)
- description (TEXT)
- category (TEXT)
- image_url (TEXT)
- stock_quantity (INTEGER, non-negative)
- created_by (UUID, FK to auth.users)
- status (pending | approved | rejected)
- created_at, updated_at

#### farmer_applications
- id (UUID, PRIMARY KEY)
- user_id (UUID, FK to profiles, UNIQUE)
- full_name (TEXT)
- farm_name (TEXT)
- farm_type (TEXT)
- farm_address (JSONB)
- status (application_status ENUM)
- review_notes (TEXT)
- reviewed_by (UUID, FK to profiles)
- reviewed_at (TIMESTAMPTZ)
- created_at, updated_at

#### orders
- id (UUID, PRIMARY KEY)
- customer_id (UUID, FK to profiles)
- customer_email (TEXT)
- total_price (NUMERIC, non-negative)
- status (pending | accepted | rejected)
- created_at, updated_at

#### order_items
- id (UUID, PRIMARY KEY)
- order_id (UUID, FK to orders)
- product_id (UUID, FK to products)
- quantity (INTEGER, positive)
- price_at_purchase (NUMERIC)
- name (TEXT)
- image_url (TEXT)
- created_at

#### cart_items
- id (UUID, PRIMARY KEY)
- user_id (UUID, FK to profiles)
- product_id (UUID, FK to products, UNIQUE with user_id)
- quantity (INTEGER, positive)
- created_at

#### notifications
- id (UUID, PRIMARY KEY)
- customer_id (UUID, FK to auth.users)
- order_id (UUID, FK to orders)
- status (TEXT)
- message (TEXT)
- total_price (NUMERIC)
- items (JSONB)
- farmer_contacts (JSONB)
- is_read (BOOLEAN)
- created_at

### 4. INDEXES
- profiles: email, role
- products: created_by, status, category
- farmer_applications: user_id, status
- orders: customer_id, status
- order_items: order_id, product_id
- cart_items: user_id
- notifications: customer_id, order_id, created_at (DESC)

### 5. ROW LEVEL SECURITY (RLS) POLICIES

#### profiles
- SELECT: Any authenticated user can view any profile
- UPDATE: Users can only update their own profile
- INSERT: Users can only insert their own profile

#### products
- INSERT: Only approved farmers can create products
- SELECT: Farmers see own products + approved products accessible to all + admins see all
- UPDATE: Farmers can update their own products
- DELETE: Farmers can delete their own products
- ALL: Admins have full access

#### farmer_applications
- INSERT: Farmers can insert their own application
- SELECT: Farmers can see their own application + Admins see all
- UPDATE: Farmers can update own (pending/rejected only)
- ALL: Admins have full access

#### orders
- SELECT: Customers see own orders + Admins see all + Farmers see orders of their products
- INSERT: Customers can create orders with their ID
- UPDATE: Admins/Customers/Farmers (for own products) can update orders
- DELETE: Customers/Admins/Farmers (for own products) can delete orders

#### order_items
- SELECT: Uses helper function order_item_visible_to_user
- INSERT: Any authenticated user can insert

#### cart_items
- ALL: Users can only manage their own cart

#### notifications
- SELECT: Users see their own notifications
- INSERT: Users create notifications for themselves
- UPDATE: Users can update read status
- DELETE: Users can delete their own notifications

### 6. SECURITY FUNCTIONS

#### order_visible_to_user(p_order_id, p_user_id) → BOOLEAN
Helper function to check if a user can view an order.
Returns true if:
- User is the customer
- User is admin
- User is farmer with products in the order

#### order_item_visible_to_user(p_order_item_id, p_user_id) → BOOLEAN
Helper function to check if a user can view an order item.
Returns true if:
- User is the customer of the order
- User is admin
- User is the farmer who created the product

#### place_order(p_items jsonb, p_total numeric) → UUID
Atomic server-side checkout function.
Steps:
1. Create order record with customer_id and total_price
2. Insert all order_items from JSONB array
3. Clear user's cart
4. Return order ID

## Usage Instructions

### Import to Supabase
1. Copy entire database.sql content
2. Go to Supabase Dashboard → SQL Editor
3. Create new query
4. Paste database.sql content
5. Click "Run"

### Key Features
- ✅ RLS enabled on all tables for security
- ✅ Foreign keys with CASCADE/SET NULL deletes
- ✅ CHECK constraints for data integrity
- ✅ Helper functions for complex access control
- ✅ Indexes optimized for common queries
- ✅ SECURITY DEFINER functions to avoid RLS recursion

## Table Relationships

```
auth.users (1) ──→ (1) profiles
auth.users (1) ──→ (∞) products (created_by)
auth.users (1) ──→ (∞) orders (customer_id via profiles)

profiles (1) ──→ (∞) farmer_applications
profiles (1) ──→ (∞) cart_items

products (1) ──→ (∞) order_items
products (1) ──→ (∞) cart_items

orders (1) ──→ (∞) order_items
orders (1) ──→ (∞) notifications
```

## Data Flow Examples

### New Farmer Registration
1. Create auth.users account
2. Create profiles entry (role='farmer', status='pending')
3. Create farmer_applications entry
4. Admin reviews and approves
5. Update profiles.status to 'approved'
6. Farmer can now create products

### Product Creation
1. Farmer creates product (status='pending')
2. Admin reviews product
3. Admin approves product (status='approved')
4. Product visible in marketplace

### Order Process
1. Customer adds items to cart_items
2. Customer places order via place_order()
3. Order created with status='pending'
4. Farmer receives order notification
5. Farmer accepts order (status='accepted')
6. Stock automatically deducted

## Performance Considerations
- Indexes on frequently queried columns (created_by, status, customer_id)
- DESC index on notifications.created_at for recent notifications first
- UNIQUE constraints on farmer_applications.user_id and cart_items(user_id, product_id)
- Helper functions use SECURITY DEFINER to avoid RLS recursion overhead
