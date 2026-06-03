import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (_request, _params, session) => {
  const { data, error } = await db('notifications')
    .select('*')
    .eq('user_id', session.user_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return NextResponse.json<ApiResponse>({ success: true, data: data ?? [] });
});

export const PATCH = apiHandler(async (request: NextRequest, _params, session) => {
  const { read_all } = await request.json();

  if (read_all) {
    const { error } = await db('notifications')
      .update({ read: true })
      .eq('user_id', session.user_id)
      .eq('read', false);

    if (error) throw error;

    return NextResponse.json<ApiResponse>({ success: true, message: 'All marked as read' });
  }

  return badRequestResponse('Invalid request');
});
