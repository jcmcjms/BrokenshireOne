import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { badRequestResponse } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async () => {
  const { data, error } = await db('menu_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return NextResponse.json<ApiResponse>({ success: true, data });
});

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  const { name, sort_order } = await request.json();

  if (!name) {
    return badRequestResponse('Name is required');
  }

  const { data, error } = await db('menu_categories')
    .insert({ name, sort_order: sort_order ?? 0 })
    .select()
    .single();

  if (error) throw error;

  logAdminAction(session, AuditActions.MENU_CREATE, 'menu_category', data?.id ?? null, {
    name,
  });

  return NextResponse.json<ApiResponse>(
    { success: true, data },
    { status: 201 },
  );
}, { permissions: ['menu.manage'] });
