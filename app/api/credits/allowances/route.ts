import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import { logAdminAction, AuditActions } from '@/lib/audit';
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

    if (!session.permissions.includes('credits.manage')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { user_id, month, year, limit_amount } = await request.json();

    if (!user_id || !month || !year || limit_amount === undefined) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'user_id, month, year, and limit_amount are required' },
        { status: 400 },
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Month must be between 1 and 12' },
        { status: 400 },
      );
    }

    const { data: existing } = await supabase
      .from('credit_allowances')
      .select('*')
      .eq('user_id', user_id)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();

    let result;

    if (existing) {
      const db = supabase.from('credit_allowances') as any;
      const { data, error } = await db
        .update({ limit_amount })
        .eq('id', (existing as Record<string, unknown>).id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const db = supabase.from('credit_allowances') as any;
      const { data, error } = await db
        .insert({
          user_id,
          month,
          year,
          limit_amount,
          used_amount: 0,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    await logAdminAction(session, AuditActions.CREDIT_ADJUST, 'credit_allowance', result?.id ?? null, {
      user_id,
      month,
      year,
      limit_amount,
      was_update: !!existing,
    }).catch(() => {});

    return NextResponse.json<ApiResponse>(
      { success: true, data: result },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to save credit allowance' },
      { status: 500 },
    );
  }
}
