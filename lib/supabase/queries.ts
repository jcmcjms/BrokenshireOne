import { supabase } from './client';
import type { Role } from '@/types';
import type {
  DbUser,
  DbRolePermission,
  DbMenuCategory,
  DbMenuItem,
  DbOrder,
  DbOrderItem,
  DbCreditAllowance,
  DbCreditTransaction,
  DbInventoryItem,
  DbInventoryMovement,
  DbUserPermission,
  DbPermission,
} from '@/types/database';

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*, roles(name)')
    .eq('email', email)
    .single();

  if (error) {
    // Log query-level errors (e.g. missing env vars, connectivity issues)
    // so they surface in Vercel logs instead of silently returning null
    console.error('[queries] getUserByEmail error:', error?.message || error);
    return null;
  }
  return data as unknown as DbUser;
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*, roles(name)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as unknown as DbUser;
}

export async function getRolePermissions(roleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permissions!inner(code)')
    .eq('role_id', roleId);

  if (error) return [];
  return (data as unknown as { permissions: { code: string } }[])
    .map((rp) => rp.permissions?.code)
    .filter(Boolean) as string[];
}

export async function getMenuCategories(): Promise<DbMenuCategory[]> {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data as unknown as DbMenuCategory[]) ?? [];
}

export async function getMenuItems(categoryId?: string): Promise<DbMenuItem[]> {
  let query = supabase
    .from('menu_items')
    .select('*, menu_categories(name)');

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as DbMenuItem[]) ?? [];
}

export async function getOrders(limit = 50): Promise<DbOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, users!orders_user_id_fkey(name), staff:users!orders_staff_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as DbOrder[]) ?? [];
}

export async function getOrderById(id: string): Promise<DbOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, users!orders_user_id_fkey(name), staff:users!orders_staff_id_fkey(name), order_items(*, menu_items(name))')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as unknown as DbOrder;
}

export async function getUserCreditAllowance(userId: string, month: number, year: number): Promise<DbCreditAllowance | null> {
  const { data, error } = await supabase
    .from('credit_allowances')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as DbCreditAllowance | null;
}

export async function getCreditTransactions(userId: string, month: number, year: number): Promise<DbCreditTransaction[]> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as DbCreditTransaction[]) ?? [];
}

export async function getDashboardStats(date?: string) {
  const filterDate = date ?? new Date().toISOString().split('T')[0];
  const nextDay = new Date(filterDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];

  const [ordersRes, activeRes, usersRes, pendingRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total', { count: 'exact', head: false })
      .gte('created_at', filterDate)
      .lt('created_at', nextDayStr),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('active', true),
    supabase
      .from('credit_transactions')
      .select('id', { count: 'exact', head: true })
      .is('order_id', null),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (activeRes.error) throw activeRes.error;
  if (usersRes.error) throw usersRes.error;
  if (pendingRes.error) throw pendingRes.error;

  const total_revenue_today = (ordersRes.data ?? []).reduce(
    (sum: number, o: any) => sum + (o.total ?? 0),
    0,
  );

  // Low stock counts (fetch and filter in JS since Supabase can't do column-to-column comparison)
  const [allInventoryRes, lowStockMenuRes] = await Promise.all([
    supabase
      .from('inventory_items')
      .select('id, quantity, min_stock_level'),
    supabase
      .from('menu_items')
      .select('id, stock_quantity', { count: 'exact', head: true })
      .gt('stock_quantity', 0)
      .lt('stock_quantity', 5),
  ]);

  const lowStockInventoryCount = (allInventoryRes.data ?? []).filter(
    (item: any) => item.min_stock_level > 0 && item.quantity < item.min_stock_level,
  ).length;

  return {
    total_orders_today: ordersRes.count ?? 0,
    total_revenue_today,
    active_orders: activeRes.count ?? 0,
    total_users: usersRes.count ?? 0,
    low_stock_items: {
      inventory: lowStockInventoryCount,
      menu_items: lowStockMenuRes.count ?? 0,
      total: lowStockInventoryCount + (lowStockMenuRes.count ?? 0),
    },
    pending_credits: pendingRes.count ?? 0,
  };
}

export async function createOrder(
  orderData: {
    order_number: string;
    user_id: string;
    staff_id?: string | null;
    status: string;
    total: number;
    payment_method: string;
    cash_given?: number | null;
    change_amount?: number | null;
    notes?: string | null;
  },
  items: { item_id: string; quantity: number; unit_price: number }[],
) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderData as any)
    .select()
    .single();

  if (orderError) throw orderError;

  const orderItems = items.map((item) => ({
    order_id: (order as any).id,
    ...item,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems as any);

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', (order as any).id);
    throw itemsError;
  }

  return order as unknown as DbOrder;
}

export async function updateOrderStatus(id: string, status: string, staffId: string): Promise<DbOrder> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, staff_id: staffId } as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbOrder;
}

export async function recordPayment(paymentData: {
  order_id: string;
  amount: number;
  method: 'cash' | 'card';
  reference?: string | null;
}) {
  const { data, error } = await supabase
    .from('payments')
    .insert({ ...paymentData, paid_at: new Date().toISOString() } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deductCredit(
  userId: string,
  amount: number,
  orderId: string,
  month: number,
  year: number,
) {
  const { data: allowance, error: fetchError } = await supabase
    .from('credit_allowances')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const allowanceData = allowance as unknown as DbCreditAllowance | null;
  const newUsed = (allowanceData?.used_amount ?? 0) + amount;
  if (newUsed > (allowanceData?.limit_amount ?? 0)) {
    throw new Error('Credit limit exceeded');
  }

  const { data: updated, error: updateError } = await supabase
    .from('credit_allowances')
    .update({ used_amount: newUsed } as any)
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .select()
    .single();

  if (updateError) throw updateError;

  const { error: txError } = await supabase.from('credit_transactions').insert({
    user_id: userId,
    order_id: orderId,
    amount,
    type: 'meal',
    month,
    year,
    notes: null,
  } as any);

  if (txError) throw txError;

  return updated as unknown as DbCreditAllowance;
}

export async function getUsersByRole(role: Role): Promise<DbUser[]> {
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', role as string)
    .single();

  if (roleError) throw roleError;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role_id', (roleData as any).id)
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return (data as unknown as DbUser[]) ?? [];
}

export async function getUserByEmployeeId(employeeId: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*, roles(name)')
    .eq('employee_id', employeeId)
    .single();

  if (error) {
    console.error('[queries] getUserByEmployeeId error:', error?.message || error);
    return null;
  }
  return data as unknown as DbUser;
}

export async function createUser(userData: {
  name: string;
  email: string;
  password_hash: string;
  role_id: string;
  employee_id: string;
  monthly_credit_limit: number;
}): Promise<DbUser> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      name: userData.name,
      email: userData.email,
      password_hash: userData.password_hash,
      role_id: userData.role_id,
      employee_id: userData.employee_id,
      monthly_credit_limit: userData.monthly_credit_limit,
      active: true,
    } as any)
    .select('*, roles(name)')
    .single();

  if (error) throw error;
  return data as unknown as DbUser;
}

export async function updateUser(
  id: string,
  updates: {
    name?: string;
    email?: string;
    role_id?: string;
    employee_id?: string;
    monthly_credit_limit?: number;
    active?: boolean;
    password_hash?: string;
  },
): Promise<DbUser> {
  const { data, error } = await supabase
    .from('users')
    .update(updates as any)
    .eq('id', id)
    .select('*, roles(name)')
    .single();

  if (error) throw error;
  return data as unknown as DbUser;
}

export async function deactivateUser(id: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ active: false } as any)
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Permission Override Queries
// ============================================================================

export async function getAllPermissions(): Promise<DbPermission[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('module', { ascending: true })
    .order('code', { ascending: true });

  if (error) throw error;
  return (data as unknown as DbPermission[]) ?? [];
}

export async function getUserPermissionOverrides(userId: string): Promise<DbUserPermission[]> {
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*, permissions!inner(code)')
      .eq('user_id', userId);

    if (error) return [];
    return (data as unknown as DbUserPermission[]) ?? [];
  } catch {
    // Table may not exist yet (migration not applied)
    return [];
  }
}

export async function setUserPermissionOverrides(
  userId: string,
  overrides: Record<string, boolean | null>,
): Promise<void> {
  try {
    // Get all permission IDs
    const { data: allPerms, error: permError } = await supabase
      .from('permissions')
      .select('id, code');

    if (permError) throw permError;
    const permMap = new Map((allPerms ?? []).map((p: any) => [p.code, p.id]));

    // Process each override
    for (const [code, value] of Object.entries(overrides)) {
      const permissionId = permMap.get(code);
      if (!permissionId) continue;

      if (value === null) {
        // Remove override — reset to role default
        await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission_id', permissionId);
      } else {
        // Upsert override (grant or revoke)
        const existing = await supabase
          .from('user_permissions')
          .select('id')
          .eq('user_id', userId)
          .eq('permission_id', permissionId)
          .maybeSingle();

        if ((existing as any)?.data) {
          await supabase
            .from('user_permissions')
            .update({ is_granted: value } as any)
            .eq('user_id', userId)
            .eq('permission_id', permissionId);
        } else {
          await supabase
            .from('user_permissions')
            .insert({
              user_id: userId,
              permission_id: permissionId,
              is_granted: value,
            } as any);
        }
      }
    }
  } catch {
    // Table may not exist yet (migration not applied)
    throw new Error('Permission overrides table not available. Run migration 00003.');
  }
}

export async function getEffectivePermissions(userId: string): Promise<string[]> {
  // 1. Get user's role
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role_id')
    .eq('id', userId)
    .single();

  if (userError || !user) return [];

  const roleId = (user as any).role_id;

  // 2. Get role-based permissions
  const { data: rolePerms, error: roleError } = await supabase
    .from('role_permissions')
    .select('permissions!inner(code)')
    .eq('role_id', roleId);

  if (roleError) return [];

  const rolePermissions = new Set(
    (rolePerms as unknown as { permissions: { code: string } }[])
      .map((rp: any) => rp.permissions?.code)
      .filter(Boolean),
  );

  // 3. Get user-level overrides
  const { data: userPerms, error: userPermError } = await supabase
    .from('user_permissions')
    .select('*, permissions!inner(code)')
    .eq('user_id', userId);

  if (!userPermError) {
    for (const up of (userPerms as unknown as DbUserPermission[]) ?? []) {
      const code = (up as any).permissions?.code;
      if (code) {
        if (up.is_granted) {
          rolePermissions.add(code);
        } else {
          rolePermissions.delete(code);
        }
      }
    }
  }

  return Array.from(rolePermissions);
}

export async function getAllRoles(): Promise<{ id: string; name: string; description: string }[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('id, name, description')
    .order('name');

  if (error) throw error;
  return (data as any) ?? [];
}

// ============================================================================
// Inventory Queries
// ============================================================================

export async function getInventoryItems(category?: string): Promise<DbInventoryItem[]> {
  let query = supabase
    .from('inventory_items')
    .select('*')
    .order('name');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as DbInventoryItem[]) ?? [];
}

export async function getInventoryItemById(id: string): Promise<DbInventoryItem | null> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as unknown as DbInventoryItem;
}

export async function createInventoryItem(item: {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock_level: number;
  unit_cost?: number | null;
}): Promise<DbInventoryItem> {
  const { data, error } = await supabase
    .from('inventory_items')
    .insert(item as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbInventoryItem;
}

export async function updateInventoryItem(
  id: string,
  updates: {
    name?: string;
    category?: string;
    unit?: string;
    min_stock_level?: number;
    unit_cost?: number | null;
  },
): Promise<DbInventoryItem> {
  const { data, error } = await supabase
    .from('inventory_items')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbInventoryItem;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function recordInventoryMovement(movement: {
  item_id: string;
  type: 'addition' | 'removal' | 'adjustment';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string | null;
  performed_by: string;
}): Promise<DbInventoryMovement> {
  const { data, error } = await supabase
    .from('inventory_movements')
    .insert(movement as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbInventoryMovement;
}

export async function getInventoryMovements(itemId: string): Promise<DbInventoryMovement[]> {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*, users(name)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data as unknown as DbInventoryMovement[]) ?? [];
}

export async function getLowStockInventory(): Promise<DbInventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('name');

  if (error) throw error;
  return ((data as unknown as DbInventoryItem[]) ?? []).filter(
    (item) => item.min_stock_level > 0 && item.quantity < item.min_stock_level,
  );
}

export async function getLowStockMenuItems(): Promise<DbMenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_categories(name)')
    .gt('stock_quantity', 0)
    .lt('stock_quantity', 5)
    .order('stock_quantity', { ascending: true });

  if (error) throw error;
  return (data as unknown as DbMenuItem[]) ?? [];
}

export async function getMenuItemByBarcode(barcode: string): Promise<DbMenuItem | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_categories(name)')
    .eq('barcode', barcode)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as DbMenuItem | null;
}

export async function decrementMenuItemStock(itemId: string, quantity: number = 1): Promise<void> {
  // Get current stock
  const { data: item, error: fetchError } = await supabase
    .from('menu_items')
    .select('stock_quantity, available')
    .eq('id', itemId)
    .single();

  if (fetchError) throw fetchError;
  if (!item) throw new Error(`Menu item ${itemId} not found`);

  const currentStock = (item as any).stock_quantity ?? 0;
  const newStock = Math.max(0, currentStock - quantity);

  const updates: any = { stock_quantity: newStock };
  if (newStock === 0) {
    updates.available = false;
  }

  const { error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', itemId);

  if (error) throw error;
}
