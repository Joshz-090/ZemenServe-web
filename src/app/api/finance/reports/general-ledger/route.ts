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
    const accountCode = url.searchParams.get('accountCode') || undefined;
    const accountType = url.searchParams.get('accountType') || undefined;

    const generalLedger = await FinancialReportingService.getGeneralLedgerReport({
      startDate,
      endDate,
      accountCode,
      accountType,
    });

    return NextResponse.json({
      success: true,
      generalLedger,
    });
  } catch (error: any) {
    console.error('General Ledger GET Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to generate General Ledger Report' },
      { status: 500 }
    );
  }
}
