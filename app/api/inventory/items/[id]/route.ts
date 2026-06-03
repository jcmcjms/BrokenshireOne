import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { notFoundResponse, badRequestResponse, isNotFoundError } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (_request, params) => {
  const { id } = params;

  const { data, error } = await db('inventory_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return notFoundResponse('Inventory item');
    }
    throw error;
  }

  return NextResponse.json<ApiResponse>({ success: true, data });
}, { permissions: ['menu.view', 'menu.manage'] });

export const PUT = apiHandler(async (request: NextRequest, params, session) => {
  const { id } = params;
  const { name, category, unit, min_stock_level, unit_cost } = await request.json();
  const updates: Record<string, unknown> = {};

  if (name !== undefined) updates.name = name;
  if (category !== undefined) {
    const validCategories = ['produce', 'meat', 'dairy', 'dry_goods', 'beverage', 'other'];
    if (!validCategories.includes(category)) {
      return badRequestResponse(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }
    updates.category = category;
  }
  if (unit !== undefined) updates.unit = unit;
  if (min_stock_level !== undefined) updates.min_stock_level = min_stock_level;
  if (unit_cost !== undefined) updates.unit_cost = unit_cost;

  if (Object.keys(updates).length === 0) {
    return badRequestResponse('No fields to update');
  }

  const { data, error } = await db('inventory_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return notFoundResponse('Inventory item');
    }
    throw error;
  }

  logAdminAction(session, AuditActions.INVENTORY_ADJUST, 'inventory_item', id, {
    updated_fields: Object.keys(updates),
  });

  return NextResponse.json<ApiResponse>({ success: true, data });
}, { permissions: ['menu.manage'] });

export const DELETE = apiHandler(async (_request: NextRequest, params, session) => {
  const { id } = params;

  const { error } = await db('inventory_items')
    .delete()
    .eq('id', id);

  if (error) {
    if (isNotFoundError(error)) {
      return notFoundResponse('Inventory item');
    }
    throw error;
  }

  logAdminAction(session, AuditActions.INVENTORY_ADJUST, 'inventory_item', id);

  return NextResponse.json<ApiResponse>({
    success: true,
    message: 'Inventory item deleted',
  });
}, { permissions: ['menu.manage'] });
