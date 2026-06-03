import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { notFoundResponse, badRequestResponse, isNotFoundError } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const PUT = apiHandler(async (request: NextRequest, params, session) => {
  const { id } = params;
  const { name, sort_order, active } = await request.json();
  const updates: Record<string, unknown> = {};

  if (name !== undefined) updates.name = name;
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (active !== undefined) updates.active = active;

  if (Object.keys(updates).length === 0) {
    return badRequestResponse('No fields to update');
  }

  const { data, error } = await db('menu_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return notFoundResponse('Category');
    }
    throw error;
  }

  logAdminAction(session, AuditActions.MENU_UPDATE, 'menu_category', id, {
    updated_fields: Object.keys(updates),
  });

  return NextResponse.json<ApiResponse>({ success: true, data });
}, { permissions: ['menu.manage'] });

export const DELETE = apiHandler(async (_request: NextRequest, params, session) => {
  const { id } = params;

  const { error } = await db('menu_categories')
    .delete()
    .eq('id', id);

  if (error) {
    if (isNotFoundError(error)) {
      return notFoundResponse('Category');
    }
    throw error;
  }

  logAdminAction(session, AuditActions.MENU_DELETE, 'menu_category', id);

  return NextResponse.json<ApiResponse>({
    success: true,
    message: 'Category deleted',
  });
}, { permissions: ['menu.manage'] });
