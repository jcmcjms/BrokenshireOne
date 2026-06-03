import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

// ---------------------------------------------------------------------------
// Date / time helpers
// ---------------------------------------------------------------------------

/** Get the current month (1-12) and year. Replaces 4 separate copies in route files. */
export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/** Get the next day's ISO date string (for date-range queries). */
export function getNextDayStr(dateStr: string): string {
  const nextDay = new Date(dateStr);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

export function notFoundResponse(resource: string) {
  return NextResponse.json<ApiResponse>(
    { success: false, error: `${resource} not found` },
    { status: 404 },
  );
}

export function badRequestResponse(message: string) {
  return NextResponse.json<ApiResponse>(
    { success: false, error: message },
    { status: 400 },
  );
}

// ---------------------------------------------------------------------------
// Relation flattening
// ---------------------------------------------------------------------------

/**
 * Flatten a joined Supabase relation (e.g. `{ users: { name: "John" } }`)
 * into a top-level key (e.g. `{ user_name: "John" }`).
 *
 * Replaces the ad-hoc `.map()` pattern in 7+ route files.
 */
export function flattenRelation<T extends Record<string, any>, K extends string>(
  item: T,
  relationKey: K,
  targetKey: string,
): Omit<T, K> & Record<string, any> {
  const { [relationKey]: relation, ...rest } = item;
  return { ...rest, [targetKey]: relation?.name ?? null };
}

/**
 * Batch-flatten: maps an array of items through flattenRelation.
 */
export function flattenRelations<T extends Record<string, any>>(
  items: T[],
  mappings: [string, string][],
): any[] {
  return items.map((item) => {
    let result = item;
    for (const [relationKey, targetKey] of mappings) {
      result = flattenRelation(result, relationKey as any, targetKey) as any;
    }
    return result;
  });
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

/** Check if a Supabase error is "row not found" (PGRST116). */
export function isNotFoundError(error: any): boolean {
  return error?.code === 'PGRST116';
}

// ---------------------------------------------------------------------------
// Order number generator
// ---------------------------------------------------------------------------

export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
