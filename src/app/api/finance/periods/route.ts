import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { AccountingPeriodModel } from '@/lib/models/AccountingPeriod';

export const dynamic = 'force-dynamic';

// GET: List all accounting periods
export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const periods = await AccountingPeriodModel.find().sort({ startDate: -1 }).lean();

    return NextResponse.json({ success: true, count: periods.length, periods });
  } catch (error: any) {
    console.error('Accounting Periods GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch accounting periods' },
      { status: 500 }
    );
  }
}

// POST: Create or Close an accounting period (Restricted to Manager and Admin)
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();
    const { action, periodCode, name, fiscalYear, startDate, endDate, closingNotes } = body;
    const userName = auth.userDoc?.name || auth.session?.username || 'Manager';

    if (action === 'close') {
      if (!periodCode) {
        return NextResponse.json({ success: false, error: 'Period code is required to close a period.' }, { status: 400 });
      }

      const period = await AccountingPeriodModel.findOneAndUpdate(
        { periodCode: periodCode.trim() },
        {
          $set: {
            isClosed: true,
            closedAt: new Date(),
            closedBy: userName,
            closingNotes: closingNotes || 'Period closed by management',
          },
        },
        { new: true }
      );

      if (!period) {
        return NextResponse.json({ success: false, error: `Period "${periodCode}" not found.` }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: `Accounting period "${period.name}" (${period.periodCode}) is now closed. Postings within this date range are locked.`,
        period,
      });
    }

    if (!periodCode || !name || !fiscalYear || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Period Code, Name, Fiscal Year, Start Date, and End Date are required.' },
        { status: 400 }
      );
    }

    const newPeriod = await AccountingPeriodModel.create({
      periodCode: periodCode.trim(),
      name: name.trim(),
      fiscalYear: Number(fiscalYear),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      isClosed: false,
    });

    return NextResponse.json({ success: true, period: newPeriod }, { status: 201 });
  } catch (error: any) {
    console.error('Accounting Periods POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to manage accounting period' },
      { status: 400 }
    );
  }
}
