import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models/User';

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    // Auto-seed default Admin if no users exist in database
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      const defaultPasswordHash = await bcrypt.hash('Password123', 10);
      await UserModel.create({
        username: 'admin',
        password: defaultPasswordHash,
        name: 'General Manager (Admin)',
        email: 'eyasuzerihun80@gmail.com',
        role: 'Admin',
        isActive: true,
      });
      console.log('Seeded default Admin user (admin / Password123 / eyasuzerihun80@gmail.com) into Database');
    }

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // Find user in database by username or phoneNumber
    const user = await UserModel.findOne({
      $or: [{ username: cleanUsername }, { phoneNumber: username.trim() }],
    });

    if (!user || user.role === 'Waiter') {
      return NextResponse.json(
        { success: false, error: 'Incorrect username or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Your account is deactivated. Please contact an Administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const userData = {
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const response = NextResponse.json({
      success: true,
      user: userData,
      message: 'Login successful',
    });

    // Set secure authentication cookie
    response.cookies.set({
      name: 'zemen_auth_session',
      value: JSON.stringify(userData),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
