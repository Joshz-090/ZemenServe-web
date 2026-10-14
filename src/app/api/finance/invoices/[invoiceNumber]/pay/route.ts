import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { AccountsReceivableService } from '@/lib/accounting/ar.service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Cashier', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    const { invoiceNumber } = await context.params;
    if (!invoiceNumber) {
      return NextResponse.json({ success: false, error: 'Invoice number is required.' }, { status: 400 });
    }

    const body = await req.json();
    const { paymentAmount, paymentMethod, referenceCode, paymentDate, notes } = body;

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      return NextResponse.json({ success: false, error: 'Valid payment amount is required.' }, { status: 400 });
    }

    const actorName = auth.userDoc?.name || auth.session?.username || 'Cashier';

    const updatedInvoice = await AccountsReceivableService.recordInvoicePayment(invoiceNumber, {
      paymentAmount: Number(paymentAmount),
      paymentMethod: paymentMethod || 'Cash',
      referenceCode,
      paymentDate,
      recordedBy: actorName,
      notes,
    });

    return NextResponse.json({
      success: true,
      message: `Payment of ETB ${Number(paymentAmount).toFixed(2)} recorded for ${invoiceNumber}.`,
      invoice: updatedInvoice,
    });
  } catch (error: any) {
    console.error('Invoice Payment Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record invoice payment' },
      { status: 400 }
    );
  }
}
