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

### 9.1 Three-Tier Architecture Overview
*   **Presentation Tier (React + Tailwind)**: Delivers an interactive and responsive user interface for farmers to list goods, customers to browse, and admins to moderate the system.
*   **Logic Tier (Context API + API Services)**: Orchestrates the system's business rules, including role-based access control, automatic stock deduction, and real-time order processing.
*   **Data Tier (Supabase PostgreSQL + Storage)**: Provides a secure, cloud-hosted relational database and file storage protected by Row Level Security (RLS) for all project assets.

Hosting

Vercel / Netlify for frontend

Supabase handles backend + DB

---

# 10. Presentation Preparation

## 10.1 Presentation Slide Topics

### Slide 1: Project Title & Introduction
*   **Content**: Project Name (GreenBasket), Logo, Slogan (Direct Farmer-to-Consumer Marketplace), and Group Members' Names.
*   **Description**: Initial introduction to the platform and team.

### Slide 2: Problem Statement
*   **Content**: High middleman markups, lack of market access for small farmers, and difficulty for urban consumers to find fresh products.
*   **Description**: Explaining the "Why" behind the project – identifying the gap in the current agricultural market.

### Slide 3: Proposed Solution
*   **Content**: A digital marketplace connecting verified farmers directly with customers.
*   **Description**: Highlighting transparency, fair pricing, and direct-to-consumer delivery.

### Slide 4: Technology Stack & Key Features
*   **Content**: Logos for React, Tailwind CSS, and Supabase. Icons for Verification, Search, and Stock management.
*   **Description**: A high-level view of the modern tools and high-impact features built into the system.

### Slide 5: Core Features - Farmer Module
*   **Content**: Product CRUD (Create, Read, Update, Delete), Image Uploads, and Order Management (Accept/Reject).
*   **Description**: Showing how farmers manage their inventory and interact with purchase requests.

### Slide 6: Core Features - Customer Module
*   **Content**: Location-based Search, City-based Filtering, Product Detail Viewing, and Cart Management.
*   **Description**: Highlighting the discovery experience and the simple purchase flow for consumers.

### Slide 7: Core Features - Admin Module
*   **Content**: Application Verification, Product Moderation, and Marketplace Oversight.
*   **Description**: The "back-office" operations that ensure only verified farmers and quality products are listed.

### Slide 8: System Architecture & Data Flow
*   **Content**: High-level architecture diagram (DFD Level 0/1) and Data Relationships (ER Diagram).
*   **Description**: Visualizing how data moves between the Frontend, Context API, and Supabase.

### Slide 9: Conclusion & Future Scope
*   **Content**: Summary of project success and roadmap (Chat, Payments, Mobile App).
*   **Description**: Final wrap-up and vision for the platform's evolution.

## 10.2 Technical & Feature Descriptions (Slide Content)

### Technologies
*   **React (Frontend)**: A powerful JavaScript library for building a dynamic, component-based user interface, ensuring a smooth and responsive experience for Farmers and Customers.
*   **Tailwind CSS (Styling)**: A utility-first CSS framework used to create a modern, sleek, and mobile-friendly design with custom agricultural-themed color palettes.
*   **Supabase (Backend)**: An all-in-one Backend-as-a-Service providing secure Authentication, a real-time PostgreSQL database, and cloud storage for high-quality product images.

### Key Features
*   **Farmer Verification**: A robust Admin approval workflow that maintains marketplace quality by ensuring only verified agricultural producers can list their goods.
*   **Location-Based Search**: Advanced city-level filtering that enables customers to discover products in their immediate vicinity, ensuring freshness and reducing delivery carbon footprint.
*   **Automatic Stock Deduction**: A real-time inventory system that atomically updates stock levels (in kg) the moment an order is accepted, effectively preventing overselling and inventory errors.
