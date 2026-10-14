import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { FinancialReportingService } from '@/lib/accounting/reporting.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    const url = new URL(req.url);
    const asOfDate = url.searchParams.get('asOfDate') || undefined;

    const balanceSheet = await FinancialReportingService.getBalanceSheet({ asOfDate });

    return NextResponse.json({
      success: true,
      balanceSheet,
    });
  } catch (error: any) {
    console.error('Balance Sheet GET Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to generate Balance Sheet' },
      { status: 500 }
    );
  }
}
