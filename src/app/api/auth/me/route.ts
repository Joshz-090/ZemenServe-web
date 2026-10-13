import { NextResponse, NextRequest } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    const user = auth.userDoc!;
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
