import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AuditLogModel } from '@/lib/models/AuditLog';
import { verifySessionAndRole } from '@/lib/auth';
import { getNextSequenceValue } from '@/lib/models/Counter';

// GET: Fetch audit logs from database (Admin, Manager, Accountant)
export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

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

// POST: Log an audit event in database (Any authenticated user)
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();

    const { user, action, details } = body;

    if (!user || !action || !details) {
      return NextResponse.json(
        { success: false, error: 'User, action, and details are required for audit logging' },
        { status: 400 }
      );
    }

    // Determine next audit log ID atomically
    const lastLog = await AuditLogModel.findOne().sort({ idNumber: -1 }).lean();
    const fallbackMaxId = lastLog && lastLog.idNumber ? lastLog.idNumber + 1 : 1;
    const nextId = await getNextSequenceValue('auditLogId', fallbackMaxId);

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
