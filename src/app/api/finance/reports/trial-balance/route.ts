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
    const startDate = url.searchParams.get('startDate') || undefined;

    const trialBalance = await FinancialReportingService.getTrialBalance({ asOfDate, startDate });

    return NextResponse.json({ success: true, trialBalance });
  } catch (error: any) {
    console.error('Trial Balance GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate Trial Balance' },
      { status: 500 }
    );
  }
}
