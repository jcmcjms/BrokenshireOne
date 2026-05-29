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
 * Creates a stub client that surfaces env-missing errors through
 * normal query channels instead of throwing.
 *
 * The stub query builder mimics the Supabase chaining pattern:
 *   supabase.from('users').select('*').eq('x','y').single()
 * Each method returns the same builder proxy, and when awaited
 * (via .then() on the proxy), it resolves with an error result.
 */
function createStubClient(reason: string): SupabaseClient {
  // Build a query builder proxy that returns error on await
  function createQueryBuilder(): any {
    const queryBuilder: any = new Proxy(
      // The target is a function so it can be called; we use a Proxy for property access
      Object.assign(() => {}, {
        // then/catch makes it "thenable" — so await triggers this
        then(resolve: Function, _reject?: Function) {
          return Promise.resolve({ data: null, error: new Error(reason), count: null }).then(resolve);
        },
        catch(reject: Function) {
          return Promise.resolve({ data: null, error: new Error(reason), count: null }).then(undefined, reject);
        },
        // All chainable methods return the builder itself
        select: () => queryBuilder,
        insert: () => queryBuilder,
        update: () => queryBuilder,
        delete: () => queryBuilder,
        upsert: () => queryBuilder,
        eq: () => queryBuilder,
        neq: () => queryBuilder,
        gt: () => queryBuilder,
        gte: () => queryBuilder,
        lt: () => queryBuilder,
        lte: () => queryBuilder,
        like: () => queryBuilder,
        ilike: () => queryBuilder,
        is: () => queryBuilder,
        in: () => queryBuilder,
        contains: () => queryBuilder,
        containedBy: () => queryBuilder,
        overlaps: () => queryBuilder,
        textSearch: () => queryBuilder,
        filter: () => queryBuilder,
        not: () => queryBuilder,
        or: () => queryBuilder,
        order: () => queryBuilder,
        limit: () => queryBuilder,
        single: () => queryBuilder,
        maybeSingle: () => queryBuilder,
        range: () => queryBuilder,
      }),
      {
        get(target: any, prop: string | symbol) {
          if (prop in target) return (target as any)[prop];
          if (typeof prop === 'string' && !prop.startsWith('__')) {
            return () => queryBuilder;
          }
          return (target as any)[prop];
        },
      },
    );
    return queryBuilder;
  }

  return new Proxy({} as SupabaseClient, {
    get(_target: any, prop: string | symbol) {
      if (prop === 'from') return (_table: string) => createQueryBuilder();
      if (prop === 'rpc') return () => Promise.reject(new Error(reason));
      if (prop === 'channel' || prop === 'realtime') return () => ({ unsubscribe: () => {} });
      return undefined;
    },
  });
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
