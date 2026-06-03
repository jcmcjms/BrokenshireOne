import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import type { ApiResponse, JwtPayload } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Authentication and authorization configuration for API routes.
 *
 * - Default (`{ permissions: ['x'] }`): requires auth + permission check
 * - Public (`{ requireAuth: false }`): no auth required
 * - Role-only (`{ roles: ['admin'] }`): requires auth + role check
 */
export type AuthConfig =
  | { requireAuth?: true; permissions?: string[]; roles?: string[] }
  | { requireAuth: false };

export type RouteHandler<T = any> = (
  request: NextRequest,
  params: Record<string, string>,
  session: JwtPayload,
) => Promise<NextResponse<ApiResponse<T>>>;

export type UnsafeRouteHandler<T = any> = (
  request: NextRequest,
  params: Record<string, string>,
) => Promise<NextResponse<ApiResponse<T>>>;

// ---------------------------------------------------------------------------
// Shared error logger
// ---------------------------------------------------------------------------

export function logError(module: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${module}] ${message}`);
  if (error instanceof Error && error.stack) {
    console.debug(`[${module}] Stack:`, error.stack);
  }
}

// ---------------------------------------------------------------------------
// API Handler factory
// ---------------------------------------------------------------------------

/**
 * Wraps an API route handler with authentication, authorization, and
 * consistent error handling.
 *
 * Usage:
 * ```ts
 * export const GET = apiHandler(async (req, params, session) => {
 *   const data = await getMenuCategories();
 *   return NextResponse.json({ success: true, data });
 * }, { permissions: ['menu.view'] });
 *
 * export const POST = apiHandler(async (req, _params, session) => {
 *   // ... requires auth, no specific permission
 * }, { requireAuth: true });
 *
 * export const GET = apiHandler(async (req) => {
 *   return NextResponse.json({ success: true, data: 'ok' });
 * }, { requireAuth: false });
 * ```
 */
export function apiHandler<T>(
  handler: RouteHandler<T>,
  auth: AuthConfig = {},
) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
  ) => {
    try {
      // Check if auth is explicitly disabled
      const isPublic = 'requireAuth' in auth && auth.requireAuth === false;

      if (!isPublic) {
        // --- Authenticate ---
        const session = await getSession();
        if (!session) {
          return NextResponse.json<ApiResponse>(
            { success: false, error: 'Not authenticated' },
            { status: 401 },
          );
        }

        // --- Authorize (permissions) ---
        if (auth.permissions && auth.permissions.length > 0) {
          const hasPermission = auth.permissions.some((p) =>
            session.permissions.includes(p),
          );
          if (!hasPermission) {
            return NextResponse.json<ApiResponse>(
              { success: false, error: 'Forbidden' },
              { status: 403 },
            );
          }
        }

        // --- Authorize (roles) ---
        if (auth.roles && auth.roles.length > 0) {
          if (!auth.roles.includes(session.role)) {
            return NextResponse.json<ApiResponse>(
              { success: false, error: 'Forbidden' },
              { status: 403 },
            );
          }
        }

        const resolvedParams = await context.params;
        return handler(request, resolvedParams, session);
      }

      // Public route: no auth needed
      const resolvedParams = await context.params;
      return (handler as UnsafeRouteHandler)(request, resolvedParams);
    } catch (error) {
      const moduleLabel = `${request.method} ${request.nextUrl?.pathname ?? 'unknown'}`;
      logError(moduleLabel, error);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 },
      );
    }
  };
}
