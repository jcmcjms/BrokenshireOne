import { supabase } from '@/lib/supabase/client';
import type { DbCreditAllowance, DbCreditTransaction } from '@/types/database';

export async function getUserCreditAllowance(userId: string, month: number, year: number): Promise<DbCreditAllowance | null> {
  const { data, error } = await supabase
    .from('credit_allowances')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as DbCreditAllowance | null;
}

export async function getCreditTransactions(userId: string, month: number, year: number): Promise<DbCreditTransaction[]> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as DbCreditTransaction[]) ?? [];
}

export async function deductCredit(
  userId: string,
  amount: number,
  orderId: string,
  month: number,
  year: number,
) {
  const { data: allowance, error: fetchError } = await supabase
    .from('credit_allowances')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const allowanceData = allowance as unknown as DbCreditAllowance | null;
  const newUsed = (allowanceData?.used_amount ?? 0) + amount;
  if (newUsed > (allowanceData?.limit_amount ?? 0)) {
    throw new Error('Credit limit exceeded');
  }

  const { data: updated, error: updateError } = await supabase
    .from('credit_allowances')
    .update({ used_amount: newUsed } as any)
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .select()
    .single();

  if (updateError) throw updateError;

  const { error: txError } = await supabase.from('credit_transactions').insert({
    user_id: userId,
    order_id: orderId,
    amount,
    type: 'meal',
    month,
    year,
    notes: null,
  } as any);

  if (txError) throw txError;

  return updated as unknown as DbCreditAllowance;
}
