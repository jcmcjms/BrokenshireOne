import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { updateUser, deactivateUser, bumpUserSessionVersion } from '@/lib/supabase/queries';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { notFoundResponse, badRequestResponse, isNotFoundError } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (_request, params, session) => {
  if (session.role !== 'admin') {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Forbidden' },
      { status: 403 },
    );
  }

  const { id } = params;

  const { data: user, error } = await db('users')
    .select('*, roles(name)')
    .eq('id', id)
    .single();

  if (error || !user) {
    return notFoundResponse('User');
  }

  const { password_hash, roles, ...safeUser } = user as any;
  const roleName = roles?.name ?? 'student';

  return NextResponse.json<ApiResponse>({
    success: true,
    data: { ...safeUser, role: roleName },
  });
}, { roles: ['admin'] });

export const PUT = apiHandler(async (request: NextRequest, params, session) => {
  if (session.role !== 'admin') {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Forbidden' },
      { status: 403 },
    );
  }

  const { id } = params;
  const body = await request.json();

  // Build updates object — only allow specific fields
  const updates: Record<string, any> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.email !== undefined) updates.email = body.email;
  if (body.role_id !== undefined) updates.role_id = body.role_id;
  if (body.employee_id !== undefined) updates.employee_id = body.employee_id;
  if (body.monthly_credit_limit !== undefined) updates.monthly_credit_limit = body.monthly_credit_limit;
  if (body.active !== undefined) updates.active = body.active;

  if (Object.keys(updates).length === 0) {
    return badRequestResponse('No valid fields to update');
  }

  const updated = await updateUser(id, updates);

  logAdminAction(session, AuditActions.USER_UPDATE, 'user', id, {
    changes: Object.keys(body),
    role_changed: body.role_id !== undefined,
  });

  if (body.role_id !== undefined) {
    await bumpUserSessionVersion(id);
  }

  const { password_hash, roles, ...safeUser } = updated as any;
  const roleName = roles?.name ?? 'student';

  return NextResponse.json<ApiResponse>({
    success: true,
    data: { ...safeUser, role: roleName },
  });
}, { roles: ['admin'] });

export const DELETE = apiHandler(async (_request: NextRequest, params, session) => {
  if (session.role !== 'admin') {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Forbidden' },
      { status: 403 },
    );
  }

  const { id } = params;

  // Prevent self-deactivation
  if (id === session.user_id) {
    return badRequestResponse('Cannot deactivate your own account');
  }

  await deactivateUser(id);

  logAdminAction(session, AuditActions.USER_DEACTIVATE, 'user', id);

  return NextResponse.json<ApiResponse>({
    success: true,
    message: 'User deactivated successfully',
  });
}, { roles: ['admin'] });
