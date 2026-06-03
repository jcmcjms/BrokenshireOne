import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { badRequestResponse, flattenRelation } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('item_id');

  if (!itemId) {
    return badRequestResponse('item_id query parameter is required');
  }

  const { data, error } = await db('inventory_movements')
    .select('*, users(name)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  const movements = (data ?? []).map((m: any) =>
    flattenRelation(m, 'users', 'performed_by_name'),
  );

  return NextResponse.json<ApiResponse>({ success: true, data: movements });
}, { permissions: ['menu.view', 'menu.manage'] });
