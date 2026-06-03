import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { notFoundResponse, badRequestResponse, isNotFoundError } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (_request: NextRequest, params) => {
  const { id } = params;

  const { data: member, error: memberError } = await db('library_members')
    .select('*, users(name, email)')
    .eq('id', id)
    .single();

  if (memberError) {
    if (isNotFoundError(memberError)) {
      return notFoundResponse('Library member');
    }
    throw memberError;
  }

  // Fetch active borrowings for this member
  const { data: activeBorrowings } = await db('library_borrowings')
    .select('*, library_books(title, author)')
    .eq('member_id', id)
    .in('status', ['active', 'overdue'])
    .order('due_at', { ascending: true });

  return NextResponse.json<ApiResponse>({
    success: true,
    data: {
      ...member,
      active_borrowings: activeBorrowings ?? [],
    },
  });
}, { permissions: ['library.browse', 'library.manage_members'] });

export const PUT = apiHandler(async (request: NextRequest, params, session) => {
  const { id } = params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.membership_type !== undefined) {
    const validTypes = ['student', 'faculty', 'staff'];
    if (!validTypes.includes(body.membership_type)) {
      return badRequestResponse(`Invalid membership type. Must be one of: ${validTypes.join(', ')}`);
    }
    updates.membership_type = body.membership_type;
  }
  if (body.max_books_allowed !== undefined) {
    updates.max_books_allowed = body.max_books_allowed;
  }
  if (body.borrow_duration_days !== undefined) {
    updates.borrow_duration_days = body.borrow_duration_days;
  }
  if (body.is_active !== undefined) {
    updates.is_active = body.is_active;
  }

  if (Object.keys(updates).length === 0) {
    return badRequestResponse('No fields to update');
  }

  const { data, error } = await db('library_members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return notFoundResponse('Library member');
    }
    throw error;
  }

  await logAdminAction(session, AuditActions.LIBRARY_MEMBER_UPDATE, 'library_member', id, {
    updated_fields: Object.keys(updates),
  });

  return NextResponse.json<ApiResponse>({ success: true, data });
}, { permissions: ['library.manage_members'] });
