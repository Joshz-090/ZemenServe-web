import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { GeneralLedgerService } from '@/lib/accounting/ledger.service';
import { JournalEntryModel } from '@/lib/models/JournalEntry';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Query journal entries with filters
export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const url = new URL(req.url);

    const status = url.searchParams.get('status');
    const sourceModule = url.searchParams.get('module');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const search = url.searchParams.get('search');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

    const query: any = {};
    if (status) query.status = status;
    if (sourceModule) query.sourceModule = sourceModule;

    if (startDate || endDate) {
      query.accountingDate = {};
      if (startDate) query.accountingDate.$gte = startDate;
      if (endDate) query.accountingDate.$lte = endDate;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { entryNumber: regex },
        { memo: regex },
        { sourceDocumentNumber: regex },
        { 'lines.accountCode': regex },
        { 'lines.accountName': regex },
        { 'lines.description': regex },
      ];
    }

    const entries = await JournalEntryModel.find(query)
      .sort({ idNumber: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, count: entries.length, entries });
  } catch (error: any) {
    console.error('Journal GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch journal entries' },
      { status: 500 }
    );
  }
}

// POST: Create a new double-entry journal entry
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const { date, accountingDate, sourceModule, sourceReferenceId, sourceDocumentNumber, memo, department, lines, status } =
      body;

    if (!date || !memo || !lines || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Date, Memo, and at least two balanced lines are required for a valid journal entry.',
        },
        { status: 400 }
      );
    }

    const userName = auth.userDoc?.name || auth.session?.username || 'Accountant';

    const journalEntry = await GeneralLedgerService.createJournalEntry({
      date,
      accountingDate: accountingDate || date,
      sourceModule: sourceModule || 'Manual',
      sourceReferenceId,
      sourceDocumentNumber,
      memo,
      department: department || 'General Hotel',
      lines,
      status: status || 'Posted',
      createdBy: userName,
    });

    return NextResponse.json({ success: true, journalEntry }, { status: 201 });
  } catch (error: any) {
    console.error('Journal POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create journal entry' },
      { status: 400 }
    );
  }
}
