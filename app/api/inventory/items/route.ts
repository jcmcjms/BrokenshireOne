import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import { logAdminAction, AuditActions } from '@/lib/audit';
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
    const category = searchParams.get('category') ?? undefined;

    let query = (supabase.from('inventory_items') as any)
      .select('*')
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json<ApiResponse>({ success: true, data: data ?? [] });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch inventory items' },
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

    const { name, category, quantity, unit, min_stock_level, unit_cost } = await request.json();

    if (!name || !category || !unit) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'name, category, and unit are required' },
        { status: 400 },
      );
    }

    const validCategories = ['produce', 'meat', 'dairy', 'dry_goods', 'beverage', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 },
      );
    }

    const db = supabase.from('inventory_items') as any;
    const { data, error } = await db
      .insert({
        name,
        category,
        quantity: quantity ?? 0,
        unit,
        min_stock_level: min_stock_level ?? 0,
        unit_cost: unit_cost ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(session, AuditActions.INVENTORY_ADJUST, 'inventory_item', data?.id ?? null, {
      name,
      category,
      quantity: quantity ?? 0,
      unit,
    }).catch(() => {});

    return NextResponse.json<ApiResponse>(
      { success: true, data },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to create inventory item' },
      { status: 500 },
    );
  }
}
