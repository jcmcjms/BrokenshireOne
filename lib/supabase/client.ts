import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the SERVICE_ROLE key.
 * Only import this in API routes and server components — NOT in client components.
 * This bypasses RLS and has full admin database access.
 *
 * Uses lazy singleton pattern so it only throws at first use, not at import time.
 */

let serverClient: SupabaseClient | null = null;

function getServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server env vars. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
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
 * 
 * @example
 * import { supabase } from '@/lib/supabase/client';
 * const { data } = await supabase.from('users').select('*');
 */
export const supabase = new Proxy<SupabaseClient>({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as any)[prop];
  },
});
