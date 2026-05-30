// Database row types for Supabase queries
export interface DbRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface DbPermission {
  id: string;
  code: string;
  description: string | null;
  module: string;
}

export interface DbRolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  permissions?: { code: string } | DbPermission;
}

export interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role_id: string;
  employee_id: string | null;
  monthly_credit_limit: number;
  active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  roles?: { name: string } | DbRole;
}

export interface DbMenuCategory {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbMenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  available: boolean;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
  menu_categories?: { name: string } | DbMenuCategory;
}

export interface DbOrder {
  id: string;
  order_number: string;
  user_id: string;
  staff_id: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  total: number;
  payment_method: 'cash' | 'card' | 'credit';
  notes: string | null;
  created_at: string;
  updated_at: string;
  users?: { name: string } | DbUser;
  staff?: { name: string } | DbUser;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  menu_items?: { name: string } | DbMenuItem;
}

export interface DbPayment {
  id: string;
  order_id: string;
  amount: number;
  method: 'cash' | 'card';
  reference: string | null;
  paid_at: string;
}

export interface DbCreditAllowance {
  id: string;
  user_id: string;
  month: number;
  year: number;
  limit_amount: number;
  used_amount: number;
  created_at: string;
  updated_at: string;
}

export interface DbCreditTransaction {
  id: string;
  user_id: string;
  order_id: string | null;
  amount: number;
  type: 'meal' | 'deduction' | 'adjustment';
  month: number;
  year: number;
  notes: string | null;
  created_at: string;
}

export interface DbInventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock_level: number;
  unit_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  grant: boolean;
  created_at: string;
  permissions?: { code: string } | DbPermission;
}

export interface DbInventoryMovement {
  id: string;
  item_id: string;
  type: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  performed_by: string;
  created_at: string;
  users?: { name: string } | DbUser;
}
