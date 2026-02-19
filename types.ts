export type UserRole = 'admin' | 'farmer' | 'customer';
export type ProductStatus = 'pending' | 'approved' | 'rejected';
export type FarmerStatus = 'pending' | 'active' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  status: FarmerStatus;
  created_at: string;
}

export interface Product {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  location?: string;
  stock_quantity: number;
  status: ProductStatus;
  created_at: string;
  // Optional joined field for display
  farmer_email?: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  product?: Product; // Joined product data
}

export interface Order {
  id: string;
  customer_id: string;
  total_price: number;
  created_at: string;
  customer_email?: string; // Joined data
  status?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  product_name?: string; // Joined data
}

export interface FarmerApplication {
  id: string;
  user_id: string;
  full_name: string;
  farm_name: string;
  farm_type: string;
  farm_address?: any;
  phone?: string | null;
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  profiles?: { email?: string };
}
