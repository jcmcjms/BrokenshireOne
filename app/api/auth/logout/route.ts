import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { clearSession } from '@/lib/auth/session';
import type { ApiResponse } from '@/types';

export const POST = apiHandler(async () => {
  await clearSession();

  return NextResponse.json<ApiResponse>({
    success: true,
    message: 'Logged out successfully',
  });
}, { requireAuth: false });
