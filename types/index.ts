export type Role = 'admin' | 'manager' | 'staff' | 'faculty' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role_id: string;
  role: Role;
  employee_id: string | null;
  monthly_credit_limit: number;
  active: boolean;
  avatar_url: string | null;
  created_at: string;
  permissions?: string[];
}

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
}

export interface MenuItem {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  image_url: string | null;
  available: boolean;
  stock_quantity: number;
  barcode: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  user_name?: string;
  staff_id: string | null;
  staff_name?: string;
  status: 'pending' | 'completed' | 'cancelled';
  total: number;
  payment_method: 'cash' | 'card' | 'credit';
  cash_given?: number | null;
  change_amount?: number | null;
  notes: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  item_name?: string;
  quantity: number;
  unit_price: number;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: 'cash' | 'card';
  reference: string | null;
  paid_at: string;
}

export interface CreditAllowance {
  id: string;
  user_id: string;
  user_name?: string;
  month: number;
  year: number;
  limit_amount: number;
  used_amount: number;
  remaining: number;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  user_name?: string;
  order_id: string | null;
  amount: number;
  type: 'meal' | 'deduction' | 'adjustment';
  month: number;
  year: number;
  notes: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_orders_today: number;
  total_revenue_today: number;
  active_orders: number;
  total_users: number;
  low_stock_items: { inventory: number; menu_items: number; total: number };
  pending_credits: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'produce' | 'meat' | 'dairy' | 'dry_goods' | 'beverage' | 'other';
  quantity: number;
  unit: string;
  min_stock_level: number;
  unit_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  type: 'addition' | 'removal' | 'adjustment';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  performed_by: string;
  performed_by_name?: string;
  created_at: string;
}

export interface UserPermissionOverride {
  user_id: string;
  permission_id: string;
  code: string;
  is_granted: boolean;
}

export interface UserPermissionsResponse {
  user_id: string;
  role: string;
  role_permissions: string[];
  overrides: Record<string, boolean | null>;
  effective_permissions: string[];
}

export interface PermissionInfo {
  id: string;
  code: string;
  description: string;
  module: string;
}

export interface LowStockSummary {
  inventory: InventoryItem[];
  menu_items: (MenuItem & { category_name?: string })[];
  total: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

export interface SalaryDeductionLimit {
  id: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  month: number;
  year: number;
  max_deduction_limit: number;
  total_deducted: number;
  remaining: number;
}

export interface SalaryDeduction {
  id: string;
  user_id: string;
  user_name?: string;
  amount: number;
  deduction_type: 'loan' | 'uniform' | 'damages' | 'other';
  reason: string | null;
  month: number;
  year: number;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export type DeductionType = 'loan' | 'uniform' | 'damages' | 'other';

export const DEDUCTION_TYPES: { value: DeductionType; label: string }[] = [
  { value: 'loan', label: 'Loan' },
  { value: 'uniform', label: 'Uniform' },
  { value: 'damages', label: 'Damages' },
  { value: 'other', label: 'Other' },
]

export interface JwtPayload {
  user_id: string;
  email: string;
  role: Role;
  role_id: string;
  permissions: string[];
  session_version?: number;
  iat?: number;
  exp?: number;
}
