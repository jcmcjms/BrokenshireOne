import { createClient } from '@supabase/supabase-js';

/**
 * Browser-safe Supabase client using the ANON (public) key.
 * Safe to import and use in client components.
 * Respects RLS policies — only returns data the user is permitted to see.
 *
 * Usage (client components only):
 *   import { supabase } from '@/lib/supabase/browser';
 *   const { data } = await supabase.from('menu_items').select('*');
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase browser env vars. ' +
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
