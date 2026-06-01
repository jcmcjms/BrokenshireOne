import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import { logAdminAction, AuditActions } from '@/lib/audit';
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
    const { name, sort_order, active } = await request.json();
    const updates: Record<string, unknown> = {};

    if (name !== undefined) updates.name = name;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (active !== undefined) updates.active = active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No fields to update' },
        { status: 400 },
      );
    }

    const db = supabase.from('menu_categories') as any;
    const { data, error } = await db
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Category not found' },
          { status: 404 },
        );
      }
      throw error;
    }

    await logAdminAction(session, AuditActions.MENU_UPDATE, 'menu_category', id, {
      updated_fields: Object.keys(updates),
    }).catch(() => {});

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update category' },
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

    const dbDel = supabase.from('menu_categories') as any;
    const { error } = await dbDel
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Category not found' },
          { status: 404 },
        );
      }
      throw error;
    }

    await logAdminAction(session, AuditActions.MENU_DELETE, 'menu_category', id).catch(() => {});

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Category deleted',
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to delete category' },
      { status: 500 },
    );
  }
}
