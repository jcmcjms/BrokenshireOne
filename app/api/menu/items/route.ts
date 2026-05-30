import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import { getMenuItems } from '@/lib/supabase/queries';
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
    const categoryId = searchParams.get('category_id') ?? undefined;
    const barcode = searchParams.get('barcode');

    // If barcode query param is provided, do a single-item lookup by barcode
    if (barcode) {
      const { data: item, error: barcodeError } = await supabase
        .from('menu_items')
        .select('*, menu_categories(name)')
        .eq('barcode', barcode)
        .maybeSingle();

      if (barcodeError) throw barcodeError;

      if (!item) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Item not found' },
          { status: 404 },
        );
      }

      const mapped = {
        ...(item as any),
        category_name: (item as any).menu_categories?.name ?? null,
        menu_categories: undefined,
      };

      return NextResponse.json<ApiResponse>({ success: true, data: mapped });
    }

    const items = await getMenuItems(categoryId);

    const data = (items as any[]).map((item: any) => ({
      ...item,
      category_name: item.menu_categories?.name ?? null,
      menu_categories: undefined,
    }));

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch menu items' },
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

    const { category_id, name, description, price, image_url, available, stock_quantity, barcode, unit } = await request.json();

    if (!category_id || !name || price === undefined) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'category_id, name, and price are required' },
        { status: 400 },
      );
    }

    const db = supabase.from('menu_items') as any;
    const insertData: Record<string, unknown> = {
      category_id,
      name,
      description: description ?? '',
      price,
      image_url: image_url ?? null,
      available: available ?? true,
    };
    if (barcode !== undefined) insertData.barcode = barcode;
    if (stock_quantity !== undefined) insertData.stock_quantity = parseInt(String(stock_quantity), 10) || 0;
    insertData.unit = unit ?? 'serving';

    const { data, error } = await db
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json<ApiResponse>(
      { success: true, data },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to create menu item' },
      { status: 500 },
    );
  }
}
