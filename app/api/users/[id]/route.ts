import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import { updateUser, deactivateUser } from '@/lib/supabase/queries';
import { bumpUserSessionVersion } from '@/lib/supabase/queries';
import { logAdminAction, AuditActions } from '@/lib/audit';
import type { ApiResponse } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (session.role !== 'admin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { id } = await params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*, roles(name)')
      .eq('id', id)
      .single();

    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    const { password_hash, roles, ...safeUser } = user as any;
    const roleName = roles?.name ?? 'student';

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { ...safeUser, role: roleName },
    });
  } catch (error) {
    console.error('[users/[id] GET] Error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (session.role !== 'admin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { id } = await params;
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
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    const updated = await updateUser(id, updates);

    await logAdminAction(session, AuditActions.USER_UPDATE, 'user', id, {
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
  } catch (error: any) {
    console.error('[users/[id] PUT] Error:', error?.message || error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error?.message || 'Failed to update user' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (session.role !== 'admin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { id } = await params;

    // Prevent self-deactivation
    if (id === session.user_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Cannot deactivate your own account' },
        { status: 400 },
      );
    }

    await deactivateUser(id);

    await logAdminAction(session, AuditActions.USER_DEACTIVATE, 'user', id);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error: any) {
    console.error('[users/[id] DELETE] Error:', error?.message || error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error?.message || 'Failed to deactivate user' },
      { status: 500 },
    );
  }
}
