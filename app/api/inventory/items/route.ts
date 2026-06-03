import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? undefined;

  let query = db('inventory_items')
    .select('*')
    .order('name');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;

  return NextResponse.json<ApiResponse>({ success: true, data: data ?? [] });
}, { permissions: ['menu.view', 'menu.manage'] });

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  const { name, category, quantity, unit, min_stock_level, unit_cost } = await request.json();

  if (!name || !category || !unit) {
    return badRequestResponse('name, category, and unit are required');
  }

  const validCategories = ['produce', 'meat', 'dairy', 'dry_goods', 'beverage', 'other'];
  if (!validCategories.includes(category)) {
    return badRequestResponse(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }

  const { data, error } = await db('inventory_items')
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

  logAdminAction(session, AuditActions.INVENTORY_ADJUST, 'inventory_item', data?.id ?? null, {
    name,
    category,
    quantity: quantity ?? 0,
    unit,
  });

  return NextResponse.json<ApiResponse>(
    { success: true, data },
    { status: 201 },
  );
}, { permissions: ['menu.manage'] });
