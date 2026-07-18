export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
  permissions?: string[];
  is_active?: boolean;
}

export interface Customer {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  business_name?: string;
  location?: string;
  tags?: string[];
  notes?: string;
  is_vip?: boolean;
  loyalty_points?: number;
  outstanding_balance?: number;
  total_transactions?: number;
  created_at: string;
  timeline?: Transaction[];
}

export interface Transaction {
  id: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  module: 'cyber_service' | 'product_sale';
  service_id?: number;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: 'paid' | 'pending' | 'partial';
  served_by_name?: string;
  due_date?: string;
  created_at: string;
}

export interface Product {
  id: string;
  sku?: string;
  barcode?: string;
  name: string;
  category: string;
  brand?: string;
  buying_price: number;
  selling_price: number;
  supplier?: string;
  quantity: number;
  min_stock: number;
  warranty?: string;
  image_url?: string;
  serial_number?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceCatalogItem {
  id: number;
  name: string;
  category: string;
  default_price: number;
  icon?: string;
}

export interface Task {
  id: string;
  title: string;
  client_id?: string;
  client_name?: string;
  description?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'waiting' | 'completed' | 'cancelled';
  assigned_to?: string;
  assigned_to_name?: string;
  reminder_before?: string;
  created_at: string;
}

export interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  issue_date: string;
  due_date?: string;
  items: InvoiceItem[];
  subtotal: number;
  vat: number;
  discount: number;
  total: number;
  status: 'unpaid' | 'paid' | 'overdue' | 'draft' | 'partial';
  terms?: string;
  created_at: string;
}

export interface DashboardSummary {
  todays_revenue: number;
  yesterday_revenue: number;
  outstanding_debts: number;
  debtor_customers: number;
  pending_tasks: number;
  high_priority_tasks: number;
  completed_tasks_today: number;
  todays_customers: number;
  low_stock_items: number;
}
