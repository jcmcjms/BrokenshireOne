import { supabase } from '@/lib/supabase/client';
import type { DbOrder } from '@/types/database';

export async function getOrders(limit = 50): Promise<DbOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, users!orders_user_id_fkey(name), staff:users!orders_staff_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as DbOrder[]) ?? [];
}

export async function getOrderById(id: string): Promise<DbOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, users!orders_user_id_fkey(name), staff:users!orders_staff_id_fkey(name), order_items(*, menu_items(name))')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as unknown as DbOrder;
}

export async function createOrder(
  orderData: {
    order_number: string;
    user_id: string;
    staff_id?: string | null;
    status: string;
    total: number;
    payment_method: string;
    cash_given?: number | null;
    change_amount?: number | null;
    notes?: string | null;
  },
  items: { item_id: string; quantity: number; unit_price: number }[],
) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderData as any)
    .select()
    .single();

  if (orderError) throw orderError;

  const orderItems = items.map((item) => ({
    order_id: (order as any).id,
    ...item,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems as any);

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', (order as any).id);
    throw itemsError;
  }

  return order as unknown as DbOrder;
}

export async function updateOrderStatus(id: string, status: string, staffId: string): Promise<DbOrder> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, staff_id: staffId } as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbOrder;
}

export async function recordPayment(paymentData: {
  order_id: string;
  amount: number;
  method: 'cash' | 'card';
  reference?: string | null;
}) {
  const { data, error } = await supabase
    .from('payments')
    .insert({ ...paymentData, paid_at: new Date().toISOString() } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}
