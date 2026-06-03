import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { getAllRoles } from '@/lib/supabase/queries';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async () => {
  const roles = await getAllRoles();

  return NextResponse.json<ApiResponse>({
    success: true,
    data: roles,
  });
}, { roles: ['admin', 'manager'] });
