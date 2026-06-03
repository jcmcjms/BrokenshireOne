import { supabase } from '@/lib/supabase/client';
import type { Role } from '@/types';
import type { DbUser } from '@/types/database';

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*, roles(name)')
    .eq('email', email)
    .single();

  if (error) {
    // Log query-level errors (e.g. missing env vars, connectivity issues)
    // so they surface in Vercel logs instead of silently returning null
    console.error('[queries] getUserByEmail error:', error?.message || error);
    return null;
  }
  return data as unknown as DbUser;
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*, roles(name)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as unknown as DbUser;
}

export async function getUserByEmployeeId(employeeId: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*, roles(name)')
    .eq('employee_id', employeeId)
    .single();

  if (error) {
    console.error('[queries] getUserByEmployeeId error:', error?.message || error);
    return null;
  }
  return data as unknown as DbUser;
}

export async function createUser(userData: {
  name: string;
  email: string;
  password_hash: string;
  role_id: string;
  employee_id: string;
  monthly_credit_limit: number;
}): Promise<DbUser> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      name: userData.name,
      email: userData.email,
      password_hash: userData.password_hash,
      role_id: userData.role_id,
      employee_id: userData.employee_id,
      monthly_credit_limit: userData.monthly_credit_limit,
      active: true,
    } as any)
    .select('*, roles(name)')
    .single();

  if (error) throw error;
  return data as unknown as DbUser;
}

export async function updateUser(
  id: string,
  updates: {
    name?: string;
    email?: string;
    role_id?: string;
    employee_id?: string;
    monthly_credit_limit?: number;
    active?: boolean;
    password_hash?: string;
  },
): Promise<DbUser> {
  const { data, error } = await supabase
    .from('users')
    .update(updates as any)
    .eq('id', id)
    .select('*, roles(name)')
    .single();

  if (error) throw error;
  return data as unknown as DbUser;
}

export async function deactivateUser(id: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ active: false } as any)
    .eq('id', id);

  if (error) throw error;
}

export async function bumpUserSessionVersion(userId: string): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('session_version')
    .eq('id', userId)
    .single();

  if (!user) return;

  const currentVersion = (user as any).session_version ?? 0;
  const { error } = await supabase
    .from('users')
    .update({ session_version: currentVersion + 1 } as any)
    .eq('id', userId);

  if (error) {
    console.error('[queries] bumpUserSessionVersion error:', error?.message || error);
  }
}

export async function getUsersByRole(role: Role): Promise<DbUser[]> {
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', role as string)
    .single();

  if (roleError) throw roleError;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role_id', (roleData as any).id)
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return (data as unknown as DbUser[]) ?? [];
}

export async function getFacultyAndStaffUsers() {
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, name')
    .in('name', ['faculty', 'staff']);

  if (rolesError) throw rolesError;

  const roleIds = ((roles as any[]) ?? []).map((r: any) => r.id);

  if (roleIds.length === 0) return [];

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, employee_id, roles(name)')
    .in('role_id', roleIds)
    .eq('active', true)
    .order('name');

  if (error) throw error;

  return ((data as unknown as DbUser[]) ?? []).map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    employee_id: u.employee_id,
    role: u.roles?.name ?? 'unknown',
  }));
}
