import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getUserByEmployeeId, getEffectivePermissions } from '@/lib/supabase/queries';
import { verifyPassword } from '@/lib/auth/password';
import { setSession } from '@/lib/auth/session';
import type { ApiResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { employee_id, password } = await request.json();

    if (!employee_id || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Employee ID and password are required' },
        { status: 400 },
      );
    }

    const user = await getUserByEmployeeId(employee_id.trim().toUpperCase());

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid credentials' },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid credentials' },
        { status: 401 },
      );
    }

    if (!user.active) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Account is deactivated' },
        { status: 403 },
      );
    }

    const roleName = (user as any).roles?.name ?? 'student';
    const permissions = await getEffectivePermissions(user.id);

    // Fetch user's session_version for JWT invalidation
    const { data: userVer } = await supabase
      .from('users')
      .select('session_version')
      .eq('id', user.id)
      .single();
    const sessionVersion = (userVer as any)?.session_version ?? 0;

    await setSession({
      user_id: user.id,
      email: user.email,
      role: roleName,
      role_id: user.role_id,
      permissions,
      session_version: sessionVersion,
    });

    const { password_hash, roles, ...safeUser } = user as any;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { ...safeUser, role: roleName, permissions },
    });
  } catch (error: any) {
    console.error('[LOGIN ERROR]', error?.message || error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error?.message || 'An error occurred during login' },
      { status: 500 },
    );
  }
}
