import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set({
    name: 'zemen_auth_session',
    value: '',
    path: '/',
    expires: new Date(0),
  });
  return response;
}
