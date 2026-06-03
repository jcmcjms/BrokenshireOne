import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import type { ApiResponse } from '@/types';

export const PATCH = apiHandler(async (_request, params, session) => {
  const { id } = params;

  const { error } = await db('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', session.user_id);

  if (error) throw error;

  return NextResponse.json<ApiResponse>({ success: true });
});
