import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAllRoles } from '@/lib/supabase/queries';
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

    if (session.role !== 'admin' && session.role !== 'manager') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const roles = await getAllRoles();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('[roles] Error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch roles' },
      { status: 500 },
    );
  }
}
