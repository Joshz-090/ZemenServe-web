import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { CashierShiftModel } from '@/lib/models/CashierShift';
import { TreasuryService } from '@/lib/accounting/treasury.service';

export const dynamic = 'force-dynamic';

// GET: List cashier shifts with filters
export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, [
      'Admin',
      'Manager',
      'Accountant',
      'Cashier',
      'Receptionist',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const url = new URL(req.url);

    const status = url.searchParams.get('status');
    const drawerId = url.searchParams.get('drawerId');
    const cashierId = url.searchParams.get('cashierId');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

    const query: any = {};
    if (status) query.status = status;
    if (drawerId) query.drawerId = drawerId;
    if (cashierId) query.cashierId = cashierId;

    const shifts = await CashierShiftModel.find(query)
      .sort({ openedAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      count: shifts.length,
      shifts,
    });
  } catch (error: any) {
    console.error('Error fetching cashier shifts:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch cashier shifts' },
      { status: 500 }
    );
  }
}

// POST: Open a new cashier shift
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, [
      'Admin',
      'Manager',
      'Accountant',
      'Cashier',
      'Receptionist',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (!body.drawerId) {
      return NextResponse.json(
        { success: false, message: 'drawerId is required to open a shift.' },
        { status: 400 }
      );
    }

    const cashierId = String(body.cashierId || auth.userDoc?._id || 'cashier-1');
    const cashierName = body.cashierName || auth.userDoc?.name || 'Cashier User';

    const shift = await TreasuryService.openCashierShift({
      cashierId,
      cashierName,
      drawerId: body.drawerId,
      station: body.station,
      openingFloat: Number(body.openingFloat) || 0,
      notes: body.notes || '',
    });

    return NextResponse.json(
      { success: true, message: 'Cashier shift opened successfully', shift },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error opening cashier shift:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to open cashier shift' },
      { status: 400 }
    );
  }
}
