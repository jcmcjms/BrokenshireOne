import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

export async function GET() {
  const diagnostics: Record<string, any> = {
    env: {},
    supabase: null,
    jwt: null,
    cookies: null,
  };

  // Check env vars
  diagnostics.env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
  };

  // Check Supabase client creation
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const client = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await client.from('users').select('count(*)', { count: 'exact', head: true });
      diagnostics.supabase = {
        connected: true,
        table_check: error ? error.message : 'OK',
        count: data?.count ?? data,
      };
    } else {
      diagnostics.supabase = { connected: false, reason: 'Missing env vars' };
    }
  } catch (e: any) {
    diagnostics.supabase = { connected: false, error: e.message };
  }

  // Check JWT signing
  try {
    const { signToken } = await import('@/lib/auth/jwt');
    const token = signToken({ user_id: 'test', email: 'test@test.com', role: 'admin', role_id: 'test', permissions: [] });
    const { verifyToken } = await import('@/lib/auth/jwt');
    const decoded = verifyToken(token);
    diagnostics.jwt = {
      can_sign: !!token,
      can_verify: !!decoded,
      token_preview: token?.substring(0, 20) + '...',
    };
  } catch (e: any) {
    diagnostics.jwt = { error: e.message };
  }

  // Check cookies
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    diagnostics.cookies = {
      available: true,
      all_cookies: cookieStore.getAll().map(c => c.name),
    };
  } catch (e: any) {
    diagnostics.cookies = { available: false, error: e.message };
  }

  return NextResponse.json<ApiResponse>({
    success: true,
    data: diagnostics,
  });
}
