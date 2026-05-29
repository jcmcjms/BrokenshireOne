import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import { getCreditTransactions } from '@/lib/supabase/queries';
import type { ApiResponse } from '@/types';

function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
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
    const month = Number(searchParams.get('month')) || getCurrentMonthYear().month;
    const year = Number(searchParams.get('year')) || getCurrentMonthYear().year;

    if (session.role === 'admin' || session.role === 'manager') {
      const db = supabase.from('credit_allowances') as any;
      const { data: allowances, error: allowanceError } = await db
        .select('*, users(name)')
        .eq('month', month)
        .eq('year', year)
        .order('user_id');

      if (allowanceError) throw allowanceError;

      const data = (allowances ?? []).map((a: any) => ({
        ...a,
        user_name: a.users?.name ?? null,
        users: undefined,
        remaining: (a.limit_amount ?? 0) - (a.used_amount ?? 0),
      }));

      return NextResponse.json<ApiResponse>({ success: true, data });
    }

    if (session.role === 'faculty') {
      const db = supabase.from('credit_allowances') as any;
      const { data: allowances, error: allowanceError } = await db
        .select('*, users(name)')
        .eq('user_id', session.user_id)
        .eq('month', month)
        .eq('year', year);

      if (allowanceError) throw allowanceError;

      const transactions = await getCreditTransactions(session.user_id, month, year);

      const allowanceData = (allowances ?? []).map((a: any) => ({
        ...a,
        user_name: a.users?.name ?? null,
        users: undefined,
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
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch credits' },
      { status: 500 },
    );
  }
}
