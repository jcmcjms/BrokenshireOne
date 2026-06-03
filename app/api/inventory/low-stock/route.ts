import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { flattenRelation } from '@/lib/api/utils';
import type { ApiResponse, LowStockSummary } from '@/types';

export const GET = apiHandler(async () => {
  // Get low stock inventory items (quantity < min_stock_level)
  const { data: allInventory, error: invError } = await db('inventory_items')
    .select('*')
    .order('name');

  if (invError) throw invError;

  const lowStockInventory = (allInventory ?? []).filter(
    (item: any) => item.min_stock_level > 0 && item.quantity < item.min_stock_level,
  );

  // Get low stock menu items (stock_quantity > 0 and < 5)
  const { data: lowStockMenuItems, error: menuError } = await db('menu_items')
    .select('*, menu_categories(name)')
    .gt('stock_quantity', 0)
    .lt('stock_quantity', 5)
    .order('stock_quantity', { ascending: true });

  if (menuError) throw menuError;

  const formattedMenuItems = (lowStockMenuItems ?? []).map((item: any) =>
    flattenRelation(item, 'menu_categories', 'category_name'),
  );

  const summary: LowStockSummary = {
    inventory: lowStockInventory,
    menu_items: formattedMenuItems,
    total: lowStockInventory.length + formattedMenuItems.length,
  };

  return NextResponse.json<ApiResponse>({ success: true, data: summary });
}, { permissions: ['menu.view', 'menu.manage'] });
