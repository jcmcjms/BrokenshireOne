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
  unit: string;
  image_url: string | null;
  available: boolean;
  stock_quantity: number;
  barcode: string | null;
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
  cash_given: number | null;
  change_amount: number | null;
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
  is_granted: boolean;
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

export interface DbSalaryDeductionLimit {
  id: string;
  user_id: string;
  month: number;
  year: number;
  max_deduction_limit: number;
  total_deducted: number;
  created_at: string;
  updated_at: string;
  users?: { name: string } | DbUser;
}

export interface DbSalaryDeduction {
  id: string;
  user_id: string;
  amount: number;
  deduction_type: 'loan' | 'uniform' | 'damages' | 'other';
  reason: string | null;
  month: number;
  year: number;
  created_by: string;
  created_at: string;
  users?: { name: string } | DbUser;
  creator?: { name: string } | DbUser;
}

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

export interface DbLibraryBook {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  published_year: number | null;
  category: string;
  description: string | null;
  cover_image_url: string | null;
  total_copies: number;
  available_copies: number;
  shelf_location: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbLibraryMember {
  id: string;
  user_id: string;
  membership_type: 'student' | 'faculty' | 'staff';
  max_books_allowed: number;
  borrow_duration_days: number;
  joined_at: string;
  is_active: boolean;
  users?: { name: string; email: string } | DbUser;
}

export interface DbLibraryBorrowing {
  id: string;
  member_id: string;
  book_id: string;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  renewed_count: number;
  status: 'active' | 'returned' | 'overdue' | 'lost';
  processed_by: string | null;
  library_books?: { title: string; author: string } | DbLibraryBook;
  library_members?: { membership_type: string } | DbLibraryMember;
  processor?: { name: string } | DbUser;
}

export interface DbLibraryReservation {
  id: string;
  member_id: string;
  book_id: string;
  reserved_at: string;
  expires_at: string;
  status: 'pending' | 'fulfilled' | 'expired' | 'cancelled';
  fulfilled_borrowing_id: string | null;
  library_books?: { title: string; author: string } | DbLibraryBook;
  library_members?: { membership_type: string } | DbLibraryMember;
}

export interface DbLibraryFine {
  id: string;
  borrowing_id: string | null;
  member_id: string;
  amount: number;
  reason: 'overdue' | 'damaged' | 'lost';
  status: 'pending' | 'paid' | 'waived';
  created_at: string;
  paid_at: string | null;
  waived_by: string | null;
  library_members?: { membership_type: string } | DbLibraryMember;
  waiving_user?: { name: string } | DbUser;
}
