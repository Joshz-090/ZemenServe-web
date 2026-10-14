import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { AccountsPayableService } from '@/lib/accounting/ap.service';

export const dynamic = 'force-dynamic';

// GET: Fetch all active suppliers
export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    const url = new URL(req.url);
    const category = url.searchParams.get('category') || undefined;
    const search = url.searchParams.get('search') || undefined;

    const suppliers = await AccountsPayableService.getAllSuppliers({ category, search });
    return NextResponse.json({ success: true, count: suppliers.length, suppliers });
  } catch (error: any) {
    console.error('Suppliers GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

// POST: Create a new supplier
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const {
      name,
      contactPerson,
      phone,
      email,
      tinNumber,
      vatRegistered,
      withholdingAgent,
      category,
      paymentTermsDays,
      bankName,
      bankAccountNumber,
      address,
      notes,
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Supplier company name and phone are required.' },
        { status: 400 }
      );
    }

    const supplier = await AccountsPayableService.createSupplier({
      name,
      contactPerson,
      phone,
      email,
      tinNumber,
      vatRegistered,
      withholdingAgent,
      category,
      paymentTermsDays,
      bankName,
      bankAccountNumber,
      address,
      notes,
    });

    return NextResponse.json({ success: true, supplier }, { status: 201 });
  } catch (error: any) {
    console.error('Suppliers POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create supplier' },
      { status: 400 }
    );
  }
}
