import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { TreasuryService } from '@/lib/accounting/treasury.service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ shiftNumber: string }> }
) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    const { shiftNumber } = await context.params;
    const body = await req.json().catch(() => ({}));

    const auditedBy = body.auditedBy || auth.userDoc?.name || 'Audit Manager';

    const auditedShift = await TreasuryService.auditCashierShift(shiftNumber, auditedBy);

    return NextResponse.json({
      success: true,
      message: `Shift ${shiftNumber} audited and approved by ${auditedBy}.`,
      shift: auditedShift,
    });
  } catch (error: any) {
    console.error('Error auditing cashier shift:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to audit shift' },
      { status: 400 }
    );
  }
}
