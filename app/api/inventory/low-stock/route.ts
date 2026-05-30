import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import type { ApiResponse, LowStockSummary } from '@/types';

export async function GET() {
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

    // Get low stock inventory items (quantity < min_stock_level)
    const invDb = supabase.from('inventory_items') as any;
    const { data: allInventory, error: invError } = await invDb
      .select('*')
      .order('name');

    if (invError) throw invError;

    const lowStockInventory = (allInventory ?? []).filter(
      (item: any) => item.min_stock_level > 0 && item.quantity < item.min_stock_level,
    );

    // Get low stock menu items (stock_quantity > 0 and < 5)
    const menuDb = supabase.from('menu_items') as any;
    const { data: lowStockMenuItems, error: menuError } = await menuDb
      .select('*, menu_categories(name)')
      .gt('stock_quantity', 0)
      .lt('stock_quantity', 5)
      .order('stock_quantity', { ascending: true });

    if (menuError) throw menuError;

    const formattedMenuItems = (lowStockMenuItems ?? []).map((item: any) => ({
      ...item,
      category_name: item.menu_categories?.name ?? null,
      menu_categories: undefined,
    }));

    const summary: LowStockSummary = {
      inventory: lowStockInventory,
      menu_items: formattedMenuItems,
      total: lowStockInventory.length + formattedMenuItems.length,
    };

    return NextResponse.json<ApiResponse>({ success: true, data: summary });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch low stock items' },
      { status: 500 },
    );
  }
}
