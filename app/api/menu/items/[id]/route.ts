import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { notFoundResponse, badRequestResponse, isNotFoundError } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const PUT = apiHandler(async (request: NextRequest, params, session) => {
  const { id } = params;
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
    return badRequestResponse('No fields to update');
  }

  const { data, error } = await db('menu_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return notFoundResponse('Menu item');
    }
    throw error;
  }

  logAdminAction(session, AuditActions.MENU_UPDATE, 'menu_item', id, {
    updated_fields: Object.keys(updates),
  });

  return NextResponse.json<ApiResponse>({ success: true, data });
}, { permissions: ['menu.manage'] });

/**
 * PATCH is an alias for PUT — the frontend sends PATCH for partial updates.
 */
export const PATCH = PUT;

export const DELETE = apiHandler(async (_request: NextRequest, params, session) => {
  const { id } = params;

  const { error } = await db('menu_items')
    .delete()
    .eq('id', id);

  if (error) {
    if (isNotFoundError(error)) {
      return notFoundResponse('Menu item');
    }
    throw error;
  }

  logAdminAction(session, AuditActions.MENU_DELETE, 'menu_item', id);

  return NextResponse.json<ApiResponse>({
    success: true,
    message: 'Menu item deleted',
  });
}, { permissions: ['menu.manage'] });
