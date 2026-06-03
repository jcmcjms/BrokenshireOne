import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { getUserById } from '@/lib/supabase/queries';
import { notFoundResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (_request, _params, session) => {
  const user = await getUserById(session.user_id);

  if (!user) {
    return notFoundResponse('User');
  }

  const { password_hash, roles, ...safeUser } = user as any;

  return NextResponse.json<ApiResponse>({
    success: true,
    data: { ...safeUser, role: session.role, permissions: session.permissions },
  });
});
