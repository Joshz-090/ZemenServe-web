import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { TreasuryService } from '@/lib/accounting/treasury.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, [
      'Admin',
      'Manager',
      'Accountant',
      'Cashier',
      'Receptionist',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const summary = await TreasuryService.getTreasuryDashboardSummary();

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Error fetching treasury dashboard summary:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch treasury summary' },
      { status: 500 }
    );
  }
}
