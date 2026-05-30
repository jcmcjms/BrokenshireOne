import { supabase } from './client';

/**
 * Insert a notification for a specific user.
 * Used by API routes to trigger real-time notifications via Supabase Realtime.
 */
export async function createNotification(params: {
  user_id: string
  type: 'new_order' | 'order_confirmed' | 'order_cancelled' | 'low_stock'
  title: string
  message: string
  data?: Record<string, any>
}) {
  const { error } = await (supabase as any)
    .from('notifications')
    .insert({
      user_id: params.user_id,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data ?? {},
    });

  if (error) {
    console.error('[notifications] Failed to create notification:', error);
  }
}

/**
 * Find all staff/manager users to notify about new cash orders.
 */
export async function getStaffUserIds(): Promise<string[]> {
  const { data, error } = await (supabase as any)
    .from('users')
    .select('id')
    .in('role', ['staff', 'manager', 'admin']);

  if (error) {
    console.error('[notifications] Failed to fetch staff users:', error);
    return [];
  }

  return (data ?? []).map((u: any) => u.id);
}
