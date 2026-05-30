import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (!session.permissions.includes('menu.view') && !session.permissions.includes('menu.manage')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');

    if (!itemId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'item_id query parameter is required' },
        { status: 400 },
      );
    }

    const db = supabase.from('inventory_movements') as any;
    const { data, error } = await db
      .select('*, users(name)')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const movements = (data ?? []).map((m: any) => ({
      ...m,
      performed_by_name: m.users?.name ?? null,
      users: undefined,
    }));

    return NextResponse.json<ApiResponse>({ success: true, data: movements });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch inventory movements' },
      { status: 500 },
    );
  }
}
