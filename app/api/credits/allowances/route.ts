import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  const { user_id, month, year, limit_amount } = await request.json();

  if (!user_id || !month || !year || limit_amount === undefined) {
    return badRequestResponse('user_id, month, year, and limit_amount are required');
  }

  if (month < 1 || month > 12) {
    return badRequestResponse('Month must be between 1 and 12');
  }

  const { data: existing } = await db('credit_allowances')
    .select('*')
    .eq('user_id', user_id)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  let result;

  if (existing) {
    const { data, error } = await db('credit_allowances')
      .update({ limit_amount })
      .eq('id', (existing as Record<string, unknown>).id)
      .select()
      .single();

    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await db('credit_allowances')
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

  logAdminAction(session, AuditActions.CREDIT_ADJUST, 'credit_allowance', result?.id ?? null, {
    user_id,
    month,
    year,
    limit_amount,
    was_update: !!existing,
  });

  return NextResponse.json<ApiResponse>(
    { success: true, data: result },
    { status: 201 },
  );
}, { permissions: ['credits.manage'] });
