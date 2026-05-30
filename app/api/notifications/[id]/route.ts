import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { id } = await params;

    const { error } = await (supabase as any)
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', session.user_id);

    if (error) throw error;

    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 },
    );
  }
}
