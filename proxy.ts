import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

const SESSION_COOKIE_NAME = 'session_token';

const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout'];

async function getCurrentSessionVersion(userId: string): Promise<number> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) return 0;
    const sb = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data } = await sb.from('users').select('session_version').eq('id', userId).single();
    return (data as any)?.session_version ?? 0;
  } catch {
    return 0;
  }
}

const roleRoutes: Record<string, string[]> = {
  admin: ['/dashboard/admin'],
  manager: ['/dashboard/manager', '/dashboard'],
  staff: ['/dashboard/staff', '/dashboard'],
  faculty: ['/dashboard/faculty', '/dashboard', '/dashboard/order'],
  student: ['/dashboard/student', '/dashboard', '/dashboard/order'],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static files
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // API routes handle their own authentication - let them through
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    // Protect dashboard pages - redirect to login
    if (pathname.startsWith('/dashboard')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const payload = verifyToken(token);

  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // Check session_version for invalidation
  if (payload.session_version !== undefined) {
    const currentVersion = await getCurrentSessionVersion(payload.user_id);
    if (currentVersion > payload.session_version) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  if (pathname.startsWith('/dashboard/')) {
    const role = payload.role;
    const allowedRoutes = roleRoutes[role] || [];

    const hasAccess = allowedRoutes.some(route => pathname.startsWith(route));

    if (!hasAccess) {
      const roleDashboard: Record<string, string> = {
        admin: '/dashboard/admin',
        manager: '/dashboard/manager',
        staff: '/dashboard/staff',
        faculty: '/dashboard/faculty',
        student: '/dashboard/student',
      };
      return NextResponse.redirect(new URL(roleDashboard[role] || '/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/|next.svg|vercel.svg|globe.svg|window.svg|file.svg).*)',
  ],
};
