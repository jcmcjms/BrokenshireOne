import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? undefined;

  let query = db('library_members')
    .select('*, users(name, email)')
    .order('joined_at', { ascending: false });

  if (search) {
    query = query.or(
      `users.name.ilike.%${search}%,users.email.ilike.%${search}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return NextResponse.json<ApiResponse>({ success: true, data: data ?? [] });
}, { permissions: ['library.browse', 'library.manage_members'] });

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  const { user_id, membership_type } = await request.json();

  if (!user_id) return badRequestResponse('User ID is required');
  if (!membership_type) return badRequestResponse('Membership type is required');

  const validTypes = ['student', 'faculty', 'staff'];
  if (!validTypes.includes(membership_type)) {
    return badRequestResponse(`Invalid membership type. Must be one of: ${validTypes.join(', ')}`);
  }

  // --- Check if user already has a library membership ---
  const { data: existing } = await db('library_members')
    .select('id')
    .eq('user_id', user_id)
    .maybeSingle();

  if (existing) {
    return badRequestResponse('User already has a library membership');
  }

  // --- Set defaults based on membership type ---
  const maxBooks: Record<string, number> = {
    student: 3,
    faculty: 5,
    staff: 5,
  };
  const borrowDays: Record<string, number> = {
    student: 7,
    faculty: 14,
    staff: 14,
  };

  const { data, error } = await db('library_members')
    .insert({
      user_id,
      membership_type,
      max_books_allowed: maxBooks[membership_type] ?? 3,
      borrow_duration_days: borrowDays[membership_type] ?? 7,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction(session, AuditActions.LIBRARY_MEMBER_CREATE, 'library_member', data?.id ?? null, {
    user_id,
    membership_type,
  });

  return NextResponse.json<ApiResponse>(
    { success: true, data },
    { status: 201 },
  );
}, { permissions: ['library.manage_members'] });
