import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { getOrderById, updateOrderStatus, decrementMenuItemStock } from '@/lib/supabase/queries';
import { createNotification } from '@/lib/supabase/notifications';
import { flattenRelation } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (_request, params, session) => {
  const { id } = params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Order not found' },
      { status: 404 },
    );
  }

  if (
    (session.role === 'faculty' || session.role === 'student') &&
    order.user_id !== session.user_id
  ) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Forbidden' },
      { status: 403 },
    );
  }

  const data = {
    ...flattenRelation(order as any, 'users', 'user_name'),
    staff_name: (order as any)?.staff?.name ?? null,
    staff: undefined,
    items: ((order as any)?.order_items ?? []).map((oi: any) =>
      flattenRelation(oi, 'menu_items', 'item_name'),
    ),
  };

  return NextResponse.json<ApiResponse>({ success: true, data });
});

export const PATCH = apiHandler(async (request: NextRequest, params, session) => {
  const { id } = params;
  const { status, staff_id } = await request.json();

  if (!status) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Status is required' },
      { status: 400 },
    );
  }

  const validStatuses = ['pending', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 },
    );
  }

  const updated = await updateOrderStatus(id, status, staff_id || session.user_id);

  // Notify order owner about status change
  if ((status === 'completed' || status === 'cancelled') && updated) {
    const orderOwnerId = (updated as any)?.user_id;
    const orderNum = (updated as any)?.order_number ?? id;
    if (orderOwnerId) {
      await createNotification({
        user_id: orderOwnerId,
        type: status === 'completed' ? 'order_confirmed' : 'order_cancelled',
        title: status === 'completed' ? 'Order Confirmed' : 'Order Cancelled',
        message: `Your order #${orderNum} has been ${status}`,
        data: { order_id: id, order_number: orderNum },
      });
    }
  }

  return NextResponse.json<ApiResponse>({ success: true, data: updated });
}, { permissions: ['orders.process'] });

export const POST = apiHandler(async (request: NextRequest, params, session) => {
  const { id } = params;
  const { action } = await request.json();

  if (!action || !['confirm', 'decline'].includes(action)) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Invalid action. Must be "confirm" or "decline".' },
      { status: 400 },
    );
  }

  if (action === 'confirm') {
    // Get the order with its items
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Order not found' },
        { status: 404 },
      );
    }

    // Decrement stock for each item
    const orderItems = (order as any)?.order_items ?? [];
    for (const item of orderItems) {
      await decrementMenuItemStock(item.item_id, item.quantity);
    }

    // Update status to completed
    const completed = await updateOrderStatus(id, 'completed', session.user_id);

    // Notify order owner
    if (completed) {
      const ownerId = (completed as any)?.user_id;
      const orderNum = (completed as any)?.order_number ?? id;
      if (ownerId) {
        await createNotification({
          user_id: ownerId,
          type: 'order_confirmed',
          title: 'Order Confirmed',
          message: `Your order #${orderNum} is ready!`,
          data: { order_id: id, order_number: orderNum },
        });
      }
    }

    return NextResponse.json<ApiResponse>(
      { success: true, data: completed, message: 'Payment confirmed' },
      { status: 200 },
    );
  } else {
    // Decline — cancel the order
    const cancelled = await updateOrderStatus(id, 'cancelled', session.user_id);

    // Notify order owner
    if (cancelled) {
      const ownerId = (cancelled as any)?.user_id;
      const orderNum = (cancelled as any)?.order_number ?? id;
      if (ownerId) {
        await createNotification({
          user_id: ownerId,
          type: 'order_cancelled',
          title: 'Order Cancelled',
          message: `Your order #${orderNum} has been declined`,
          data: { order_id: id, order_number: orderNum },
        });
      }
    }

    return NextResponse.json<ApiResponse>(
      { success: true, data: cancelled, message: 'Order declined' },
      { status: 200 },
    );
  }
}, { permissions: ['orders.process'] });
