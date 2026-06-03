import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { logAdminAction, AuditActions } from '@/lib/audit';
import { badRequestResponse } from '@/lib/api/utils';
import * as XLSX from 'xlsx';
import type { ApiResponse } from '@/types';

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const mode = (formData.get('mode') as string) ?? 'create';

  if (!file) {
    return badRequestResponse('No file provided');
  }

  if (!file.name.endsWith('.xlsx')) {
    return badRequestResponse('Only .xlsx files are supported');
  }

  if (mode !== 'create' && mode !== 'update') {
    return badRequestResponse('Mode must be "create" or "update"');
  }

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return badRequestResponse('Workbook has no sheets');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rows.length === 0) {
    return badRequestResponse('Sheet is empty');
  }

  // Normalize keys to lowercase for case-insensitive matching
  const normalizedRows = rows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key.toLowerCase()] = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
    }
    return normalized;
  });

  // Validate required columns
  const requiredColumns = ['name', 'category', 'price'];
  for (const col of requiredColumns) {
    if (!normalizedRows[0] || !(col in normalizedRows[0])) {
      return NextResponse.json(
        { success: false, error: `Missing required column: "${col}". Expected columns: Name, Category, Price, Description, Available, Barcode, Image URL` },
        { status: 400 },
      );
    }
  }

  // Pre-fetch all categories for quick lookup
  const { data: allCategories } = await db('menu_categories')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: false });

  const categoryMap = new Map<string, string>();
  let maxSortOrder = 0;
  for (const cat of (allCategories as any[]) ?? []) {
    categoryMap.set(cat.name.toLowerCase(), cat.id);
    if (cat.sort_order > maxSortOrder) maxSortOrder = cat.sort_order;
  }

  const results = {
    created: 0,
    updated: 0,
    errors: [] as { row: number; field: string; reason: string }[],
  };

  const menuDb = db('menu_items');

  for (let i = 0; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];
    const rowNum = i + 2; // +2 because row 1 is header and index is 0-based

    try {
      // Parse name
      const name = row['name']?.trim() ?? '';
      if (!name) {
        results.errors.push({ row: rowNum, field: 'name', reason: 'Name is required' });
        continue;
      }

      // Parse price
      const price = parseFloat(row['price']?.replace(/[^0-9.-]/g, '') || '');
      if (isNaN(price) || price < 0) {
        results.errors.push({ row: rowNum, field: 'price', reason: `Invalid price: "${row['price']}"` });
        continue;
      }

      // Resolve category
      const rawCategoryName = row['category']?.trim() ?? '';
      if (!rawCategoryName) {
        results.errors.push({ row: rowNum, field: 'category', reason: 'Category is required' });
        continue;
      }

      const categoryName = rawCategoryName;
      let categoryId = categoryMap.get(categoryName.toLowerCase());
      if (!categoryId) {
        // Auto-create category
        maxSortOrder += 1;
        const { data: newCat, error: catError } = await db('menu_categories')
          .insert({ name: categoryName, sort_order: maxSortOrder, active: true })
          .select('id')
          .single();

        if (catError || !newCat) {
          results.errors.push({ row: rowNum, field: 'category', reason: `Failed to create category "${categoryName}": ${catError?.message}` });
          continue;
        }

        categoryId = (newCat as any).id as string;
        categoryMap.set(categoryName.toLowerCase(), categoryId);
      }

      // Parse optional fields
      const description = row['description'] ?? '';
      const available = row['available']?.toLowerCase() === 'true' || row['available'] === '1' || row['available']?.toLowerCase() === 'yes';
      const barcode = (row['barcode']?.trim()) || null;
      const imageUrl = (row['image url']?.trim()) || null;

      // Check for existing item in update mode
      let existingId: string | null = null;
      if (mode === 'update') {
        // Try matching by barcode first
        if (barcode) {
          const { data: barMatch } = await menuDb
            .select('id')
            .eq('barcode', barcode)
            .maybeSingle();
          if (barMatch) {
            existingId = (barMatch as any).id;
          }
        }

        // Try matching by name if no barcode match
        if (!existingId) {
          const { data: nameMatch } = await menuDb
            .select('id')
            .eq('name', name)
            .maybeSingle();
          if (nameMatch) {
            existingId = (nameMatch as any).id;
          }
        }
      }

      if (existingId) {
        // Update existing item
        const updates: Record<string, unknown> = {
          category_id: categoryId,
          description,
          price,
          available,
        };
        if (barcode !== null) updates.barcode = barcode;
        if (imageUrl) updates.image_url = imageUrl;

        const { error: updateError } = await menuDb
          .update(updates)
          .eq('id', existingId);

        if (updateError) {
          results.errors.push({ row: rowNum, field: 'general', reason: `Update failed: ${updateError.message}` });
          continue;
        }
        results.updated++;
      } else {
        // Create new item
        const item: Record<string, unknown> = {
          category_id: categoryId,
          name,
          description,
          price,
          available,
          stock_quantity: 0,
        };
        if (barcode) item.barcode = barcode;
        if (imageUrl) item.image_url = imageUrl;

        const { error: insertError } = await menuDb.insert(item);

        if (insertError) {
          // Check for duplicate barcode
          if (insertError.code === '23505' && insertError.message?.includes('barcode')) {
            results.errors.push({ row: rowNum, field: 'barcode', reason: `Duplicate barcode: "${barcode}"` });
          } else {
            results.errors.push({ row: rowNum, field: 'general', reason: `Insert failed: ${insertError.message}` });
          }
          continue;
        }
        results.created++;
      }
    } catch (err: any) {
      results.errors.push({ row: rowNum, field: 'general', reason: err?.message ?? 'Unknown error' });
    }
  }

  logAdminAction(session, AuditActions.MENU_CREATE, 'menu_item', null, {
    mode,
    created: results.created,
    updated: results.updated,
    errors: results.errors.length,
  });

  return NextResponse.json<ApiResponse>({ success: true, data: results });
}, { permissions: ['menu.manage'] });
