import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('member_id') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  let query = db('library_borrowings')
    .select('*, library_books(title, author), processor:users!processed_by(name)');

  if (memberId) {
    query = query.eq('member_id', memberId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('borrowed_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  return NextResponse.json<ApiResponse>({ success: true, data: data ?? [] });
}, { permissions: ['library.browse', 'library.borrow'] });

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  const { member_id, book_id } = await request.json();

  if (!member_id) return badRequestResponse('Member ID is required');
  if (!book_id) return badRequestResponse('Book ID is required');

  // --- Validate member ---
  const { data: member, error: memberError } = await db('library_members')
    .select('*')
    .eq('id', member_id)
    .single();

  if (memberError || !member) {
    return badRequestResponse('Library member not found');
  }

  if (!member.is_active) {
    return badRequestResponse('Library member account is inactive');
  }

  // --- Check member's active borrow count ---
  const { count: activeCount, error: countError } = await db('library_borrowings')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', member_id)
    .in('status', ['active', 'overdue']);

  if (countError) throw countError;

  if (activeCount != null && activeCount >= member.max_books_allowed) {
    return badRequestResponse(
      `Member has reached the maximum borrowing limit of ${member.max_books_allowed} books`,
    );
  }

  // --- Validate book availability ---
  const { data: book, error: bookError } = await db('library_books')
    .select('*')
    .eq('id', book_id)
    .single();

  if (bookError || !book) {
    return badRequestResponse('Book not found');
  }

  if (book.available_copies < 1) {
    return badRequestResponse('No available copies of this book');
  }

  // --- Calculate due date ---
  const borrowedAt = new Date();
  const dueAt = new Date(borrowedAt);
  dueAt.setDate(dueAt.getDate() + member.borrow_duration_days);

  // --- Create borrowing (uses Supabase transaction best-effort) ---
  const { data: borrowing, error: borrowError } = await db('library_borrowings')
    .insert({
      member_id,
      book_id,
      borrowed_at: borrowedAt.toISOString(),
      due_at: dueAt.toISOString(),
      status: 'active',
      renewed_count: 0,
      processed_by: session.user_id,
    })
    .select()
    .single();

  if (borrowError) throw borrowError;

  // --- Decrement available copies ---
  const { error: updateError } = await db('library_books')
    .update({ available_copies: book.available_copies - 1 })
    .eq('id', book_id);

  if (updateError) {
    // Attempt rollback — delete the borrowing record
    await db('library_borrowings').delete().eq('id', borrowing!.id);
    throw updateError;
  }

  await logAdminAction(session, AuditActions.LIBRARY_BORROW, 'library_borrowing', borrowing?.id ?? null, {
    member_id,
    book_id: book.id,
    book_title: book.title,
    due_at: dueAt.toISOString(),
  });

  return NextResponse.json<ApiResponse>(
    { success: true, data: borrowing },
    { status: 201 },
  );
}, { permissions: ['library.borrow'] });
