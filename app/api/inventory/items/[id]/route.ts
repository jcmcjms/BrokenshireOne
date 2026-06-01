import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import { logAdminAction, AuditActions } from '@/lib/audit';
import type { ApiResponse } from '@/types';

export async function GET(
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

    if (!session.permissions.includes('menu.view') && !session.permissions.includes('menu.manage')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const db = supabase.from('inventory_items') as any;
    const { data, error } = await db
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Inventory item not found' },
          { status: 404 },
        );
      }
      throw error;
    }

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch inventory item' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
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

    if (!session.permissions.includes('menu.manage')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const { name, category, unit, min_stock_level, unit_cost } = await request.json();
    const updates: Record<string, unknown> = {};

    if (name !== undefined) updates.name = name;
    if (category !== undefined) {
      const validCategories = ['produce', 'meat', 'dairy', 'dry_goods', 'beverage', 'other'];
      if (!validCategories.includes(category)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 },
        );
      }
      updates.category = category;
    }
    if (unit !== undefined) updates.unit = unit;
    if (min_stock_level !== undefined) updates.min_stock_level = min_stock_level;
    if (unit_cost !== undefined) updates.unit_cost = unit_cost;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No fields to update' },
        { status: 400 },
      );
    }

    const db = supabase.from('inventory_items') as any;
    const { data, error } = await db
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Inventory item not found' },
          { status: 404 },
        );
      }
      throw error;
    }

    await logAdminAction(session, AuditActions.INVENTORY_ADJUST, 'inventory_item', id, {
      updated_fields: Object.keys(updates),
    }).catch(() => {});

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update inventory item' },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    if (!session.permissions.includes('menu.manage')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { id } = await params;

    const db = supabase.from('inventory_items') as any;
    const { error } = await db
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Inventory item not found' },
          { status: 404 },
        );
      }
      throw error;
    }

    await logAdminAction(session, AuditActions.INVENTORY_ADJUST, 'inventory_item', id).catch(() => {});

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Inventory item deleted',
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to delete inventory item' },
      { status: 500 },
    );
  }
}
