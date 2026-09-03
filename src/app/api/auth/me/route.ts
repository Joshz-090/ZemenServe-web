import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models/User';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('zemen_auth_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const sessionData = JSON.parse(sessionCookie.value);

    // Verify user still exists and is active in database
    await connectToDatabase();
    const user = await UserModel.findById(sessionData.id);

    if (!user || !user.isActive) {
      const response = NextResponse.json({ success: false, user: null }, { status: 401 });
      response.cookies.delete('zemen_auth_session');
      return response;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
