import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import { getOrderById, updateOrderStatus, decrementMenuItemStock } from '@/lib/supabase/queries';
import type { ApiResponse } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { id } = await params;
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
      ...order,
      user_name: (order as any)?.users?.name ?? null,
      staff_name: (order as any)?.staff?.name ?? null,
      users: undefined,
      staff: undefined,
      items: ((order as any)?.order_items ?? []).map((oi: any) => ({
        ...oi,
        item_name: oi.menu_items?.name ?? null,
        menu_items: undefined,
      })),
    };

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (!session.permissions.includes('orders.process')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { id } = await params;
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

    return NextResponse.json<ApiResponse>({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to update order' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (!session.permissions.includes('orders.process')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { id } = await params;
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
      const updated = await updateOrderStatus(id, 'completed', session.user_id);

      return NextResponse.json<ApiResponse>(
        { success: true, data: updated, message: 'Payment confirmed' },
        { status: 200 },
      );
    } else {
      // Decline — cancel the order
      const updated = await updateOrderStatus(id, 'cancelled', session.user_id);

      return NextResponse.json<ApiResponse>(
        { success: true, data: updated, message: 'Order declined' },
        { status: 200 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process order';
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
