import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models/User';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email, userNote } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: cleanEmail });

    if (!user) {
      // For security, give a generic message or inform
      return NextResponse.json({
        success: true,
        message: 'If an account exists for this email, a reset request has been sent to the Administrator.',
      });
    }

    // Update user record with pending reset request
    user.resetRequest = {
      isPending: true,
      requestedAt: new Date(),
      userNote: userNote || 'User requested password reset from login screen',
    };
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Password reset request sent successfully to the Administrator!',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit password reset request' },
      { status: 500 }
    );
  }
}
