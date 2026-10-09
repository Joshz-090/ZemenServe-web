import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('zemen_auth_session')?.value;
  const { pathname } = request.nextUrl;

  const protectedRoutes = [
    '/reception',
    '/reservations',
    '/pos',
    '/finance',
    '/admin',
    '/inventory',
    '/orders',
    '/menu',
    '/kitchen',
    '/kds',
    '/waiters',
    '/daily-report',
    '/reports',
    '/housekeeping',
    '/events',
    '/hr',
  ];

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/reception',
    '/reception/:path*',
    '/reservations',
    '/reservations/:path*',
    '/pos',
    '/pos/:path*',
    '/finance',
    '/finance/:path*',
    '/admin',
    '/admin/:path*',
    '/inventory',
    '/inventory/:path*',
    '/orders',
    '/orders/:path*',
    '/menu',
    '/menu/:path*',
    '/kitchen',
    '/kitchen/:path*',
    '/kds',
    '/kds/:path*',
    '/waiters',
    '/waiters/:path*',
    '/daily-report',
    '/daily-report/:path*',
    '/reports',
    '/reports/:path*',
    '/housekeeping',
    '/housekeeping/:path*',
    '/events',
    '/events/:path*',
    '/hr',
    '/hr/:path*',
  ],
};
