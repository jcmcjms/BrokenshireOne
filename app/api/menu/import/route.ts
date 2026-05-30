import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!session.permissions.includes('menu.manage')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) ?? 'create';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json({ success: false, error: 'Only .xlsx files are supported' }, { status: 400 });
    }

    if (mode !== 'create' && mode !== 'update') {
      return NextResponse.json({ success: false, error: 'Mode must be "create" or "update"' }, { status: 400 });
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ success: false, error: 'Workbook has no sheets' }, { status: 400 });
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Sheet is empty' }, { status: 400 });
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
    const { data: allCategories } = await supabase
      .from('menu_categories')
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

    const db = supabase.from('menu_items') as any;

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
          const { data: newCat, error: catError } = await supabase
            .from('menu_categories')
            .insert({ name: categoryName, sort_order: maxSortOrder, active: true } as any)
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
            const { data: barMatch } = await db
              .select('id')
              .eq('barcode', barcode)
              .maybeSingle();
            if (barMatch) {
              existingId = (barMatch as any).id;
            }
          }

          // Try matching by name if no barcode match
          if (!existingId) {
            const { data: nameMatch } = await db
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

          const { error: updateError } = await db
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

          const { error: insertError } = await db.insert(item);

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

    return NextResponse.json(results);
  } catch (error) {
    console.error('[import] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process import' },
      { status: 500 },
    );
  }
}
