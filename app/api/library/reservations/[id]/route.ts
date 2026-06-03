import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { notFoundResponse, isNotFoundError } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const DELETE = apiHandler(async (_request: NextRequest, params, session) => {
  const { id } = params;

  // Soft-delete: update status to cancelled instead of hard delete
  const { data, error } = await db('library_reservations')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return notFoundResponse('Reservation');
    }
    throw error;
  }

  await logAdminAction(session, AuditActions.LIBRARY_CANCEL_RESERVATION, 'library_reservation', id);

  return NextResponse.json<ApiResponse>({
    success: true,
    data,
    message: 'Reservation cancelled',
  });
}, { permissions: ['library.borrow'] });
