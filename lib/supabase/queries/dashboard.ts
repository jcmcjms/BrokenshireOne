import { supabase } from '@/lib/supabase/client';

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
