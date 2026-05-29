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

export async function getDashboardStats() {
  const today = new Date().toISOString().split('T')[0];
  const [ordersRes, activeRes, usersRes, pendingRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total', { count: 'exact', head: false })
      .gte('created_at', today),
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

  return {
    total_orders_today: ordersRes.count ?? 0,
    total_revenue_today,
    active_orders: activeRes.count ?? 0,
    total_users: usersRes.count ?? 0,
    low_stock_items: 0,
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
