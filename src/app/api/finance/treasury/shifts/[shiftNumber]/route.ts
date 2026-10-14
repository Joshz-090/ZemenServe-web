import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { TreasuryService } from '@/lib/accounting/treasury.service';

export const dynamic = 'force-dynamic';

export async function GET(
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
    const reconciliationSheet = await TreasuryService.getShiftReconciliationSheet(shiftNumber);

    return NextResponse.json({
      success: true,
      shift: reconciliationSheet,
    });
  } catch (error: any) {
    console.error('Error fetching shift reconciliation sheet:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Shift not found' },
      { status: 404 }
    );
  }
}
