import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { notFoundResponse, badRequestResponse, isNotFoundError } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

// ---------------------------------------------------------------------------
// PATCH — process a borrowing action: return, renew, or mark as lost
// ---------------------------------------------------------------------------

export const PATCH = apiHandler(async (request: NextRequest, params, session) => {
  const { id } = params;
  const { action } = await request.json();

  if (!action || !['return', 'renew', 'lost'].includes(action)) {
    return badRequestResponse('Action must be one of: return, renew, lost');
  }

  // --- Fetch the borrowing record ---
  const { data: borrowing, error: fetchError } = await db('library_borrowings')
    .select('*, library_books(*), library_members(*)')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (isNotFoundError(fetchError)) {
      return notFoundResponse('Borrowing record');
    }
    throw fetchError;
  }

  if (borrowing.status === 'returned') {
    return badRequestResponse('Book has already been returned');
  }

  const book = borrowing.library_books as any;
  const member = borrowing.library_members as any;

  switch (action) {
    // ---- Return ----
    case 'return': {
      const returnedAt = new Date().toISOString();

      const { data: updated, error: updateError } = await db('library_borrowings')
        .update({ returned_at: returnedAt, status: 'returned' })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Increment available copies
      await db('library_books')
        .update({ available_copies: (book?.available_copies ?? 0) + 1 })
        .eq('id', borrowing.book_id);

      await logAdminAction(session, AuditActions.LIBRARY_RETURN, 'library_borrowing', id, {
        book_title: book?.title,
        returned_at: returnedAt,
      });

      return NextResponse.json<ApiResponse>({ success: true, data: updated });
    }

    // ---- Renew ----
    case 'renew': {
      const maxRenewals = 2;
      if (borrowing.renewed_count >= maxRenewals) {
        return badRequestResponse(`Maximum renewals (${maxRenewals}) reached`);
      }

      const borrowDays = member?.borrow_duration_days ?? 7;
      const currentDue = new Date(borrowing.due_at);
      const newDue = new Date(currentDue);
      newDue.setDate(newDue.getDate() + borrowDays);

      const { data: renewed, error: renewError } = await db('library_borrowings')
        .update({
          due_at: newDue.toISOString(),
          renewed_count: borrowing.renewed_count + 1,
          status: 'active',
        })
        .eq('id', id)
        .select()
        .single();

      if (renewError) throw renewError;

      await logAdminAction(session, AuditActions.LIBRARY_RENEW, 'library_borrowing', id, {
        previous_due: borrowing.due_at,
        new_due: newDue.toISOString(),
        renewed_count: borrowing.renewed_count + 1,
      });

      return NextResponse.json<ApiResponse>({ success: true, data: renewed });
    }

    // ---- Mark as Lost ----
    case 'lost': {
      const { data: markedLost, error: lostError } = await db('library_borrowings')
        .update({ status: 'lost' })
        .eq('id', id)
        .select()
        .single();

      if (lostError) throw lostError;

      // Create a fine for the lost book
      const fineAmount = (book as any)?.total_copies
        ? Math.round((book as any).total_copies * 1.5)
        : 500;

      await db('library_fines').insert({
        borrowing_id: id,
        member_id: borrowing.member_id,
        amount: fineAmount,
        reason: 'lost',
        status: 'pending',
      });

      await logAdminAction(session, AuditActions.LIBRARY_BORROW, 'library_borrowing', id, {
        action: 'mark_lost',
        fine_amount: fineAmount,
      });

      return NextResponse.json<ApiResponse>({ success: true, data: markedLost });
    }

    default:
      return badRequestResponse('Unknown action');
  }
}, { permissions: ['library.borrow'] });

// ---------------------------------------------------------------------------
// PUT — update borrowing metadata (admin override)
// ---------------------------------------------------------------------------

export const PUT = apiHandler(async (request: NextRequest, params, session) => {
  const { id } = params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.due_at !== undefined) updates.due_at = body.due_at;
  if (body.status !== undefined) updates.status = body.status;

  if (Object.keys(updates).length === 0) {
    return badRequestResponse('No fields to update');
  }

  const { data, error } = await db('library_borrowings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return notFoundResponse('Borrowing record');
    }
    throw error;
  }

  await logAdminAction(session, AuditActions.LIBRARY_BORROW, 'library_borrowing', id, {
    updated_fields: Object.keys(updates),
  });

  return NextResponse.json<ApiResponse>({ success: true, data });
}, { permissions: ['library.borrow'] });
