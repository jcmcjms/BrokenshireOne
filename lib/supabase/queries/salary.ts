import { supabase } from '@/lib/supabase/client';
import type { DbSalaryDeductionLimit, DbSalaryDeduction } from '@/types/database';

export async function getSalaryDeductionLimits(month: number, year: number) {
  const { data, error } = await supabase
    .from('salary_deduction_limits')
    .select('*, users!salary_deduction_limits_user_id_fkey(name, roles!users_role_id_fkey(name))')
    .eq('month', month)
    .eq('year', year)
    .order('user_id');

  if (error) throw error;
  return ((data as unknown as DbSalaryDeductionLimit[]) ?? []).map((item) => {
    const userData = (item as any).users;
    return {
      ...item,
      user_name: userData?.name ?? null,
      user_role: userData?.roles?.name ?? null,
      users: undefined,
      remaining: (item.max_deduction_limit ?? 0) - (item.total_deducted ?? 0),
    };
  });
}

export async function upsertSalaryDeductionLimit(
  userId: string,
  month: number,
  year: number,
  maxDeductionLimit: number,
) {
  // Check if limit exists
  const { data: existing } = await supabase
    .from('salary_deduction_limits')
    .select('id')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (existing) {
    const db = supabase.from('salary_deduction_limits') as any;
    const { data, error } = await db
      .update({ max_deduction_limit: maxDeductionLimit })
      .eq('id', (existing as Record<string, unknown>).id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as DbSalaryDeductionLimit;
  } else {
    const db = supabase.from('salary_deduction_limits') as any;
    const { data, error } = await db
      .insert({
        user_id: userId,
        month,
        year,
        max_deduction_limit: maxDeductionLimit,
        total_deducted: 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as DbSalaryDeductionLimit;
  }
}

export async function getSalaryDeductions(month: number, year: number) {
  const { data, error } = await supabase
    .from('salary_deductions')
    .select('*, users!salary_deductions_user_id_fkey(name), creator:users!salary_deductions_created_by_fkey(name)')
    .eq('month', month)
    .eq('year', year)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data as unknown as DbSalaryDeduction[]) ?? []).map((item) => ({
    ...item,
    user_name: (item as any).users?.name ?? null,
    users: undefined,
    created_by_name: (item as any).creator?.name ?? null,
    creator: undefined,
  }));
}

export async function createSalaryDeduction(params: {
  user_id: string;
  amount: number;
  deduction_type: 'loan' | 'uniform' | 'damages' | 'other';
  reason?: string | null;
  month: number;
  year: number;
  created_by: string;
}) {
  // Create the deduction entry
  const db = supabase.from('salary_deductions') as any;
  const { data: deduction, error: dedError } = await db
    .insert({
      user_id: params.user_id,
      amount: params.amount,
      deduction_type: params.deduction_type,
      reason: params.reason ?? null,
      month: params.month,
      year: params.year,
      created_by: params.created_by,
    })
    .select()
    .single();

  if (dedError) throw dedError;

  // Update or create the limit's total_deducted
  const { data: limit } = await supabase
    .from('salary_deduction_limits')
    .select('id, total_deducted')
    .eq('user_id', params.user_id)
    .eq('month', params.month)
    .eq('year', params.year)
    .maybeSingle();

  if (limit) {
    const lim = limit as unknown as DbSalaryDeductionLimit;
    const newTotal = (lim.total_deducted ?? 0) + params.amount;
    const limitDb = supabase.from('salary_deduction_limits') as any;
    const { error: updError } = await limitDb
      .update({ total_deducted: newTotal })
      .eq('id', lim.id);
    if (updError) throw updError;
  } else {
    // Create a new limit record
    const limitDb = supabase.from('salary_deduction_limits') as any;
    const { error: insError } = await limitDb
      .insert({
        user_id: params.user_id,
        month: params.month,
        year: params.year,
        max_deduction_limit: params.amount,
        total_deducted: params.amount,
      });
    if (insError) throw insError;
  }

  return deduction as unknown as DbSalaryDeduction;
}

export async function deleteSalaryDeduction(id: string) {
  // Get the deduction first to know the amount and user
  const { data: deduction, error: fetchError } = await supabase
    .from('salary_deductions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;
  const ded = deduction as unknown as DbSalaryDeduction;

  // Delete the deduction
  const { error: delError } = await supabase
    .from('salary_deductions')
    .delete()
    .eq('id', id);

  if (delError) throw delError;

  // Update the limit's total_deducted
  const { data: limit } = await supabase
    .from('salary_deduction_limits')
    .select('id, total_deducted')
    .eq('user_id', ded.user_id)
    .eq('month', ded.month)
    .eq('year', ded.year)
    .maybeSingle();

  if (limit) {
    const lim = limit as unknown as DbSalaryDeductionLimit;
    const newTotal = Math.max(0, (lim.total_deducted ?? 0) - ded.amount);
    const limitDb = supabase.from('salary_deduction_limits') as any;
    const { error: updError } = await limitDb
      .update({ total_deducted: newTotal })
      .eq('id', lim.id);
    if (updError) throw updError;
  }

  return { deleted: true };
}
