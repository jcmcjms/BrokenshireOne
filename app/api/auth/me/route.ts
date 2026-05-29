import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserById } from '@/lib/supabase/queries';
import type { ApiResponse } from '@/types';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const user = await getUserById(session.user_id);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    const { password_hash, roles, ...safeUser } = user as any;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { ...safeUser, role: session.role, permissions: session.permissions },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 },
    );
  }
}
