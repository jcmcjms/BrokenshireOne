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

  let query = db('library_reservations')
    .select('*, library_books(title, author)');

  if (memberId) {
    query = query.eq('member_id', memberId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('reserved_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  return NextResponse.json<ApiResponse>({ success: true, data: data ?? [] });
}, { permissions: ['library.browse', 'library.borrow'] });

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  const { member_id, book_id } = await request.json();

  if (!member_id) return badRequestResponse('Member ID is required');
  if (!book_id) return badRequestResponse('Book ID is required');

  // --- Validate book exists ---
  const { data: book, error: bookError } = await db('library_books')
    .select('*')
    .eq('id', book_id)
    .single();

  if (bookError || !book) {
    return badRequestResponse('Book not found');
  }

  // --- Check for existing active reservation ---
  const { data: existingReservation } = await db('library_reservations')
    .select('id')
    .eq('member_id', member_id)
    .eq('book_id', book_id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingReservation) {
    return badRequestResponse('You already have an active reservation for this book');
  }

  // --- Check if member has active borrowings of this book ---
  const { data: existingBorrowing } = await db('library_borrowings')
    .select('id')
    .eq('member_id', member_id)
    .eq('book_id', book_id)
    .in('status', ['active', 'overdue'])
    .maybeSingle();

  if (existingBorrowing) {
    return badRequestResponse('You already have this book checked out');
  }

  // --- Calculate expiration (72 hours from now) ---
  const reservedAt = new Date();
  const expiresAt = new Date(reservedAt);
  expiresAt.setHours(expiresAt.getHours() + 72);

  const { data, error } = await db('library_reservations')
    .insert({
      member_id,
      book_id,
      reserved_at: reservedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction(session, AuditActions.LIBRARY_RESERVE, 'library_reservation', data?.id ?? null, {
    member_id,
    book_id,
    book_title: book.title,
    expires_at: expiresAt.toISOString(),
  });

  return NextResponse.json<ApiResponse>(
    { success: true, data },
    { status: 201 },
  );
}, { permissions: ['library.borrow'] });
