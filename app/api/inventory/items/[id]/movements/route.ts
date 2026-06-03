import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/api-handler';
import { db } from '@/lib/supabase/helpers';
import { notFoundResponse, badRequestResponse, isNotFoundError } from '@/lib/api/utils';
import type { ApiResponse } from '@/types';

export const POST = apiHandler(async (request: NextRequest, params, session) => {
  const { id: item_id } = params;
  const { type, quantity, reason } = await request.json();

  if (!type || quantity === undefined) {
    return badRequestResponse('type and quantity are required');
  }

  if (!['addition', 'removal', 'adjustment'].includes(type)) {
    return badRequestResponse('type must be addition, removal, or adjustment');
  }

  const changeAmount = type === 'removal' ? -Math.abs(quantity) : Math.abs(quantity);

  // Get current item
  const { data: item, error: fetchError } = await db('inventory_items')
    .select('quantity')
    .eq('id', item_id)
    .single();

  if (fetchError) {
    if (isNotFoundError(fetchError)) {
      return notFoundResponse('Inventory item');
    }
    throw fetchError;
  }

  const previousQuantity = Number((item as any).quantity ?? 0);
  let newQuantity: number;

  if (type === 'adjustment') {
    // Adjustment sets the exact quantity
    newQuantity = Math.max(0, quantity);
  } else {
    newQuantity = Math.max(0, previousQuantity + changeAmount);
  }

  // Update item quantity
  const { error: updateError } = await db('inventory_items')
    .update({ quantity: newQuantity })
    .eq('id', item_id);

  if (updateError) throw updateError;

  // Record movement
  const { data: movement, error: movementError } = await db('inventory_movements')
    .insert({
      item_id,
      type,
      quantity_change: type === 'adjustment' ? null : changeAmount,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      reason: reason ?? null,
      performed_by: session.user_id,
    })
    .select()
    .single();

  if (movementError) throw movementError;

  return NextResponse.json<ApiResponse>(
    { success: true, data: { item: { ...item, quantity: newQuantity }, movement } },
    { status: 201 },
  );
}, { permissions: ['menu.manage'] });
