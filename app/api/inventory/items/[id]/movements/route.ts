import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';

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

    if (!session.permissions.includes('menu.manage')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { id: item_id } = await params;
    const { type, quantity, reason } = await request.json();

    if (!type || quantity === undefined) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'type and quantity are required' },
        { status: 400 },
      );
    }

    if (!['addition', 'removal', 'adjustment'].includes(type)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'type must be addition, removal, or adjustment' },
        { status: 400 },
      );
    }

    const changeAmount = type === 'removal' ? -Math.abs(quantity) : Math.abs(quantity);

    // Get current item
    const db = supabase.from('inventory_items') as any;
    const { data: item, error: fetchError } = await db
      .select('quantity')
      .eq('id', item_id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Inventory item not found' },
          { status: 404 },
        );
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
    const { error: updateError } = await db
      .update({ quantity: newQuantity })
      .eq('id', item_id);

    if (updateError) throw updateError;

    // Record movement
    const movementsDb = supabase.from('inventory_movements') as any;
    const { data: movement, error: movementError } = await movementsDb
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
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to record inventory movement' },
      { status: 500 },
    );
  }
}
