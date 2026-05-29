import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types';
import type { DbUser } from '@/types/database';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    // Only admin users can list all users
    if (session.role !== 'admin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('*, roles(name)')
      .order('name', { ascending: true });

    if (error) {
      console.error('[users] Query error:', error.message);
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 },
      );
    }

    // Transform to frontend-friendly format
    const safeUsers = (users as unknown as DbUser[]).map(user => {
      const roleName = (user as any).roles?.name ?? 'student';
      const { password_hash, roles, ...safeUser } = user as any;
      return { ...safeUser, role: roleName };
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: safeUsers,
    });
  } catch (error) {
    console.error('[users] Error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 },
    );
  }
}
