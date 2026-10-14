import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { TreasuryService } from '@/lib/accounting/treasury.service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ shiftNumber: string }> }
) {
  try {
    const auth = await verifySessionAndRole(req, [
      'Admin',
      'Manager',
      'Accountant',
      'Cashier',
      'Receptionist',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const { shiftNumber } = await context.params;
    const body = await req.json();

    if (body.closingCashCounted === undefined || body.closingCashCounted === null) {
      return NextResponse.json(
        { success: false, message: 'closingCashCounted is required to close a cashier shift.' },
        { status: 400 }
      );
    }

    const closedBy = body.closedBy || auth.userDoc?.name || 'Staff User';

    const closedShift = await TreasuryService.closeCashierShift({
      shiftNumber,
      closingCashCounted: Number(body.closingCashCounted),
      dropToSafeAmount: body.dropToSafeAmount ? Number(body.dropToSafeAmount) : 0,
      varianceReason: body.varianceReason || '',
      closedBy,
    });

    return NextResponse.json({
      success: true,
      message: `Shift ${shiftNumber} closed successfully with status ${closedShift.varianceStatus}.`,
      shift: closedShift,
    });
  } catch (error: any) {
    console.error('Error closing cashier shift:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to close shift' },
      { status: 400 }
    );
  }
}
