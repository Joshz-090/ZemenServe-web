import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { FinancialReportingService } from '@/lib/accounting/reporting.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    const profitAndLoss = await FinancialReportingService.getProfitAndLoss({ startDate, endDate });

    return NextResponse.json({
      success: true,
      profitAndLoss,
    });
  } catch (error: any) {
    console.error('Profit and Loss GET Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to generate Profit & Loss Statement' },
      { status: 500 }
    );
  }
}
