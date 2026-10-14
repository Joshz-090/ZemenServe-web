import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { GeneralLedgerService } from '@/lib/accounting/ledger.service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ entryNumber: string }> }
) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    const { entryNumber } = await context.params;
    if (!entryNumber) {
      return NextResponse.json({ success: false, error: 'Entry number is required.' }, { status: 400 });
    }

    const userName = auth.userDoc?.name || auth.session?.username || 'Accountant';
    const postedEntry = await GeneralLedgerService.postJournalEntry(entryNumber, userName);

    return NextResponse.json({
      success: true,
      message: `Journal entry "${entryNumber}" has been successfully posted to the General Ledger.`,
      entry: postedEntry,
    });
  } catch (error: any) {
    console.error('Journal Post Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to post journal entry' },
      { status: 400 }
    );
  }
}
