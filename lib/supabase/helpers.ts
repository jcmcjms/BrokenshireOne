import { supabase } from './client';

// ---------------------------------------------------------------------------
// Typed Supabase helpers
// ---------------------------------------------------------------------------
// These centralize the `as any` casts so they don't leak into route handlers.
// As the codebase moves toward generated Supabase types, these become
// the single migration point.
// ---------------------------------------------------------------------------

/**
 * Typed `.from(table)` — single cast point instead of 15+ scattered casts.
 * Returns the Supabase query builder (still generic), but we keep the cast
 * in ONE place so route files don't need `(supabase.from('table') as any)`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(table: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from(table) as any;
}

/**
 * Run a raw SQL RPC call via Supabase.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rpc<T = any>(fn: string, params?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, params as any);
  if (error) throw error;
  return data as T;
}

/**
 * Safely extract a nested relation from a Supabase joined result.
 * Example: `safeRelation(order, 'users', 'name')` -> "John" or null
 */
export function safeRelation<T = Record<string, unknown>>(
  row: Record<string, unknown> | null | undefined,
  relationKey: string,
): T | null {
  if (!row || !row[relationKey]) return null;
  return row[relationKey] as T;
}

/**
 * Safely extract a scalar from a nested relation.
 * Example: `safeRelationValue(order, 'users', 'name')` -> "John" or null
 */
export function safeRelationValue(
  row: Record<string, unknown> | null | undefined,
  relationKey: string,
  field: string,
): unknown {
  return safeRelation(row, relationKey)?.[field as keyof object] ?? null;
}
