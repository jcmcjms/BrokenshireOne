import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { recordPayment } from '@/lib/supabase/queries';
import { badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const POST = apiHandler(async (request: NextRequest) => {
  const { order_id, amount, method } = await request.json();

  if (!order_id || amount === undefined || !method) {
    return badRequestResponse('order_id, amount, and method are required');
  }

  if (!['cash', 'card'].includes(method)) {
    return badRequestResponse('Method must be cash or card');
  }

  const payment = await recordPayment({ order_id, amount, method });

  return NextResponse.json<ApiResponse>(
    { success: true, data: payment },
    { status: 201 },
  );
}, { permissions: ['payments.process'] });

export const GET = apiHandler(async (request: NextRequest, _params, session) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

  let query = db('payments')
    .select('*, orders!inner(user_id)')
    .order('paid_at', { ascending: false })
    .limit(limit);

  if (session.role !== 'admin' && session.role !== 'manager') {
    query = query.eq('orders.user_id', session.user_id);
  }

  const { data, error } = await query;

  if (error) throw error;

  return NextResponse.json<ApiResponse>({ success: true, data });
});
