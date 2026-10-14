import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { AccountsReceivableService } from '@/lib/accounting/ar.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    const url = new URL(req.url);
    const asOfDate = url.searchParams.get('asOfDate') || undefined;

    const arAgingReport = await AccountsReceivableService.getARAgingReport(asOfDate);

    return NextResponse.json({ success: true, arAgingReport });
  } catch (error: any) {
    console.error('AR Aging Report GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate AR Aging Report' },
      { status: 500 }
    );
  }
}
