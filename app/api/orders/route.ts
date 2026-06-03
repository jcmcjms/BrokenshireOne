import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { createOrder, deductCredit } from '@/lib/supabase/queries';
import { createNotification, getStaffUserIds } from '@/lib/supabase/notifications';
import { getCurrentMonthYear, generateOrderNumber, flattenRelations, getNextDayStr } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const GET = apiHandler(async (request: NextRequest, _params, session) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const status = searchParams.get('status');
  const date = searchParams.get('date');

  let query = db('orders')
    .select('*, users!orders_user_id_fkey(name), staff:users!orders_staff_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (session.role === 'faculty' || session.role === 'student') {
    query = query.eq('user_id', session.user_id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (date) {
    const nextDayStr = getNextDayStr(date);
    query = query
      .gte('created_at', date)
      .lt('created_at', nextDayStr);
  }

  const { data, error } = await query;

  if (error) throw error;

  const orders = flattenRelations(data ?? [], [
    ['users', 'user_name'],
    ['staff', 'staff_name'],
  ]);

  return NextResponse.json<ApiResponse>({ success: true, data: orders });
});

export const POST = apiHandler(async (request: NextRequest, _params, session) => {
  const { user_id, items, payment_method, notes, cash_given } = await request.json();

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Items are required' },
      { status: 400 },
    );
  }

  if (!payment_method) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Payment method is required' },
      { status: 400 },
    );
  }

  const targetUserId = user_id || session.user_id;

  const itemIds = items.map((i: { item_id: string }) => i.item_id);
  const { data: menuItems, error: itemsError } = await db('menu_items')
    .select('id, price, name')
    .in('id', itemIds);

  if (itemsError) throw itemsError;

  const priceMap = new Map((menuItems ?? []).map((mi: any) => [mi.id, mi]));
  let total = 0;
  const orderItems = items.map((item: { item_id: string; quantity: number }) => {
    const menuItem = priceMap.get(item.item_id) as any;
    if (!menuItem) {
      throw new Error(`Menu item ${item.item_id} not found`);
    }
    const unitPrice = Number(menuItem.price);
    total += unitPrice * item.quantity;
    return {
      item_id: item.item_id,
      quantity: item.quantity,
      unit_price: unitPrice,
    };
  });

  const changeAmount = cash_given ? Math.max(0, parseFloat(cash_given) - total) : null;

  if (payment_method === 'credit') {
    const { month, year } = getCurrentMonthYear();
    const { data: allowance } = await db('credit_allowances')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (!allowance) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No credit allowance set for this month' },
        { status: 400 },
      );
    }

    const usedAmount = (allowance as any).used_amount ?? 0;
    const limitAmount = (allowance as any).limit_amount ?? 0;
    if (usedAmount + total > limitAmount) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Insufficient credit allowance' },
        { status: 400 },
      );
    }
  }

  const order = await createOrder(
    {
      order_number: generateOrderNumber(),
      user_id: targetUserId,
      staff_id: session.role === 'staff' || session.role === 'admin' || session.role === 'manager'
        ? session.user_id
        : null,
      status: 'pending',
      total,
      payment_method,
      cash_given: cash_given ?? null,
      change_amount: changeAmount,
      notes: notes ?? null,
    },
    orderItems,
  );

  // Decrement stock for each item in the order (skip for cash - deferred to staff confirmation)
  const menuDb = db('menu_items');
  if (payment_method !== 'cash') {
    for (const item of orderItems) {
      const { data: menuItem, error: fetchError } = await menuDb
        .select('stock_quantity, available')
        .eq('id', item.item_id)
        .single();

      if (!fetchError && menuItem) {
        const currentStock = (menuItem as any).stock_quantity ?? 0;
        const newStock = Math.max(0, currentStock - item.quantity);
        const menuUpdates: Record<string, unknown> = { stock_quantity: newStock };
        if (newStock === 0) {
          menuUpdates.available = false;
        }
        await menuDb.update(menuUpdates).eq('id', item.item_id);
      }
    }
  }

  if (payment_method === 'credit') {
    const { month, year } = getCurrentMonthYear();
    await deductCredit(targetUserId, total, order.id, month, year);
  }

  // Notify staff about new cash orders
  if (payment_method === 'cash') {
    const staffIds = await getStaffUserIds();
    const orderNum = (order as any)?.order_number ?? 'Unknown';
    const orderTotal = total.toFixed(2);
    for (const staffId of staffIds) {
      await createNotification({
        user_id: staffId,
        type: 'new_order',
        title: 'New Cash Order',
        message: `Order #${orderNum} — PHP ${orderTotal}`,
        data: { order_id: (order as any).id, order_number: orderNum },
      });
    }
  }

  const { data: fullOrder } = await db('orders')
    .select('*, order_items(*, menu_items(name))')
    .eq('id', (order as any).id)
    .single();

  return NextResponse.json<ApiResponse>(
    { success: true, data: fullOrder },
    { status: 201 },
  );
});
