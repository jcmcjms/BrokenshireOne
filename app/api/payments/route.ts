import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import { recordPayment } from '@/lib/supabase/queries';
import type { ApiResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (!session.permissions.includes('payments.process')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { order_id, amount, method } = await request.json();

    if (!order_id || amount === undefined || !method) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'order_id, amount, and method are required' },
        { status: 400 },
      );
    }

    if (!['cash', 'card'].includes(method)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Method must be cash or card' },
        { status: 400 },
      );
    }

    const payment = await recordPayment({ order_id, amount, method });

    return NextResponse.json<ApiResponse>(
      { success: true, data: payment },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to record payment' },
      { status: 500 },
    );
  }
}

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
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

    let query = (supabase
      .from('payments') as any)
      .select('*, orders!inner(user_id)')
      .order('paid_at', { ascending: false })
      .limit(limit);

    if (session.role !== 'admin' && session.role !== 'manager') {
      query = query.eq('orders.user_id', session.user_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 },
    );
  }
}
