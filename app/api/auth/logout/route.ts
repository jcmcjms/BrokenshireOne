import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth/session';
import type { ApiResponse } from '@/types';

export async function POST() {
  try {
    await clearSession();

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to logout' },
      { status: 500 },
    );
  }
}
