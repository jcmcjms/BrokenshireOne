import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

const SESSION_COOKIE_NAME = 'session_token';

const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout'];

const roleRoutes: Record<string, string[]> = {
  admin: ['/dashboard/admin'],
  manager: ['/dashboard/manager', '/dashboard'],
  staff: ['/dashboard/staff', '/dashboard'],
  faculty: ['/dashboard/faculty', '/dashboard'],
  student: ['/dashboard/student', '/dashboard'],
};

export function proxy(request: NextRequest) {
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
