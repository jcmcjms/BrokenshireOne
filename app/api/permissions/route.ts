import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAllPermissions } from '@/lib/supabase/queries';
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

    if (session.role !== 'admin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const permissions = await getAllPermissions();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error('[permissions] Error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch permissions' },
      { status: 500 },
    );
  }
}
