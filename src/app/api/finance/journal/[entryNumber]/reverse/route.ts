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

    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'General correction reversal';
    const userName = auth.userDoc?.name || auth.session?.username || 'Accountant';

    const result = await GeneralLedgerService.reverseJournalEntry(entryNumber, userName, reason);

    return NextResponse.json({
      success: true,
      message: `Journal entry "${entryNumber}" successfully reversed by compensating entry "${result.reversalEntry.entryNumber}".`,
      originalEntry: result.originalEntry,
      reversalEntry: result.reversalEntry,
    });
  } catch (error: any) {
    console.error('Journal Reverse Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reverse journal entry' },
      { status: 400 }
    );
  }
}
