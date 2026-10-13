import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getRoleFromSessionToken(token: string): string | null {
  try {
    if (!token || !token.includes('.')) return null;
    const [payloadBase64] = token.split('.');
    if (!payloadBase64) return null;
    let base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonStr = typeof atob !== 'undefined'
      ? atob(base64)
      : Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const payload = JSON.parse(jsonStr);
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload.role || null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('zemen_auth_session')?.value;
  const { pathname } = request.nextUrl;

  // Root route redirection based on authenticated user's role
  if (pathname === '/') {
    if (token) {
      const role = getRoleFromSessionToken(token);
      if (role === 'Admin' || role === 'Manager') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else if (role === 'Cashier') {
        return NextResponse.redirect(new URL('/pos', request.url));
      } else if (role === 'Receptionist' || role === 'Housekeeper') {
        return NextResponse.redirect(new URL('/reception', request.url));
      } else if (role === 'Accountant') {
        return NextResponse.redirect(new URL('/finance', request.url));
      } else if (role === 'Chef') {
        return NextResponse.redirect(new URL('/kitchen', request.url));
      } else if (role === 'Waiter') {
        return NextResponse.redirect(new URL('/waiters', request.url));
      } else if (role) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
    return NextResponse.next();
  }

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
    '/',
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
    '/events',
    '/events/:path*',
    '/hr',
    '/hr/:path*',
  ],
};
