import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { AccountsReceivableService } from '@/lib/accounting/ar.service';
import { CustomerInvoiceModel } from '@/lib/models/CustomerInvoice';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Cashier', 'Accountant', 'Receptionist']);
    if (auth.errorResponse) return auth.errorResponse;

    const { invoiceNumber } = await context.params;
    if (!invoiceNumber) {
      return NextResponse.json({ success: false, error: 'Invoice number is required.' }, { status: 400 });
    }

    const url = new URL(req.url);
    const printable = url.searchParams.get('printable') === 'true';

    if (printable) {
      const taxInvoiceDoc = await AccountsReceivableService.getPrintableTaxInvoice(invoiceNumber);
      return NextResponse.json({ success: true, taxInvoice: taxInvoiceDoc });
    }

    await connectToDatabase();
    const invoice = await CustomerInvoiceModel.findOne({ invoiceNumber: invoiceNumber.trim() }).lean();

    if (!invoice) {
      return NextResponse.json({ success: false, error: `Invoice "${invoiceNumber}" not found.` }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    console.error('Invoice GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}
