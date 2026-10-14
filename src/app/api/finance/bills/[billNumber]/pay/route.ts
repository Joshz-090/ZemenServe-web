import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { AccountsPayableService } from '@/lib/accounting/ap.service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ billNumber: string }> }
) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    const { billNumber } = await context.params;
    if (!billNumber) {
      return NextResponse.json({ success: false, error: 'Bill number is required.' }, { status: 400 });
    }

    const body = await req.json();
    const { paymentAmount, paymentMethod, referenceCode, paymentDate, notes } = body;

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      return NextResponse.json({ success: false, error: 'Valid payment disbursement amount is required.' }, { status: 400 });
    }

    const actorName = auth.userDoc?.name || auth.session?.username || 'Finance Officer';

    const updatedBill = await AccountsPayableService.recordBillPayment(billNumber, {
      paymentAmount: Number(paymentAmount),
      paymentMethod: paymentMethod || 'Bank Transfer',
      referenceCode,
      paymentDate,
      recordedBy: actorName,
      notes,
    });

    return NextResponse.json({
      success: true,
      message: `Payment disbursement of ETB ${Number(paymentAmount).toFixed(2)} recorded for ${billNumber}.`,
      bill: updatedBill,
    });
  } catch (error: any) {
    console.error('Bill Payment Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record bill payment' },
      { status: 400 }
    );
  }
}
