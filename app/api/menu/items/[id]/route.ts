import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';

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
    const { category_id, name, description, price, image_url, available, stock_quantity, barcode, unit } = await request.json();
    const updates: Record<string, unknown> = {};

    if (category_id !== undefined) updates.category_id = category_id;
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (image_url !== undefined) updates.image_url = image_url;
    if (available !== undefined) updates.available = available;
    if (stock_quantity !== undefined) updates.stock_quantity = stock_quantity;
    if (barcode !== undefined) updates.barcode = barcode;
    if (unit !== undefined) updates.unit = unit;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No fields to update' },
        { status: 400 },
      );
    }

    const db = supabase.from('menu_items') as any;
    const { data, error } = await db
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Menu item not found' },
          { status: 404 },
        );
      }
      throw error;
    }

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update menu item' },
      { status: 500 },
    );
  }
}

/**
 * PATCH is an alias for PUT — the frontend sends PATCH for partial updates.
 */
export const PATCH = PUT;

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

    const dbDel = supabase.from('menu_items') as any;
    const { error } = await dbDel
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Menu item not found' },
          { status: 404 },
        );
      }
      throw error;
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Menu item deleted',
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to delete menu item' },
      { status: 500 },
    );
  }
}
