import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { AccountsReceivableService } from '@/lib/accounting/ar.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant', 'Cashier', 'Receptionist']);
    if (auth.errorResponse) return auth.errorResponse;

    const url = new URL(req.url);
    const customer = url.searchParams.get('customer');
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer name or identifier is required to generate account statement.' },
        { status: 400 }
      );
    }

    const statement = await AccountsReceivableService.getCustomerStatement(customer, {
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, statement });
  } catch (error: any) {
    console.error('Customer Statement GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate customer statement' },
      { status: 500 }
    );
  }
}
