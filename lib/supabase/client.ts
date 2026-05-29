import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the SERVICE_ROLE key.
 * Only import this in API routes and server components — NOT in client components.
 * This bypasses RLS and has full admin database access.
 *
 * Uses a resilient pattern: if env vars are missing at runtime, it creates
 * a stub client that surfaces the error at query time instead of exploding
 * at import time. This prevents 500 errors from masking the real issue.
 */

let serverClient: SupabaseClient | null = null;

function getServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    // Return a stub that surfaces the missing-env error via normal query channels
    return createStubClient('Missing Supabase env vars in this environment');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a stub client that returns errors for every query.
 * This is better than throwing during client creation because:
 * 1. The error surfaces through normal query error paths
 * 2. API routes can return proper error responses instead of 500s
 * 3. The specific missing-env message is preserved in the error
 */
function createStubClient(reason: string): SupabaseClient {
  const stubHandler = {
    get(_target: any, prop: string) {
      // Return a function that returns a failed promise for any callable prop
      if (['from', 'rpc', 'channel', 'realtime'].includes(prop)) {
        return (..._args: any[]) => {
          if (prop === 'from') {
            // Return a query builder that fails on any terminal method
            return new Proxy({} as any, {
              get(__target: any, method: string) {
                if (['select', 'insert', 'update', 'delete', 'upsert'].includes(method)) {
                  return (...__args: any[]) => Promise.resolve({ data: null, error: new Error(reason), count: null });
                }
                if (['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy', 'rangeGt', 'rangeGte', 'rangeLt', 'rangeLte', 'overlaps', 'textSearch', 'filter', 'not', 'or', 'and', 'order', 'limit', 'single', 'maybeSingle'].includes(method)) {
                  return (...__args: any[]) => __target;
                }
                if (method === 'then' || method === 'catch') {
                  // Handle awaited calls
                  return undefined;
                }
                return (...__args: any[]) => Promise.resolve({ data: null, error: new Error(reason), count: null });
              },
            });
          }
          return Promise.reject(new Error(reason));
        };
      }
      // Return a function for any other callable prop
      if (typeof ({} as any)[prop] === 'function') {
        return (..._args: any[]) => Promise.reject(new Error(reason));
      }
      return undefined;
    },
  };

  return new Proxy({} as SupabaseClient, stubHandler);
}

/**
 * Get or create the server-side Supabase client singleton.
 * Use this in API route handlers and server actions.
 */
export function getSupabase(): SupabaseClient {
  if (!serverClient) {
    serverClient = getServerClient();
  }
  return serverClient;
}

/**
 * Convenience proxy that delegates all property access to the lazy server client.
 * Use this for inline chaining: supabase.from('users').select('*')
 * Always works — never throws at access time. Errors surface through query results.
 * 
 * @example
 * import { supabase } from '@/lib/supabase/client';
 * const { data, error } = await supabase.from('users').select('*');
 */
export const supabase = new Proxy<SupabaseClient>({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as any)[prop];
  },
});
