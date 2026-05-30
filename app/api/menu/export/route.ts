import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!session.permissions.includes('menu.view') && !session.permissions.includes('menu.manage')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all items with category name
    const { data: items, error } = await supabase
      .from('menu_items')
      .select('*, menu_categories(name)')
      .order('name');

    if (error) {
      throw error;
    }

    // Map to export-friendly format
    const exportData = ((items as any[]) ?? []).map((item: any) => ({
      Name: item.name,
      Category: item.menu_categories?.name ?? '',
      Price: item.price,
      Description: item.description ?? '',
      Available: item.available ? 'Yes' : 'No',
      Barcode: item.barcode ?? '',
      'Image URL': item.image_url ?? '',
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 30 }, // Name
      { wch: 20 }, // Category
      { wch: 10 }, // Price
      { wch: 40 }, // Description
      { wch: 10 }, // Available
      { wch: 20 }, // Barcode
      { wch: 50 }, // Image URL
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Menu Items');

    // Write to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="menu-items.xlsx"',
      },
    });
  } catch (error) {
    console.error('[export] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export menu items' },
      { status: 500 },
    );
  }
}
