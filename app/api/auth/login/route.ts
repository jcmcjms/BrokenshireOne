import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { getUserByEmployeeId, getEffectivePermissions } from '@/lib/supabase/queries';
import { verifyPassword } from '@/lib/auth/password';
import { setSession } from '@/lib/auth/session';
import { badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const POST = apiHandler(async (request: NextRequest) => {
  const { employee_id, password } = await request.json();

  if (!employee_id || !password) {
    return badRequestResponse('Employee ID and password are required');
  }

  const user = await getUserByEmployeeId(employee_id.trim().toUpperCase());

  if (!user) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Invalid credentials' },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(password, (user as any).password_hash);
  if (!valid) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Invalid credentials' },
      { status: 401 },
    );
  }

  if (!(user as any).active) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Account is deactivated' },
      { status: 403 },
    );
  }

  const roleName = (user as any).roles?.name ?? 'student';
  const permissions = await getEffectivePermissions(user.id);

  // Fetch user's session_version for JWT invalidation
  const { data: userVer } = await db('users')
    .select('session_version')
    .eq('id', user.id)
    .single();
  const sessionVersion = (userVer as any)?.session_version ?? 0;

  await setSession({
    user_id: user.id,
    email: (user as any).email,
    role: roleName,
    role_id: (user as any).role_id,
    permissions,
    session_version: sessionVersion,
  });

  const { password_hash, roles, ...safeUser } = user as any;

  return NextResponse.json<ApiResponse>({
    success: true,
    data: { ...safeUser, role: roleName, permissions },
  });
}, { requireAuth: false });
