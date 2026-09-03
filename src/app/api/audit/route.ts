import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AuditLogModel } from '@/lib/models/AuditLog';

// GET: Fetch audit logs from database
export async function GET() {
  try {
    await connectToDatabase();
    const docs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(100).lean();

    const logs = docs.map((doc: any) => ({
      id: doc.idNumber,
      timestamp: doc.timestamp,
      user: doc.user,
      action: doc.action,
      details: doc.details,
    }));

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Database Audit Logs GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch audit logs from database' },
      { status: 500 }
    );
  }
}

// POST: Log an audit event in database
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const { user, action, details } = body;

    if (!user || !action || !details) {
      return NextResponse.json(
        { success: false, error: 'User, action, and details are required for audit logging' },
        { status: 400 }
      );
    }

    const lastLog = await AuditLogModel.findOne().sort({ idNumber: -1 }).lean();
    const nextId = lastLog && lastLog.idNumber ? lastLog.idNumber + 1 : 1;

    const log = await AuditLogModel.create({
      idNumber: nextId,
      timestamp: new Date().toISOString(),
      user,
      action,
      details,
    });

    return NextResponse.json({
      success: true,
      log: {
        id: log.idNumber,
        timestamp: log.timestamp,
        user: log.user,
        action: log.action,
        details: log.details,
      },
    });
  } catch (error: any) {
    console.error('Database Audit Logs POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record audit log in database' },
      { status: 500 }
    );
  }
}
