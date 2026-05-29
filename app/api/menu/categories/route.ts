import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
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

    const db = supabase.from('menu_categories') as any;
    const { data, error } = await db
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (!session.permissions.includes('menu.manage')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { name, sort_order } = await request.json();

    if (!name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Name is required' },
        { status: 400 },
      );
    }

    const dbInsert = supabase.from('menu_categories') as any;
    const { data, error } = await dbInsert
      .insert({ name, sort_order: sort_order ?? 0 })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json<ApiResponse>(
      { success: true, data },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to create category' },
      { status: 500 },
    );
  }
}
