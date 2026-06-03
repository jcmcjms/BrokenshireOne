import { supabase } from '@/lib/supabase/client';
import type { JwtPayload } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditEvent {
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Audit action constants – use these instead of raw strings for consistency
// ---------------------------------------------------------------------------

export const AuditActions = {
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DEACTIVATE: 'user.deactivate',
  PERMISSION_OVERRIDE: 'permission.override',
  ROLE_CHANGE: 'role.change',
  CREDIT_ADJUST: 'credit.adjust',
  SALARY_DEDUCTION: 'salary.deduction',
  MENU_CREATE: 'menu.create',
  MENU_UPDATE: 'menu.update',
  MENU_DELETE: 'menu.delete',
  INVENTORY_ADJUST: 'inventory.adjust',

  // Library
  LIBRARY_BOOK_CREATE: 'library.book.create',
  LIBRARY_BOOK_UPDATE: 'library.book.update',
  LIBRARY_BOOK_DELETE: 'library.book.delete',
  LIBRARY_BORROW: 'library.borrow',
  LIBRARY_RETURN: 'library.return',
  LIBRARY_RENEW: 'library.renew',
  LIBRARY_RESERVE: 'library.reserve',
  LIBRARY_CANCEL_RESERVATION: 'library.cancel_reservation',
  LIBRARY_FINE_PAY: 'library.fine.pay',
  LIBRARY_FINE_WAIVE: 'library.fine.waive',
  LIBRARY_MEMBER_CREATE: 'library.member.create',
  LIBRARY_MEMBER_UPDATE: 'library.member.update',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

// ---------------------------------------------------------------------------
// Core audit logger
// ---------------------------------------------------------------------------

/**
 * Insert a row into the `audit_log` table.
 *
 * Errors are caught and logged to console.error so that a failed audit write
 * never breaks the calling operation.
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      actor_id: event.actor_id,
      action: event.action,
      entity_type: event.entity_type,
      entity_id: event.entity_id ?? null,
      details: event.details ?? null,
    });
  } catch (error) {
    console.error('Audit log insert failed:', error);
  }
}

// ---------------------------------------------------------------------------
// Convenience wrapper for admin / server-action contexts
// ---------------------------------------------------------------------------

/**
 * Log an audit event on behalf of an authenticated user whose JWT payload
 * is available (e.g. from a server action or API route).
 *
 * Extracts `actor_id` from `session.user_id` and delegates to `logAuditEvent`.
 */
export async function logAdminAction(
  session: JwtPayload,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, unknown> | null,
): Promise<void> {
  await logAuditEvent({
    actor_id: session.user_id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}
