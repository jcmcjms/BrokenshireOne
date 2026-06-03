import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { getAllPermissions } from '@/lib/supabase/queries';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async () => {
  const permissions = await getAllPermissions();

  return NextResponse.json<ApiResponse>({
    success: true,
    data: permissions,
  });
}, { roles: ['admin'] });
