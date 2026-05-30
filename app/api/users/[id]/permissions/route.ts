import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import { getEffectivePermissions, getUserPermissionOverrides, setUserPermissionOverrides, getAllPermissions } from '@/lib/supabase/queries';
import type { ApiResponse, UserPermissionsResponse } from '@/types';
import type { DbUser } from '@/types/database';

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

    // Get user with role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*, roles(name)')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    const userData = user as unknown as DbUser;
    const roleName = (userData as any).roles?.name ?? 'student';

    // Get role-based permissions
    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('permissions!inner(code)')
      .eq('role_id', userData.role_id);

    const rolePermissions = ((rolePerms ?? []) as any[])
      .map((rp: any) => rp.permissions?.code)
      .filter(Boolean);

    // Get user overrides
    const overrides = await getUserPermissionOverrides(id);
    const overrideMap: Record<string, boolean | null> = {};
    for (const ov of overrides) {
      const code = (ov as any).permissions?.code;
      if (code) {
        overrideMap[code] = ov.grant;
      }
    }

    // Get effective permissions
    const effectivePermissions = await getEffectivePermissions(id);

    const data: UserPermissionsResponse = {
      user_id: id,
      role: roleName,
      role_permissions: rolePermissions,
      overrides: overrideMap,
      effective_permissions: effectivePermissions,
    };

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    console.error('[users/[id]/permissions GET] Error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch user permissions' },
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
    const { overrides } = await request.json();

    if (!overrides || typeof overrides !== 'object') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'overrides object is required with permission codes as keys' },
        { status: 400 },
      );
    }

    await setUserPermissionOverrides(id, overrides);

    // Return updated effective permissions
    const effectivePermissions = await getEffectivePermissions(id);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { effective_permissions: effectivePermissions },
    });
  } catch (error) {
    console.error('[users/[id]/permissions PUT] Error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update user permissions' },
      { status: 500 },
    );
  }
}
