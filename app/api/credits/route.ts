import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { getCreditTransactions } from '@/lib/supabase/queries';
import { getCurrentMonthYear, flattenRelation, flattenRelations } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (request: NextRequest, _params, session) => {
  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get('month')) || getCurrentMonthYear().month;
  const year = Number(searchParams.get('year')) || getCurrentMonthYear().year;

  if (session.role === 'admin' || session.role === 'manager') {
    const { data: allowances, error: allowanceError } = await db('credit_allowances')
      .select('*, users(name)')
      .eq('month', month)
      .eq('year', year)
      .order('user_id');

    if (allowanceError) throw allowanceError;

    const data = (allowances ?? []).map((a: any) => ({
      ...flattenRelation(a, 'users', 'user_name'),
      remaining: (a.limit_amount ?? 0) - (a.used_amount ?? 0),
    }));

    return NextResponse.json<ApiResponse>({ success: true, data });
  }

  if (session.role === 'faculty') {
    const { data: allowances, error: allowanceError } = await db('credit_allowances')
      .select('*, users(name)')
      .eq('user_id', session.user_id)
      .eq('month', month)
      .eq('year', year);

    if (allowanceError) throw allowanceError;

    const transactions = await getCreditTransactions(session.user_id, month, year);

    const allowanceData = (allowances ?? []).map((a: any) => ({
      ...flattenRelation(a, 'users', 'user_name'),
      remaining: (a.limit_amount ?? 0) - (a.used_amount ?? 0),
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { allowances: allowanceData, transactions },
    });
  }

  return NextResponse.json<ApiResponse>(
    { success: false, error: 'Forbidden' },
    { status: 403 },
  );
});
