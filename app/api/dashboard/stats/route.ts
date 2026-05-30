import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import { getDashboardStats } from '@/lib/supabase/queries';
import type { ApiResponse, DashboardStats } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') ?? undefined;

    if (session.role === 'admin' || session.role === 'manager') {
      const stats = await getDashboardStats(date);
      return NextResponse.json<ApiResponse>({ success: true, data: stats });
    }

    const today = date ?? new Date().toISOString().split('T')[0];

    const dbOrders = supabase.from('orders') as any;
    const [ordersRes, activeRes] = await Promise.all([
      dbOrders
        .select('id, total', { count: 'exact' })
        .eq('user_id', session.user_id)
        .gte('created_at', today),
      dbOrders
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user_id)
        .eq('status', 'pending'),
    ]);

    if (ordersRes.error) throw ordersRes.error;
    if (activeRes.error) throw activeRes.error;

    const stats: DashboardStats = {
      total_orders_today: ordersRes.count ?? 0,
      total_revenue_today: (ordersRes.data ?? []).reduce(
        (sum: number, o: Record<string, unknown>) => sum + ((o.total as number) ?? 0),
        0,
      ),
      active_orders: activeRes.count ?? 0,
      total_users: 0,
      low_stock_items: { inventory: 0, menu_items: 0, total: 0 },
      pending_credits: 0,
    };

    return NextResponse.json<ApiResponse>({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 },
    );
  }
}
