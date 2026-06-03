import { supabase } from '@/lib/supabase/client';
import type { DbInventoryItem, DbInventoryMovement } from '@/types/database';

export async function getInventoryItems(category?: string): Promise<DbInventoryItem[]> {
  let query = supabase
    .from('inventory_items')
    .select('*')
    .order('name');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as DbInventoryItem[]) ?? [];
}

export async function getInventoryItemById(id: string): Promise<DbInventoryItem | null> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as unknown as DbInventoryItem;
}

export async function createInventoryItem(item: {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock_level: number;
  unit_cost?: number | null;
}): Promise<DbInventoryItem> {
  const { data, error } = await supabase
    .from('inventory_items')
    .insert(item as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbInventoryItem;
}

export async function updateInventoryItem(
  id: string,
  updates: {
    name?: string;
    category?: string;
    unit?: string;
    min_stock_level?: number;
    unit_cost?: number | null;
  },
): Promise<DbInventoryItem> {
  const { data, error } = await supabase
    .from('inventory_items')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbInventoryItem;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function recordInventoryMovement(movement: {
  item_id: string;
  type: 'addition' | 'removal' | 'adjustment';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string | null;
  performed_by: string;
}): Promise<DbInventoryMovement> {
  const { data, error } = await supabase
    .from('inventory_movements')
    .insert(movement as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbInventoryMovement;
}

export async function getInventoryMovements(itemId: string): Promise<DbInventoryMovement[]> {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*, users(name)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data as unknown as DbInventoryMovement[]) ?? [];
}

export async function getLowStockInventory(): Promise<DbInventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('name');

  if (error) throw error;
  return ((data as unknown as DbInventoryItem[]) ?? []).filter(
    (item) => item.min_stock_level > 0 && item.quantity < item.min_stock_level,
  );
}
