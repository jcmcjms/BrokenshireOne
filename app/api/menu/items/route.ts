import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { getMenuItems } from '@/lib/supabase/queries';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { badRequestResponse, flattenRelation, flattenRelations } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('category_id') ?? undefined;
  const barcode = searchParams.get('barcode');

  // If barcode query param is provided, do a single-item lookup by barcode
  if (barcode) {
    const { data: item, error: barcodeError } = await db('menu_items')
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

    const mapped = flattenRelation(item as any, 'menu_categories', 'category_name');

    return NextResponse.json<ApiResponse>({ success: true, data: mapped });
  }

  const items = await getMenuItems(categoryId);

  const data = flattenRelations(items as any[], [['menu_categories', 'category_name']]);

  return NextResponse.json<ApiResponse>({ success: true, data });
}, { permissions: ['menu.view', 'menu.manage'] });

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  const { category_id, name, description, price, image_url, available, stock_quantity, barcode, unit } = await request.json();

  if (!category_id || !name || price === undefined) {
    return badRequestResponse('category_id, name, and price are required');
  }

  const dbMenu = db('menu_items');
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

  const { data, error } = await dbMenu
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;

  logAdminAction(session, AuditActions.MENU_CREATE, 'menu_item', data?.id ?? null, {
    name,
    category_id,
    price,
  });

  return NextResponse.json<ApiResponse>(
    { success: true, data },
    { status: 201 },
  );
}, { permissions: ['menu.manage'] });
