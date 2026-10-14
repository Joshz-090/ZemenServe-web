import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { CashMovementModel } from '@/lib/models/CashMovement';
import { TreasuryService } from '@/lib/accounting/treasury.service';

export const dynamic = 'force-dynamic';

// GET: List cash movements
export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, [
      'Admin',
      'Manager',
      'Accountant',
      'Cashier',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const url = new URL(req.url);

    const shiftNumber = url.searchParams.get('shiftNumber');
    const movementType = url.searchParams.get('movementType');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

    const query: any = {};
    if (shiftNumber) query.shiftNumber = shiftNumber;
    if (movementType) query.movementType = movementType;

    const movements = await CashMovementModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      count: movements.length,
      movements,
    });
  } catch (error: any) {
    console.error('Error fetching cash movements:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch cash movements' },
      { status: 500 }
    );
  }
}

// POST: Record an internal cash movement with GL double-entry posting
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant', 'Cashier']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (!body.movementType || !body.fromAccountCode || !body.toAccountCode || !body.amount) {
      return NextResponse.json(
        {
          success: false,
          message: 'movementType, fromAccountCode, toAccountCode, and amount are required.',
        },
        { status: 400 }
      );
    }

    const performedBy = body.performedBy || auth.userDoc?.name || 'Staff User';

    const result = await TreasuryService.recordCashMovement({
      movementType: body.movementType,
      fromAccountCode: body.fromAccountCode.trim(),
      toAccountCode: body.toAccountCode.trim(),
      amount: Number(body.amount),
      description: body.description || `Cash Movement: ${body.movementType}`,
      reference: body.reference || '',
      performedBy,
      approvedBy: body.approvedBy,
      shiftNumber: body.shiftNumber,
      date: body.date,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Cash movement executed and posted to General Ledger successfully.',
        movement: result.movement,
        journalEntryNumber: result.journalEntryNumber,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error executing cash movement:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to execute cash movement' },
      { status: 400 }
    );
  }
}
