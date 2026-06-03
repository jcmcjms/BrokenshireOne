import { supabase } from '@/lib/supabase/client';
import type { DbRolePermission, DbUserPermission, DbPermission } from '@/types/database';

export async function getRolePermissions(roleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permissions!inner(code)')
    .eq('role_id', roleId);

  if (error) return [];
  return (data as unknown as { permissions: { code: string } }[])
    .map((rp) => rp.permissions?.code)
    .filter(Boolean) as string[];
}

/**
 * Walk the role inheritance chain to collect all ancestor role IDs.
 * Uses parent_role_id to climb the hierarchy (student → faculty → staff → manager → admin).
 */
async function _getRoleInheritanceChain(roleId: string): Promise<string[]> {
  const chain: string[] = [];
  let currentId: string | null = roleId;

  while (currentId) {
    chain.push(currentId);
    const { data: roleRow } = await supabase
      .from('roles')
      .select('parent_role_id')
      .eq('id', currentId)
      .single();

    const roleRowData = roleRow as { parent_role_id: string | null } | null;
    if (!roleRowData) break;
    currentId = roleRowData?.parent_role_id ?? null;
  }

  return chain;
}

export async function getEffectivePermissions(userId: string): Promise<string[]> {
  // 1. Get user's role
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role_id')
    .eq('id', userId)
    .single();

  if (userError || !user) return [];

  const roleId = (user as any).role_id;

  // 2. Walk inheritance chain to get all inherited role IDs
  const roleIds = await _getRoleInheritanceChain(roleId);

  if (roleIds.length === 0) return [];

  // 3. Get role-based permissions for all roles in the chain
  const { data: rolePerms, error: roleError } = await supabase
    .from('role_permissions')
    .select('permissions!inner(code)')
    .in('role_id', roleIds);

  if (roleError) return [];

  const rolePermissions = new Set(
    (rolePerms as unknown as { permissions: { code: string } }[])
      .map((rp: any) => rp.permissions?.code)
      .filter(Boolean),
  );

  // 4. Get user-level overrides (applied on top of inherited permissions)
  const { data: userPerms, error: userPermError } = await supabase
    .from('user_permissions')
    .select('*, permissions!inner(code)')
    .eq('user_id', userId);

  if (!userPermError) {
    for (const up of (userPerms as unknown as DbUserPermission[]) ?? []) {
      const code = (up as any).permissions?.code;
      if (code) {
        if (up.is_granted) {
          rolePermissions.add(code);
        } else {
          rolePermissions.delete(code);
        }
      }
    }
  }

  return Array.from(rolePermissions);
}

export async function getAllRoles(): Promise<{ id: string; name: string; description: string }[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('id, name, description')
    .order('name');

  if (error) throw error;
  return (data as any) ?? [];
}

export async function getAllPermissions(): Promise<DbPermission[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('module', { ascending: true })
    .order('code', { ascending: true });

  if (error) throw error;
  return (data as unknown as DbPermission[]) ?? [];
}

export async function getUserPermissionOverrides(userId: string): Promise<DbUserPermission[]> {
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*, permissions!inner(code)')
      .eq('user_id', userId);

    if (error) return [];
    return (data as unknown as DbUserPermission[]) ?? [];
  } catch {
    // Table may not exist yet (migration not applied)
    return [];
  }
}

export async function setUserPermissionOverrides(
  userId: string,
  overrides: Record<string, boolean | null>,
): Promise<void> {
  try {
    // Get all permission IDs
    const { data: allPerms, error: permError } = await supabase
      .from('permissions')
      .select('id, code');

    if (permError) throw permError;
    const permMap = new Map((allPerms ?? []).map((p: any) => [p.code, p.id]));

    // Process each override
    for (const [code, value] of Object.entries(overrides)) {
      const permissionId = permMap.get(code);
      if (!permissionId) continue;

      if (value === null) {
        // Remove override — reset to role default
        await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission_id', permissionId);
      } else {
        // Upsert override (grant or revoke)
        const existing = await supabase
          .from('user_permissions')
          .select('id')
          .eq('user_id', userId)
          .eq('permission_id', permissionId)
          .maybeSingle();

        if ((existing as any)?.data) {
          await supabase
            .from('user_permissions')
            .update({ is_granted: value } as any)
            .eq('user_id', userId)
            .eq('permission_id', permissionId);
        } else {
          await supabase
            .from('user_permissions')
            .insert({
              user_id: userId,
              permission_id: permissionId,
              is_granted: value,
            } as any);
        }
      }
    }
  } catch {
    // Table may not exist yet (migration not applied)
    throw new Error('Permission overrides table not available. Run migration 00003.');
  }
}
