import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { notFoundResponse, badRequestResponse, isNotFoundError } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const PUT = apiHandler(async (request: NextRequest, params, session) => {
  const { id } = params;
  const { action } = await request.json();

  if (!action || !['pay', 'waive'].includes(action)) {
    return badRequestResponse('Action must be either "pay" or "waive"');
  }

  // --- Fetch the fine record ---
  const { data: fine, error: fetchError } = await db('library_fines')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (isNotFoundError(fetchError)) {
      return notFoundResponse('Fine record');
    }
    throw fetchError;
  }

  if (fine.status !== 'pending') {
    return badRequestResponse(`Fine has already been ${fine.status}`);
  }

  switch (action) {
    case 'pay': {
      const { data, error } = await db('library_fines')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAdminAction(session, AuditActions.LIBRARY_FINE_PAY, 'library_fine', id, {
        amount: fine.amount,
        reason: fine.reason,
      });

      return NextResponse.json<ApiResponse>({ success: true, data });
    }

    case 'waive': {
      const { data, error } = await db('library_fines')
        .update({
          status: 'waived',
          waived_by: session.user_id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAdminAction(session, AuditActions.LIBRARY_FINE_WAIVE, 'library_fine', id, {
        amount: fine.amount,
        reason: fine.reason,
        waived_by: session.user_id,
      });

      return NextResponse.json<ApiResponse>({ success: true, data });
    }

    default:
      return badRequestResponse('Unknown action');
  }
}, { permissions: ['library.manage_fines'] });
