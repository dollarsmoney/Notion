export type UserRole = 'user' | 'vendor';
export type ProductStatus = 'draft' | 'active' | 'inactive';
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'fulfilled';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'abandoned';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  total_amount: number;
  currency: string;
  status: OrderStatus;
  created_at: string;
  order_items: OrderItem[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
