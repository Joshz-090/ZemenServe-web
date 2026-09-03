import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/lib/models/User';

// GET all users & pending password reset requests
export async function GET() {
  try {
    await connectToDatabase();

    const users = await UserModel.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const safeUsers = users.map((u: any) => ({
      id: u._id.toString(),
      username: u.username,
      name: u.name,
      email: u.email,
      phoneNumber: u.phoneNumber || '',
      role: u.role,
      isActive: u.isActive,
      resetRequest: u.resetRequest || { isPending: false },
      createdAt: u.createdAt,
    }));

    const pendingResetRequests = safeUsers.filter((u: any) => u.resetRequest?.isPending);

    return NextResponse.json({
      success: true,
      users: safeUsers,
      pendingResetRequests,
    });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST: Admin creates a new user
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, phoneNumber, role, username, password, email } = body;

    if (!name || (!phoneNumber && !username)) {
      return NextResponse.json(
        { success: false, error: 'Full Name and Phone Number are required' },
        { status: 400 }
      );
    }

    const cleanPhone = (phoneNumber || '').trim();
    const cleanUsername = username ? username.trim().toLowerCase() : cleanPhone.replace(/\s+/g, '') || name.toLowerCase().replace(/\s+/g, '');
    const cleanEmail = email ? email.trim().toLowerCase() : `${cleanUsername}@hotel.com`;
    const rawPassword = password || cleanPhone || '123456';

    // Check if username or email already exists
    const existingUser = await UserModel.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this Username, Email, or Phone Number already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newUser = await UserModel.create({
      username: cleanUsername,
      password: hashedPassword,
      name,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      role: role || 'Cashier',
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser._id.toString(),
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        isActive: newUser.isActive,
      },
      message: `User ${newUser.name} created successfully`,
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT: Admin resets user password or toggles active status / resolves reset request
export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { userId, newPassword, role, isActive, clearResetRequest } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (newPassword) {
      user.password = await bcrypt.hash(newPassword, 10);
      user.resetRequest = { isPending: false, requestedAt: undefined, userNote: '' };
    }

    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
    }

    if (role) {
      user.role = role;
    }

    if (clearResetRequest) {
      user.resetRequest = { isPending: false, requestedAt: undefined, userNote: '' };
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: `User ${user.username} updated successfully`,
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE: Admin deletes a user
export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const user = await UserModel.findById(userId);
    if (user && user.username === 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete primary admin account' },
        { status: 400 }
      );
    }

    await UserModel.findByIdAndDelete(userId);

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
