import { supabase } from '@/lib/supabase/client';
import type { DbMenuCategory, DbMenuItem } from '@/types/database';

export async function getMenuCategories(): Promise<DbMenuCategory[]> {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data as unknown as DbMenuCategory[]) ?? [];
}

export async function getMenuItems(categoryId?: string): Promise<DbMenuItem[]> {
  let query = supabase
    .from('menu_items')
    .select('*, menu_categories(name)');

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as DbMenuItem[]) ?? [];
}

export async function getMenuItemByBarcode(barcode: string): Promise<DbMenuItem | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_categories(name)')
    .eq('barcode', barcode)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as DbMenuItem | null;
}

export async function getLowStockMenuItems(): Promise<DbMenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_categories(name)')
    .gt('stock_quantity', 0)
    .lt('stock_quantity', 5)
    .order('stock_quantity', { ascending: true });

  if (error) throw error;
  return (data as unknown as DbMenuItem[]) ?? [];
}

export async function decrementMenuItemStock(itemId: string, quantity: number = 1): Promise<void> {
  // Get current stock
  const { data: item, error: fetchError } = await supabase
    .from('menu_items')
    .select('stock_quantity, available')
    .eq('id', itemId)
    .single();

  if (fetchError) throw fetchError;
  if (!item) throw new Error(`Menu item ${itemId} not found`);

  const currentStock = (item as any).stock_quantity ?? 0;
  const newStock = Math.max(0, currentStock - quantity);

  const updates: any = { stock_quantity: newStock };
  if (newStock === 0) {
    updates.available = false;
  }

  const { error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', itemId);

  if (error) throw error;
}
