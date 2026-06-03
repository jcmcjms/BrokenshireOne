import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { getEffectivePermissions, getUserPermissionOverrides, setUserPermissionOverrides, getAllPermissions } from '@/lib/supabase/queries';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { notFoundResponse, badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse, UserPermissionsResponse } from '@/types';
import type { DbUser } from '@/types/database';

export const GET = apiHandler(async (_request, params, _session) => {
  const { id } = params;

  // Get user with role
  const { data: user, error: userError } = await db('users')
    .select('*, roles(name)')
    .eq('id', id)
    .single();

  if (userError || !user) {
    return notFoundResponse('User');
  }

  const userData = user as unknown as DbUser;
  const roleName = (userData as any).roles?.name ?? 'student';

  // Get role-based permissions
  const { data: rolePerms } = await db('role_permissions')
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
      overrideMap[code] = ov.is_granted;
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
}, { roles: ['admin'] });

export const PUT = apiHandler(async (request: NextRequest, params, session) => {
  const { id } = params;
  const { overrides } = await request.json();

  if (!overrides || typeof overrides !== 'object') {
    return badRequestResponse('overrides object is required with permission codes as keys');
  }

  await setUserPermissionOverrides(id, overrides);

  logAdminAction(session, AuditActions.PERMISSION_OVERRIDE, 'user', id, {
    overrides,
  });

  // Return updated effective permissions
  const effectivePermissions = await getEffectivePermissions(id);

  return NextResponse.json<ApiResponse>({
    success: true,
    data: { effective_permissions: effectivePermissions },
  });
}, { roles: ['admin'] });
