import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { CustomerInvoiceModel } from '@/lib/models/CustomerInvoice';
import { AccountsReceivableService } from '@/lib/accounting/ar.service';

export const dynamic = 'force-dynamic';

// GET: List invoices with filtering
export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Cashier', 'Accountant', 'Receptionist']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const url = new URL(req.url);

    const status = url.searchParams.get('status');
    const invoiceType = url.searchParams.get('type');
    const customer = url.searchParams.get('customer');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const search = url.searchParams.get('search');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

    const query: any = {};
    if (status) query.status = status;
    if (invoiceType) query.invoiceType = invoiceType;
    if (customer) query.customerName = new RegExp(customer, 'i');

    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = startDate;
      if (endDate) query.issueDate.$lte = endDate;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { invoiceNumber: regex },
        { customerName: regex },
        { customerTin: regex },
        { roomNumber: regex },
        { 'lines.description': regex },
      ];
    }

    const invoices = await CustomerInvoiceModel.find(query)
      .sort({ idNumber: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, count: invoices.length, invoices });
  } catch (error: any) {
    console.error('Invoices GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch customer invoices' },
      { status: 500 }
    );
  }
}

// POST: Create a new customer invoice
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant', 'Receptionist', 'Cashier']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const {
      invoiceType,
      customerType,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      customerTin,
      customerAddress,
      reservationId,
      eventBookingId,
      orderId,
      roomNumber,
      issueDate,
      dueDate,
      paymentTermsDays,
      lines,
      notes,
    } = body;

    if (!customerName || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer name and at least one line item are required.' },
        { status: 400 }
      );
    }

    const actorName = auth.userDoc?.name || auth.session?.username || 'Billing Agent';

    const invoice = await AccountsReceivableService.createCustomerInvoice({
      invoiceType,
      customerType,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      customerTin,
      customerAddress,
      reservationId,
      eventBookingId,
      orderId,
      roomNumber,
      issueDate,
      dueDate,
      paymentTermsDays,
      lines,
      notes,
      createdBy: actorName,
    });

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (error: any) {
    console.error('Invoices POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create invoice' },
      { status: 400 }
    );
  }
}
