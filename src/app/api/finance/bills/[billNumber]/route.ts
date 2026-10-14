import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { SupplierBillModel } from '@/lib/models/SupplierBill';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
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

    await connectToDatabase();
    const bill = await SupplierBillModel.findOne({ billNumber: billNumber.trim() }).lean();

    if (!bill) {
      return NextResponse.json({ success: false, error: `Supplier bill "${billNumber}" not found.` }, { status: 404 });
    }

    return NextResponse.json({ success: true, bill });
  } catch (error: any) {
    console.error('Supplier Bill GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch supplier bill' },
      { status: 500 }
    );
  }
}
