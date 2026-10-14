import mongoose, { ClientSession } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import {
  JournalEntryModel,
  IJournalEntry,
  IJournalLine,
  JournalStatus,
  JournalSourceModule,
} from '@/lib/models/JournalEntry';
import { AccountModel } from '@/lib/models/Account';
import { AccountingPeriodModel } from '@/lib/models/AccountingPeriod';
import { getNextSequenceValue } from '@/lib/models/Counter';
import { toCents, toBirr, validateJournalBalance } from './money';

export interface CreateJournalLineInput {
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
  partnerType?: 'Guest' | 'Supplier' | 'Employee' | null;
  partnerId?: number | null;
  partnerName?: string | null;
  costCenter?: string | null;
}

export interface CreateJournalEntryInput {
  date: string; // 'YYYY-MM-DD'
  accountingDate?: string; // 'YYYY-MM-DD'
  sourceModule: JournalSourceModule;
  sourceReferenceId?: string; // Idempotency Key
  sourceDocumentNumber?: string;
  memo: string;
  department?: string;
  lines: CreateJournalLineInput[];
  status?: JournalStatus; // default: 'Posted'
  createdBy: string;
  session?: ClientSession;
}

export class GeneralLedgerService {
  /**
   * Generates a formatted sequential Journal Entry Number.
   * E.g., 'JE-2026-00001'
   */
  static async generateEntryNumber(year?: number): Promise<{ idNumber: number; entryNumber: string }> {
    const yr = year || new Date().getFullYear();
    const nextSeq = await getNextSequenceValue('journalEntryId', 1);
    const entryNumber = `JE-${yr}-${String(nextSeq).padStart(5, '0')}`;
    return { idNumber: nextSeq, entryNumber };
  }

  /**
   * Verifies that the target accounting date does not fall inside a locked/closed fiscal period.
   */
  static async ensurePeriodIsOpen(dateStr: string): Promise<void> {
    await connectToDatabase();
    const closedPeriod = await AccountingPeriodModel.findOne({
      startDate: { $lte: dateStr },
      endDate: { $gte: dateStr },
      isClosed: true,
    }).lean();

    if (closedPeriod) {
      throw new Error(
        `Financial Posting Blocked: Accounting period "${closedPeriod.name}" (${closedPeriod.periodCode}) is closed. Postings on ${dateStr} are prohibited.`
      );
    }
  }

  /**
   * Creates and optionally posts a new double-entry journal entry.
   * Enforces mathematical debit === credit equality, valid account codes, and idempotency.
   */
  static async createJournalEntry(
    input: CreateJournalEntryInput
  ): Promise<IJournalEntry> {
    await connectToDatabase();

    const date = input.date;
    const accountingDate = input.accountingDate || date;

    // 1. Period closure check
    await this.ensurePeriodIsOpen(accountingDate);

    // 2. Validate double-entry balance
    const balanceCheck = validateJournalBalance(input.lines);
    if (!balanceCheck.isValid) {
      throw new Error(`Double-Entry Balancing Error: ${balanceCheck.errorMessage}`);
    }

    // 3. Idempotency Guard (prevent double-posting of operational events)
    if (input.sourceReferenceId) {
      const existing = await JournalEntryModel.findOne({
        sourceModule: input.sourceModule,
        sourceReferenceId: input.sourceReferenceId,
      }).lean();

      if (existing) {
        throw new Error(
          `Idempotency Guard: Journal entry already exists for ${input.sourceModule} ref "${input.sourceReferenceId}" (Entry: ${existing.entryNumber}).`
        );
      }
    }

    // 4. Validate accounts exist in Chart of Accounts
    const accountCodes = Array.from(new Set(input.lines.map((l) => l.accountCode.trim())));
    const existingAccounts = await AccountModel.find({ code: { $in: accountCodes } }).lean();
    const accountMap = new Map<string, any>();
    existingAccounts.forEach((acc) => accountMap.set(acc.code, acc));

    for (const code of accountCodes) {
      if (!accountMap.has(code)) {
        throw new Error(`Accounting Validation Error: Account code "${code}" does not exist in the Chart of Accounts.`);
      }
      const acc = accountMap.get(code);
      if (!acc.isActive) {
        throw new Error(`Accounting Validation Error: Account "${code} - ${acc.name}" is archived/inactive.`);
      }
    }

    // 5. Construct journal lines with integer cents and account references
    const enrichedLines: IJournalLine[] = input.lines.map((l) => {
      const acc = accountMap.get(l.accountCode.trim())!;
      const debitCents = toCents(l.debit || 0);
      const creditCents = toCents(l.credit || 0);

      return {
        accountId: acc._id,
        accountCode: acc.code,
        accountName: acc.name,
        debit: toBirr(debitCents),
        credit: toBirr(creditCents),
        debitCents,
        creditCents,
        description: l.description.trim(),
        partnerType: l.partnerType || null,
        partnerId: l.partnerId || null,
        partnerName: l.partnerName || null,
        costCenter: l.costCenter || input.department || null,
      };
    });

    const status: JournalStatus = input.status || 'Posted';
    const currentYear = parseInt(date.substring(0, 4), 10) || new Date().getFullYear();
    const { idNumber, entryNumber } = await this.generateEntryNumber(currentYear);

    // Compute period code (e.g. 'FY2026-M03')
    const month = date.substring(5, 7);
    const periodCode = `FY${currentYear}-M${month}`;

    const journalDoc = new JournalEntryModel({
      idNumber,
      entryNumber,
      date,
      accountingDate,
      periodCode,
      status,
      sourceModule: input.sourceModule,
      sourceReferenceId: input.sourceReferenceId || null,
      sourceDocumentNumber: input.sourceDocumentNumber || '',
      memo: input.memo.trim(),
      department: input.department || 'General Hotel',
      totalDebit: balanceCheck.totalDebit,
      totalCredit: balanceCheck.totalCredit,
      totalDebitCents: balanceCheck.totalDebitCents,
      totalCreditCents: balanceCheck.totalCreditCents,
      lines: enrichedLines,
      createdBy: input.createdBy,
      postedBy: status === 'Posted' ? input.createdBy : null,
      postedAt: status === 'Posted' ? new Date() : null,
      isReversed: false,
    });

    await journalDoc.save({ session: input.session });
    return journalDoc;
  }

  /**
   * Posts a Draft journal entry.
   * Enforces immutability: Once posted, an entry cannot be silently edited or deleted.
   */
  static async postJournalEntry(
    entryNumber: string,
    postedBy: string
  ): Promise<IJournalEntry> {
    await connectToDatabase();
    const entry = await JournalEntryModel.findOne({ entryNumber: entryNumber.trim() });

    if (!entry) {
      throw new Error(`Journal entry "${entryNumber}" not found.`);
    }

    if (entry.status === 'Posted') {
      throw new Error(`Journal entry "${entryNumber}" is already posted.`);
    }

    if (entry.status === 'Reversed') {
      throw new Error(`Cannot post entry "${entryNumber}" because it has been reversed.`);
    }

    // Re-verify period is open
    await this.ensurePeriodIsOpen(entry.accountingDate);

    // Re-verify balance
    const check = validateJournalBalance(
      entry.lines.map((l) => ({ debit: l.debit, credit: l.credit }))
    );
    if (!check.isValid) {
      throw new Error(`Cannot post entry: ${check.errorMessage}`);
    }

    entry.status = 'Posted';
    entry.postedBy = postedBy;
    entry.postedAt = new Date();

    await entry.save();
    return entry;
  }

  /**
   * Reverses a posted journal entry using an explicit compensating journal entry.
   * Follows standard professional ERP accounting principles (e.g. Odoo / SAP).
   */
  static async reverseJournalEntry(
    entryNumber: string,
    reversedBy: string,
    reason: string
  ): Promise<{ originalEntry: IJournalEntry; reversalEntry: IJournalEntry }> {
    await connectToDatabase();

    const original = await JournalEntryModel.findOne({ entryNumber: entryNumber.trim() });
    if (!original) {
      throw new Error(`Journal entry "${entryNumber}" not found.`);
    }

    if (original.status !== 'Posted') {
      throw new Error(`Only posted journal entries can be reversed. Current status: ${original.status}.`);
    }

    if (original.isReversed) {
      throw new Error(
        `Journal entry "${entryNumber}" has already been reversed by "${original.reversedByEntryNumber}".`
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    await this.ensurePeriodIsOpen(todayStr);

    // Invert every debit into a credit and every credit into a debit
    const reversedLines: CreateJournalLineInput[] = original.lines.map((line) => ({
      accountCode: line.accountCode,
      debit: line.credit, // Invert
      credit: line.debit, // Invert
      description: `Reversal of ${entryNumber}: ${line.description}`,
      partnerType: line.partnerType,
      partnerId: line.partnerId,
      partnerName: line.partnerName,
      costCenter: line.costCenter,
    }));

    const reversalEntry = await this.createJournalEntry({
      date: todayStr,
      accountingDate: todayStr,
      sourceModule: 'Reversal',
      sourceReferenceId: `rev-${original.entryNumber}-${Date.now()}`,
      sourceDocumentNumber: original.entryNumber,
      memo: `[REVERSAL] ${reason ? reason : 'Correction reversal'} (Reverses ${entryNumber})`,
      department: original.department,
      lines: reversedLines,
      status: 'Posted',
      createdBy: reversedBy,
    });

    // Link original entry to reversal entry
    original.isReversed = true;
    original.reversedByEntryNumber = reversalEntry.entryNumber;
    await original.save();

    reversalEntry.reversalOfEntryNumber = original.entryNumber;
    await reversalEntry.save();

    return { originalEntry: original, reversalEntry };
  }

  /**
   * Generates a Real-Time Trial Balance report.
   * Enforces Trial Balance equilibrium: Total Debits === Total Credits.
   */
  static async getTrialBalance(asOfDate?: string): Promise<{
    asOfDate: string;
    accounts: {
      code: string;
      name: string;
      type: string;
      normalBalance: string;
      debitSum: number;
      creditSum: number;
      netDebit: number;
      netCredit: number;
    }[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
    difference: number;
  }> {
    await connectToDatabase();

    const targetDate = asOfDate || new Date().toISOString().split('T')[0];

    // Pipeline: Aggregate posted journal lines up to targetDate
    const pipeline: any[] = [
      {
        $match: {
          status: 'Posted',
          accountingDate: { $lte: targetDate },
        },
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.accountCode',
          accountName: { $first: '$lines.accountName' },
          totalDebitCents: { $sum: '$lines.debitCents' },
          totalCreditCents: { $sum: '$lines.creditCents' },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const aggregated = await JournalEntryModel.aggregate(pipeline);

    // Fetch account master metadata
    const allAccounts = await AccountModel.find({ isActive: true }).sort({ code: 1 }).lean();
    const aggMap = new Map<string, { totalDebitCents: number; totalCreditCents: number }>();
    aggregated.forEach((item) => {
      aggMap.set(item._id, {
        totalDebitCents: item.totalDebitCents,
        totalCreditCents: item.totalCreditCents,
      });
    });

    let grandDebitCents = 0;
    let grandCreditCents = 0;

    const trialBalanceAccounts = allAccounts.map((acc) => {
      const data = aggMap.get(acc.code) || { totalDebitCents: 0, totalCreditCents: 0 };
      const debitSum = toBirr(data.totalDebitCents);
      const creditSum = toBirr(data.totalCreditCents);

      // Normal balance calculations
      const diffCents = data.totalDebitCents - data.totalCreditCents;
      let netDebit = 0;
      let netCredit = 0;

      if (acc.normalBalance === 'Debit') {
        if (diffCents >= 0) {
          netDebit = toBirr(diffCents);
        } else {
          netCredit = toBirr(Math.abs(diffCents));
        }
      } else {
        // Normal Credit
        if (diffCents <= 0) {
          netCredit = toBirr(Math.abs(diffCents));
        } else {
          netDebit = toBirr(diffCents);
        }
      }

      grandDebitCents += toCents(netDebit);
      grandCreditCents += toCents(netCredit);

      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
        debitSum,
        creditSum,
        netDebit,
        netCredit,
      };
    });

    // Only include accounts with activity or non-zero balance
    const activeTrialBalance = trialBalanceAccounts.filter(
      (a) => a.debitSum > 0 || a.creditSum > 0 || a.netDebit > 0 || a.netCredit > 0
    );

    const diffCents = Math.abs(grandDebitCents - grandCreditCents);
    const isBalanced = diffCents === 0;

    return {
      asOfDate: targetDate,
      accounts: activeTrialBalance,
      totalDebit: toBirr(grandDebitCents),
      totalCredit: toBirr(grandCreditCents),
      isBalanced,
      difference: toBirr(diffCents),
    };
  }

  /**
   * Retrieves an itemized General Ledger report for a specific account.
   */
  static async getAccountLedger(options: {
    accountCode: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    account: { code: string; name: string; type: string; normalBalance: string };
    openingBalance: number;
    transactions: {
      date: string;
      entryNumber: string;
      memo: string;
      description: string;
      debit: number;
      credit: number;
      runningBalance: number;
    }[];
    closingBalance: number;
    totalDebit: number;
    totalCredit: number;
  }> {
    await connectToDatabase();
    const account = await AccountModel.findOne({ code: options.accountCode.trim() }).lean();
    if (!account) {
      throw new Error(`Account code "${options.accountCode}" not found.`);
    }

    const query: any = {
      status: 'Posted',
      'lines.accountCode': account.code,
    };

    if (options.startDate || options.endDate) {
      query.accountingDate = {};
      if (options.startDate) query.accountingDate.$gte = options.startDate;
      if (options.endDate) query.accountingDate.$lte = options.endDate;
    }

    const entries = await JournalEntryModel.find(query)
      .sort({ accountingDate: 1, idNumber: 1 })
      .lean();

    let runningCents = 0;
    let totalDebitCents = 0;
    let totalCreditCents = 0;

    const transactions = [];

    for (const entry of entries) {
      const line = entry.lines.find((l) => l.accountCode === account.code);
      if (!line) continue;

      const dCents = line.debitCents;
      const cCents = line.creditCents;

      totalDebitCents += dCents;
      totalCreditCents += cCents;

      if (account.normalBalance === 'Debit') {
        runningCents += dCents - cCents;
      } else {
        runningCents += cCents - dCents;
      }

      transactions.push({
        date: entry.accountingDate,
        entryNumber: entry.entryNumber,
        memo: entry.memo,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
        runningBalance: toBirr(runningCents),
      });
    }

    return {
      account: {
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
      },
      openingBalance: 0,
      transactions,
      closingBalance: toBirr(runningCents),
      totalDebit: toBirr(totalDebitCents),
      totalCredit: toBirr(totalCreditCents),
    };
  }
}
