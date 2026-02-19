1. Project Overview

GreenBasket is an online farmer-to-consumer marketplace where farmers can list products, customers can browse and purchase them, and an admin oversees approvals and management.
The system focuses on simple CRUD operations suitable for a college project.

2. Problem Statement

Farmers face difficulties reaching consumers directly, while customers pay more because of middlemen.
GreenBasket creates a direct digital connection between farmers and buyers.

3. Project Goals

Allow farmers to list and manage products easily.

Provide customers access to affordable, fresh products.

Admin ensures only verified farmers and valid products are displayed.

Build a stable CRUD web application within 1–2 weeks.

4. Target Users

Farmers

Customers

Admin

5. User Roles & Permissions
5.1 Farmer

Register/Login

Create/Edit/Delete products

View own product listings

Product waiting for admin approval

5.2 Customer

Register/Login

Browse products

View product details

Add to cart

Place order

(No order history / no tracking — as per your update)

5.3 Admin

Approve/Reject farmer accounts

Approve/Reject products

Manage users

View all orders

6. Core Features
6.1 Authentication

Email/password login with Supabase Auth

Role-based access: Farmer, Customer, Admin

6.2 Farmer Features

Create product

Read product list

Update product

Delete product

Product approval workflow

pending → approved/rejected

6.3 Customer Features

View all approved products

Search/filter products

Product details

Add to cart

Remove from cart

Checkout / place order

6.4 Admin Features

Farmer account approval

Product approval

View all users

View all orders

7. Functional Requirements
7.1 Product Module

Fields:

name

price

description

image

stock quantity

category

created_by (farmer ID)

status (pending/approved/rejected)

7.2 Order Module

Customer places an order → order record saved.

Order fields:

order_IDgreen-basket/
├── public/
│   └── Image/
│       ├── Beautiful wide landscape...jpg
│       ├── Close-up wide banner...jpg
│       └── ... (other images)

customer_ID

product list

total_price

order_date

(No tracking or history page for customer)

7.3 Cart Module

Add item

Remove item

Update quantity

Cart clears after successful order

8. Non-Functional Requirements

Easy user experience

Proper security using Supabase Auth

Fast CRUD performance

Clean and maintainable code structure

9. Tech Stack
Frontend

React + Vite

Context API

Backend

Supabase

Database (PostgreSQL)

Auth

Storage for images

API (auto-generated REST + RPC functions if needed)

Hosting

Vercel / Netlify for frontend

Supabase handles backend + DB