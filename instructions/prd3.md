# CHAPTER 3: SYSTEM DESIGN


## 3.2 System Design
System design is the process of planning the structure of the system based on the requirements. It defines the main modules, system architecture, components, and how they interact to make the system work properly.

### 3.2.1 Architectural Design
The architectural design of GreenBasket provides a high-level view of how the system is structured and how different components communicate. It includes the React-based user interface, Supabase backend services (Auth, Database, Storage), and the various context providers that manage the application state. High-level data flows between the farmers, customers, administrators, and the Supabase-hosted services ensure a seamless marketplace experience.

### 3.2.3 Interface Design
Designing the interface for the GreenBasket marketplace involves creating user-friendly screens for farmers, customers, and administrators. Here's a breakdown of the interface design:

1.  **Marketplace (Home)**
    *   **Header**: Contains the GreenBasket logo, navigation menu (Home, Dashboard/Cart, Logout), and role-specific shortcuts.
    *   **Search Bar & Filters**: Allows customers to search for products by keyword (name) and filter based on City/Location to find local fresh goods.
    *   **Product Listings**: A responsive grid of product cards showing high-quality images, price per kg, farmer location with a 📍 icon, and current stock availability.

2.  **Farmer Dashboard**
    *   **Quick Stats**: A summary panel showing the number of active products, pending orders, and total sales overview.
    *   **My Products**: A management list displaying the farmer's inventory with status badges (Pending, Approved, Rejected) and options to Edit or Delete items.
    *   **Order Management**: A dedicated section to view incoming customer orders with specific details and buttons to "Accept" (triggering automatic stock deduction) or "Reject" requests.

3.  **Admin Dashboard**
    *   **Farmer Applications**: A verification interface for reviewing pending farmer registration details and farm addresses before granting access.
    *   **Product Approvals**: A queue showing new product listings that require admin review to maintain marketplace quality.
    *   **User & Order Management**: Comprehensive views to monitor all registered users and track every order placed within the system.

4.  **Product Management (Farmer)**
    *   A standardized form for entering product Name, Category, Price, Stock (in kg), and Description, along with a secure image upload utility.

5.  **Customer Cart & Checkout**
    *   **Cart Management**: A view for users to review selected items, adjust quantities, see real-time price totals, and remove items if necessary.
    *   **Checkout Flow**: A streamlined process where clicking "Place Order" transmits the request to farmers and automatically clears the customer's cart.

6.  **Farmer Onboarding**
    *   A specialized submission page for new farmers to provide their farm's physical address and city, ensuring their products are correctly categorized by location.

7.  **Authentication**
    *   Integrated Login and Registration pages featuring role selection (Farmer or Customer) and robust form validation using Supabase Auth.

8.  **Profile & Location Management**
    *   A simple interface to view user details and ensure the user's city is correctly recorded for regional product filtering.


### 3.2.5 Data Flow Diagram (Level 0)
The Level 0 Data Flow Diagram (DFD), also known as a Context Diagram, illustrates the high-level data flows between external entities and the GreenBasket system using the Gane-Sarson notation.



### 3.2.6 Data Flow Diagram (Level 1)
The Level 1 DFD breaks down the main GreenBasket system into sub-processes, showing how data moves between processes and internal data stores.



### 3.2.4 Database Design
The database for GreenBasket is managed via Supabase (PostgreSQL). Below is the En



#### Database Table Descriptions:
*   **PROFILES**: Stores user identity and role-based metadata.
*   **FARMER_APPLICATIONS**: Stores farm verification details awaiting admin approval.
*   **PRODUCTS**: Contains marketplace listings with stock tracking in kilograms.
*   **ORDERS**: Tracks purchase intents and status (Pending/Accepted/Rejected).
*   **ORDER_ITEMS**: Breaks down individual products and quantities within an order.

---

# CHAPTER 4: IMPLEMENTATION AND TESTING

## 4.1 Implementation 
In this chapter, we focus on implementing GreenBasket, a farmer-to-consumer marketplace, by transforming technical specifications into a functional system. The development process includes requirement refinement, technology selection (React and Supabase), frontend and backend development, and database integration with PostgreSQL. Key features implemented include role-based authentication, farmer application workflows, product management (CRUD) with image uploads, location-based searching, shopping cart management, and a real-time order processing pipeline with automatic stock deduction. The system provides farmers with the ability to list products after verification, while customers can browse fresh goods by city, manage orders, and purchase directly. Through meticulous planning and development, the platform delivers a secure and efficient commerce experience for sustainable agricultural trade.

### 4.1.1 Tools Used
The following tools and technologies were used to develop the GreenBasket Platform:

**Frontend Tools**
*   **React 18**: A JavaScript library used to build the user interface with a component-based architecture for high performance and maintainability.
*   **Vite**: A modern build tool that provides fast Hot Module Replacement (HMR) and optimized production bundles.
*   **Tailwind CSS**: Used for styling the interface with a utility-first approach and a custom color scheme, ensuring a premium and responsive user experience.
*   **Lucide React**: Used for implementing a consistent and modern set of icons across the marketplace.

**Backend Tools**
*   **Supabase**: Used as the backend-as-a-service platform, providing secure authentication, a real-time PostgreSQL database, and bucket-based file storage for product images.
*   **Supabase Auth**: Manages user registration, login, and role-based access control (RBAC) specifically for Farmers, Customers, and Admins.

**Database**
*   **PostgreSQL (via Supabase)**: Relational database used to store system data including user profiles, farmer applications, products, orders, and order items.
*   **Row Level Security (RLS)**: Implemented to ensure data integrity and security, restricting access so farmers only manage their own products and customers only view their own orders.

**Development Tools**
*   **Visual Studio Code**: The primary source code editor used for writing logic and debugging with TypeScript support.
*   **Vite Dev Server**: Used for local hosting and testing during the implementation phase.

**Documentation Tools**
*   **MS Office**: Used for writing and editing the project documentation and reports.

### 4.1.2 Implementation Details of Modules

1.  **User Module (Authentication & Profiles)**: Users can create accounts as either Farmers or Customers. Authentication is handled securely via Supabase. Profiles store essential data like email and location (City), which is critical for the location-based discovery system.
2.  **Farmer Module (Application & Verification)**: New farmers submit an application containing farm details. This module ensures that only verified farmers (approved by Admin) can list products, maintaining marketplace quality.
3.  **Product Management Module (CRUD)**: Farmers can create, read, update, and delete their products. This includes uploading images to Supabase storage and setting stock levels in kilograms (kg). All products start in a "pending" state until approved by an admin.
4.  **Marketplace & Discovery Module**: A dynamic interface where customers can browse approved products. It features real-time search by product name and a location-based filter that allows users to find products in specific cities.
5.  **Order & Transaction Module**: Includes a shopping cart where customers can manage quantities. During checkout, an order is created. The module also handles the farmer's side of order management, allowing them to Accept or Reject orders.
6.  **Stock Management Module**: A specialized unit-based system (kg) that automatically deducts stock from products when a farmer accepts an order. It prevents negative stock levels and ensures real-time availability for other customers.
7.  **Admin Module**: Provides a central dashboard for platform moderators to review farmer applications and product listings, ensuring the marketplace remains verified and professional.

---

## 4.2 Testing

Testing is a critical phase in software development that ensures the system functions correctly and meets all specified requirements. The GreenBasket Platform underwent comprehensive testing at multiple levels to verify functionality, identify bugs, and ensure a smooth user experience. Testing was conducted in two main phases: Unit Testing and System Testing.

### Unit Testing
It focuses on testing individual components and functions in isolation to ensure they work correctly. Each module, such as authentication, farmer application submission, and product management, was tested independently to verify that it produces the expected output for given inputs.

### Table.1. Unit Test Cases for GreenBasket

| Test Case ID | Module/Function | Input | Expected Outcome | Actual Outcome | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC01 | User Registration | Email: farmer@test.com, Password: password123, Role: Farmer | User account created successfully, redirected to login/onboarding | Successful Registration, redirected to onboarding | Pass |
| TC02 | User Login | Email: farmer@test.com, Password: password123 | User authenticated successfully, redirected to appropriate dashboard | User logged in successfully, redirected to dashboard | Pass |
| TC03 | Farmer Application | Farm Address: "Baneshwor", City: "Kathmandu" | Application submitted with "pending" status | Application "pending", stored in database | Pass |
| TC04 | Admin Approval | Action: Approve Farmer Application (ID: 101) | Application status updated to "approved", user profile city updated | Application "approved", city synced to profile | Pass |
| TC05 | Create Product | Product: "Organic Apple", Price: 250, Category: "Fruits", Stock: 50 | Product created with "pending" status, image uploaded | Product "pending" created successfully | Pass |
| TC06 | Product Approval | Action: Approve Product "Organic Apple" | Product status → "approved", visible in marketplace | Product "approved", displayed to customers | Pass |
| TC07 | Search & Filter | Query: "Apple", Filter: Kathmandu | Only "Apple" products from "Kathmandu" are displayed | Relevant products displayed correctly | Pass |
| TC08 | Cart Management | Action: Add "Organic Apple" (2kg) to cart | Cart total updated, item added to shopping cart | Cart updated correctly | Pass |
| TC09 | Order Placement | Action: Checkout with 2kg Apples | Order created with "pending" status, cart cleared | Order "pending", cart cleared successfully | Pass |
| TC10 | Order Processing | Action: Farmer accepts order (2kg Apples) | Order status → "accepted", product stock reduces by 2kg | Order "accepted", stock deducted from 50 to 48 | Pass |
| TC11 | Delete Product | Action: Farmer deletes product | Product record removed from database/view | Product deleted successfully | Pass |

---

# CHAPTER 5: CONCLUSION AND FUTURE RECOMMENDATIONS

## 5.1 Lesson Learned / Outcome
This project helped us gain practical experience and apply the knowledge learned from previous courses in a real-world system. While developing GreenBasket, many concepts that seemed theoretical in class became clearer during implementation. Building features like farmer registration workflows, product approval systems, real-time stock management, and location-based filters was challenging at times, but it was a valuable and rewarding learning experience.

GreenBasket was developed using React (Vite), Tailwind CSS, and Supabase for authentication, database, and storage. The system has been tested and implemented successfully. This platform is user-friendly and provides a useful solution for farmers to reach consumers directly and for customers to find fresh, local produce efficiently.

## 5.2 Conclusion 
In conclusion, the GreenBasket project has demonstrated strong potential and usefulness for both agricultural producers and urban consumers. The platform helps farmers manage their inventory and orders, while allowing customers to discover fresh goods by location. It reduces the dependency on middleman markups and encourages a transparent, direct-to-consumer marketplace. Overall, GreenBasket fulfills the main project objectives and serves as a meaningful full-stack application developed with modern web technologies.

## 5.3 Future Recommendations 
In the future, GreenBasket can be improved by adding:
•	Real-time chat between farmers and customers.
•	Integrated Payment Gateway (e.g., Stripe, Khalti, or Esewa).
•	SMS and Push Notifications for order status updates.
•	Mobile application version for easier on-the-go management.
•	Advanced sales analytics and inventory forecasting for farmers.
