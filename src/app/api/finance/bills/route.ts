import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { SupplierBillModel } from '@/lib/models/SupplierBill';
import { AccountsPayableService } from '@/lib/accounting/ap.service';

export const dynamic = 'force-dynamic';

// GET: Query supplier bills with filters
export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const url = new URL(req.url);

    const status = url.searchParams.get('status');
    const supplierId = url.searchParams.get('supplierId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const search = url.searchParams.get('search');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

    const query: any = {};
    if (status) query.status = status;
    if (supplierId) query.supplierId = Number(supplierId);

    if (startDate || endDate) {
      query.billDate = {};
      if (startDate) query.billDate.$gte = startDate;
      if (endDate) query.billDate.$lte = endDate;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { billNumber: regex },
        { supplierInvoiceNumber: regex },
        { supplierName: regex },
        { purchaseOrderRef: regex },
        { goodsReceivedRef: regex },
      ];
    }

    const bills = await SupplierBillModel.find(query)
      .sort({ idNumber: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, count: bills.length, bills });
  } catch (error: any) {
    console.error('Supplier Bills GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch supplier bills' },
      { status: 500 }
    );
  }
}

// POST: Create and approve a supplier bill with 3-way matching and GL posting
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const {
      supplierId,
      supplierInvoiceNumber,
      billDate,
      dueDate,
      paymentTermsDays,
      purchaseOrderRef,
      goodsReceivedRef,
      lines,
      withholdingTaxRate,
      autoRestockInventory,
      notes,
    } = body;

    if (!supplierId || !supplierInvoiceNumber || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supplier ID, Vendor Tax Invoice Number, and at least one item line are required.',
        },
        { status: 400 }
      );
    }

    const actorName = auth.userDoc?.name || auth.session?.username || 'Procurement Agent';

    const bill = await AccountsPayableService.createSupplierBill({
      supplierId: Number(supplierId),
      supplierInvoiceNumber,
      billDate,
      dueDate,
      paymentTermsDays,
      purchaseOrderRef,
      goodsReceivedRef,
      lines,
      withholdingTaxRate: withholdingTaxRate !== undefined ? Number(withholdingTaxRate) : 0,
      autoRestockInventory: autoRestockInventory !== false,
      notes,
      createdBy: actorName,
    });

    return NextResponse.json({ success: true, bill }, { status: 201 });
  } catch (error: any) {
    console.error('Supplier Bill POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create supplier bill' },
      { status: 400 }
    );
  }
}
