import { connectToDatabase } from '@/lib/db';
import { CashDrawerModel, ICashDrawer } from '@/lib/models/CashDrawer';
import { BankAccountModel, IBankAccount } from '@/lib/models/BankAccount';
import { CashierShiftModel, ICashierShift, VarianceStatus } from '@/lib/models/CashierShift';
import { CashMovementModel, ICashMovement, MovementType } from '@/lib/models/CashMovement';
import { getNextSequenceValue } from '@/lib/models/Counter';
import { GeneralLedgerService } from './ledger.service';
import { round2 } from './money';

export interface OpenShiftInput {
  cashierId: string;
  cashierName: string;
  drawerId: string;
  station?: string;
  openingFloat: number;
  notes?: string;
}

export interface RecordShiftTransactionInput {
  shiftNumber: string;
  amount: number;
  tenderType: 'Cash' | 'Telebirr' | 'CBE Birr' | 'Card' | 'Bank Transfer' | 'Room Charge';
  direction: 'IN' | 'OUT';
  description?: string;
}

export interface RecordCashMovementInput {
  movementType: MovementType;
  fromAccountCode: string;
  toAccountCode: string;
  amount: number;
  description: string;
  reference?: string;
  performedBy: string;
  approvedBy?: string;
  shiftNumber?: string;
  date?: string;
}

export interface CloseShiftInput {
  shiftNumber: string;
  closingCashCounted: number;
  dropToSafeAmount?: number;
  varianceReason?: string;
  closedBy: string;
}

export class TreasuryService {
  /**
   * Initializes default cash registers and Ethiopian bank/mobile accounts if not present.
   */
  static async seedDefaultDrawersAndBanks(): Promise<{
    drawers: ICashDrawer[];
    banks: IBankAccount[];
  }> {
    await connectToDatabase();

    const defaultDrawers = [
      {
        drawerId: 'CDR-FD-01',
        name: 'Front Desk Register 1',
        station: 'Front Desk' as const,
        glAccountCode: '1010',
        currentBalance: 0,
        currency: 'ETB',
        status: 'Active' as const,
        location: 'Main Hotel Lobby Reception',
        notes: 'Primary reception check-in drawer for room folios and guest deposits.',
      },
      {
        drawerId: 'CDR-POS-01',
        name: 'Restaurant POS Cash Drawer',
        station: 'Restaurant' as const,
        glAccountCode: '1020',
        currentBalance: 0,
        currency: 'ETB',
        status: 'Active' as const,
        location: 'Restaurant & Bar Cashier Counter',
        notes: 'Cash drawer for dining room and terrace bar point-of-sale settlements.',
      },
      {
        drawerId: 'CDR-SAFE-01',
        name: 'Main Hotel Safe & Petty Cash',
        station: 'Main Safe' as const,
        glAccountCode: '1030',
        currentBalance: 0,
        currency: 'ETB',
        status: 'Active' as const,
        location: 'Finance General Safe Vault',
        notes: 'Central treasury safe for shift drops and petty cash replenishment.',
      },
    ];

    const seededDrawers: ICashDrawer[] = [];
    for (const d of defaultDrawers) {
      let drawer = await CashDrawerModel.findOne({ drawerId: d.drawerId });
      if (!drawer) {
        drawer = await CashDrawerModel.create(d);
      }
      seededDrawers.push(drawer);
    }

    const defaultBanks = [
      {
        bankId: 'BNK-CBE-01',
        accountName: 'Commercial Bank of Ethiopia (CBE) - Main Ops',
        accountType: 'Bank' as const,
        bankName: 'Commercial Bank of Ethiopia',
        accountNumber: '1000284759201',
        branch: 'Finfinne Main Branch, Addis Ababa',
        glAccountCode: '1060',
        currency: 'ETB',
        currentBalance: 0,
        status: 'Active' as const,
        isPrimary: true,
        notes: 'Primary commercial bank operating account for supplier payments and payroll.',
      },
      {
        bankId: 'BNK-AWASH-01',
        accountName: 'Awash Bank - POS Terminal Settlement',
        accountType: 'Bank' as const,
        bankName: 'Awash Bank',
        accountNumber: '01320489123400',
        branch: 'Bole Medhanialem Branch',
        glAccountCode: '1070',
        currency: 'ETB',
        currentBalance: 0,
        status: 'Active' as const,
        isPrimary: false,
        notes: 'Secondary bank account for Visa, Mastercard, and card POS swipe settlements.',
      },
      {
        bankId: 'WAL-TELEBIRR-01',
        accountName: 'Ethio Telecom Telebirr Merchant Wallet',
        accountType: 'MobileMoney' as const,
        bankName: 'Ethio Telecom',
        accountNumber: '0911002233',
        branch: 'Ethio Telecom Headquarters',
        glAccountCode: '1040',
        currency: 'ETB',
        currentBalance: 0,
        status: 'Active' as const,
        isPrimary: false,
        notes: 'Telebirr SuperApp merchant wallet for instant guest mobile payments.',
      },
      {
        bankId: 'WAL-CBEBIRR-01',
        accountName: 'CBE Birr Mobile Merchant Wallet',
        accountType: 'MobileMoney' as const,
        bankName: 'Commercial Bank of Ethiopia',
        accountNumber: '0922334455',
        branch: 'CBE Digital Banking Hub',
        glAccountCode: '1050',
        currency: 'ETB',
        currentBalance: 0,
        status: 'Active' as const,
        isPrimary: false,
        notes: 'Commercial Bank of Ethiopia CBE Birr merchant wallet clearing.',
      },
    ];

    const seededBanks: IBankAccount[] = [];
    for (const b of defaultBanks) {
      let bank = await BankAccountModel.findOne({ bankId: b.bankId });
      if (!bank) {
        bank = await BankAccountModel.create(b);
      }
      seededBanks.push(bank);
    }

    return { drawers: seededDrawers, banks: seededBanks };
  }

  /**
   * Opens a new Cashier Shift on a designated Cash Drawer.
   */
  static async openCashierShift(input: OpenShiftInput): Promise<ICashierShift> {
    await connectToDatabase();

    const drawer = await CashDrawerModel.findOne({ drawerId: input.drawerId.trim() });
    if (!drawer) {
      throw new Error(`Cash Drawer "${input.drawerId}" not found.`);
    }

    if (drawer.status === 'In_Use' || drawer.activeShiftNumber) {
      throw new Error(
        `Cash Drawer "${drawer.name}" is already in use by shift ${drawer.activeShiftNumber}. It must be closed first.`
      );
    }

    const openingFloat = round2(Number(input.openingFloat) || 0);
    if (openingFloat < 0) {
      throw new Error('Opening float cannot be negative.');
    }

    // Check if cashier already has an active open shift
    const existingOpenShift = await CashierShiftModel.findOne({
      cashierId: input.cashierId,
      status: 'Open',
    });
    if (existingOpenShift) {
      throw new Error(
        `Cashier ${input.cashierName} already has an open shift (${existingOpenShift.shiftNumber}) on drawer ${existingOpenShift.drawerId}.`
      );
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nextSeq = await getNextSequenceValue('cashierShiftSeq', 1001);
    const shiftNumber = `CS-${yearMonth}-${String(nextSeq).padStart(4, '0')}`;

    const shift = await CashierShiftModel.create({
      shiftNumber,
      cashierId: input.cashierId,
      cashierName: input.cashierName.trim(),
      drawerId: drawer.drawerId,
      station: input.station || drawer.station,
      glAccountCode: drawer.glAccountCode,
      openedAt: now,
      status: 'Open',
      openingFloat,
      cashSales: 0,
      cashPaidOut: 0,
      nonCashTenders: {
        telebirr: 0,
        cbeBirr: 0,
        card: 0,
        bankTransfer: 0,
        roomCharge: 0,
      },
      expectedCash: openingFloat,
      notes: input.notes || '',
    });

    // Lock drawer
    drawer.status = 'In_Use';
    drawer.activeShiftNumber = shiftNumber;
    drawer.assignedUserId = input.cashierId;
    drawer.assignedUserName = input.cashierName;
    drawer.currentBalance = openingFloat;
    await drawer.save();

    return shift;
  }

  /**
   * Records a payment transaction against an active shift (e.g. from POS checkout or guest deposit).
   */
  static async recordShiftTransaction(
    input: RecordShiftTransactionInput
  ): Promise<ICashierShift> {
    await connectToDatabase();

    const shift = await CashierShiftModel.findOne({
      shiftNumber: input.shiftNumber.trim(),
      status: 'Open',
    });
    if (!shift) {
      throw new Error(`Open shift "${input.shiftNumber}" not found.`);
    }

    const amount = round2(Number(input.amount) || 0);
    if (amount <= 0) {
      throw new Error('Transaction amount must be greater than zero.');
    }

    if (input.tenderType === 'Cash') {
      if (input.direction === 'IN') {
        shift.cashSales = round2(shift.cashSales + amount);
      } else {
        shift.cashPaidOut = round2(shift.cashPaidOut + amount);
      }
    } else if (input.tenderType === 'Telebirr') {
      shift.nonCashTenders.telebirr = round2(shift.nonCashTenders.telebirr + amount);
    } else if (input.tenderType === 'CBE Birr') {
      shift.nonCashTenders.cbeBirr = round2(shift.nonCashTenders.cbeBirr + amount);
    } else if (input.tenderType === 'Card') {
      shift.nonCashTenders.card = round2(shift.nonCashTenders.card + amount);
    } else if (input.tenderType === 'Bank Transfer') {
      shift.nonCashTenders.bankTransfer = round2(shift.nonCashTenders.bankTransfer + amount);
    } else if (input.tenderType === 'Room Charge') {
      shift.nonCashTenders.roomCharge = round2(shift.nonCashTenders.roomCharge + amount);
    }

    shift.expectedCash = round2(shift.openingFloat + shift.cashSales - shift.cashPaidOut);
    await shift.save();

    // Update live drawer balance
    await CashDrawerModel.updateOne(
      { drawerId: shift.drawerId },
      { $set: { currentBalance: shift.expectedCash } }
    );

    return shift;
  }

  /**
   * Records an internal Cash Movement (Safe Drop, Float Replenishment, Bank Deposit, Telebirr Sweep, Petty Cash).
   * Automatically generates and posts a balanced Double-Entry General Ledger journal entry.
   */
  static async recordCashMovement(
    input: RecordCashMovementInput
  ): Promise<{ movement: ICashMovement; journalEntryNumber: string | null }> {
    await connectToDatabase();

    const amount = round2(Number(input.amount));
    if (amount <= 0) {
      throw new Error('Cash movement amount must be greater than zero.');
    }

    if (!input.fromAccountCode || !input.toAccountCode) {
      throw new Error('Source and destination account codes are required.');
    }

    if (input.fromAccountCode === input.toAccountCode) {
      throw new Error('Source and destination accounts cannot be identical.');
    }

    const now = new Date();
    const todayStr = input.date || now.toISOString().split('T')[0];
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nextSeq = await getNextSequenceValue('cashMovementSeq', 1001);
    const movementNumber = `MOV-${yearMonth}-${String(nextSeq).padStart(4, '0')}`;

    // Post to General Ledger
    const journal = await GeneralLedgerService.createJournalEntry({
      date: todayStr,
      accountingDate: todayStr,
      sourceModule: 'Treasury',
      sourceReferenceId: movementNumber,
      sourceDocumentNumber: input.reference || movementNumber,
      memo: input.description || `Cash Movement: ${input.movementType} from ${input.fromAccountCode} to ${input.toAccountCode}`,
      department: 'Finance',
      lines: [
        {
          accountCode: input.toAccountCode,
          debit: amount,
          credit: 0,
          description: `Debit receiving account (${input.movementType})`,
          partnerType: 'Employee',
          partnerName: input.performedBy,
        },
        {
          accountCode: input.fromAccountCode,
          debit: 0,
          credit: amount,
          description: `Credit dispensing account (${input.movementType})`,
          partnerType: 'Employee',
          partnerName: input.performedBy,
        },
      ],
      status: 'Posted',
      createdBy: input.performedBy,
    });

    // Update Drawer balances if GL code corresponds to a drawer
    await CashDrawerModel.updateOne(
      { glAccountCode: input.toAccountCode },
      { $inc: { currentBalance: amount } }
    );
    await CashDrawerModel.updateOne(
      { glAccountCode: input.fromAccountCode },
      { $inc: { currentBalance: -amount } }
    );

    // Update Bank balances if GL code corresponds to a bank/wallet
    await BankAccountModel.updateOne(
      { glAccountCode: input.toAccountCode },
      { $inc: { currentBalance: amount } }
    );
    await BankAccountModel.updateOne(
      { glAccountCode: input.fromAccountCode },
      { $inc: { currentBalance: -amount } }
    );

    // If linked to an open shift and represents cash disbursement, update shift
    if (input.shiftNumber) {
      const shift = await CashierShiftModel.findOne({
        shiftNumber: input.shiftNumber,
        status: 'Open',
      });
      if (shift && (input.movementType === 'PETTY_CASH_EXPENSE' || input.movementType === 'DRAWER_TO_SAFE_DROP')) {
        shift.cashPaidOut = round2(shift.cashPaidOut + amount);
        shift.expectedCash = round2(shift.openingFloat + shift.cashSales - shift.cashPaidOut);
        await shift.save();
      }
    }

    const movement = await CashMovementModel.create({
      movementNumber,
      shiftNumber: input.shiftNumber || null,
      movementType: input.movementType,
      fromAccountCode: input.fromAccountCode,
      toAccountCode: input.toAccountCode,
      amount,
      description: input.description,
      reference: input.reference || '',
      performedBy: input.performedBy,
      approvedBy: input.approvedBy || null,
      journalEntryNumber: journal.entryNumber,
      date: todayStr,
      status: 'Completed',
    });

    return { movement, journalEntryNumber: journal.entryNumber };
  }

  /**
   * Closes a Cashier Shift session with physical cash count and automated reconciliation.
   * Auto-posts Cash Variance journal entry (Dr 6950 for shortage, Cr 6950 for overage).
   * Optionally executes shift drop to hotel safe (Dr 1030 / Cr 1010).
   */
  static async closeCashierShift(input: CloseShiftInput): Promise<ICashierShift> {
    await connectToDatabase();

    const shift = await CashierShiftModel.findOne({ shiftNumber: input.shiftNumber.trim() });
    if (!shift) {
      throw new Error(`Shift "${input.shiftNumber}" not found.`);
    }

    if (shift.status !== 'Open') {
      throw new Error(`Shift "${input.shiftNumber}" is already ${shift.status.toLowerCase()}.`);
    }

    const drawer = await CashDrawerModel.findOne({ drawerId: shift.drawerId });
    if (!drawer) {
      throw new Error(`Drawer "${shift.drawerId}" not found.`);
    }

    const closingCashCounted = round2(Number(input.closingCashCounted));
    if (closingCashCounted < 0) {
      throw new Error('Closing cash counted cannot be negative.');
    }

    // Recompute expected cash
    const expectedCash = round2(shift.openingFloat + shift.cashSales - shift.cashPaidOut);
    const cashVariance = round2(closingCashCounted - expectedCash);

    let varianceStatus: VarianceStatus = 'Balanced';
    if (Math.abs(cashVariance) >= 0.01) {
      varianceStatus = cashVariance < 0 ? 'Shortage' : 'Overage';
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let varianceJournalNumber: string | null = null;

    // Auto-post Variance Journal Entry if variance exists
    if (varianceStatus === 'Shortage') {
      const shortageAmount = Math.abs(cashVariance);
      const journal = await GeneralLedgerService.createJournalEntry({
        date: todayStr,
        accountingDate: todayStr,
        sourceModule: 'Treasury',
        sourceReferenceId: `shift-shortage-${shift.shiftNumber}`,
        sourceDocumentNumber: shift.shiftNumber,
        memo: `Cash shortage variance on shift ${shift.shiftNumber} (${shift.cashierName})`,
        department: shift.station,
        lines: [
          {
            accountCode: '6950', // Cash Over and Short Discrepancies (Expense)
            debit: shortageAmount,
            credit: 0,
            description: `Cash drawer shortage on shift ${shift.shiftNumber}`,
            partnerType: 'Employee',
            partnerName: shift.cashierName,
          },
          {
            accountCode: shift.glAccountCode, // e.g. 1010 Front Desk Drawer
            debit: 0,
            credit: shortageAmount,
            description: `Shortage adjustment for ${shift.drawerId}`,
            partnerType: 'Employee',
            partnerName: shift.cashierName,
          },
        ],
        status: 'Posted',
        createdBy: input.closedBy,
      });
      varianceJournalNumber = journal.entryNumber;
    } else if (varianceStatus === 'Overage') {
      const overageAmount = cashVariance;
      const journal = await GeneralLedgerService.createJournalEntry({
        date: todayStr,
        accountingDate: todayStr,
        sourceModule: 'Treasury',
        sourceReferenceId: `shift-overage-${shift.shiftNumber}`,
        sourceDocumentNumber: shift.shiftNumber,
        memo: `Cash overage variance on shift ${shift.shiftNumber} (${shift.cashierName})`,
        department: shift.station,
        lines: [
          {
            accountCode: shift.glAccountCode, // e.g. 1010
            debit: overageAmount,
            credit: 0,
            description: `Cash overage deposit for ${shift.drawerId}`,
            partnerType: 'Employee',
            partnerName: shift.cashierName,
          },
          {
            accountCode: '6950', // Cash Over and Short Discrepancies (Credit / Income)
            debit: 0,
            credit: overageAmount,
            description: `Cash drawer overage gain on shift ${shift.shiftNumber}`,
            partnerType: 'Employee',
            partnerName: shift.cashierName,
          },
        ],
        status: 'Posted',
        createdBy: input.closedBy,
      });
      varianceJournalNumber = journal.entryNumber;
    }

    // Optional Drop to Hotel Safe (Account 1030)
    let dropJournalNumber: string | null = null;
    const dropAmount = round2(Number(input.dropToSafeAmount) || 0);

    if (dropAmount > 0) {
      if (dropAmount > closingCashCounted) {
        throw new Error(
          `Drop amount (ETB ${dropAmount}) cannot exceed counted physical cash (ETB ${closingCashCounted}).`
        );
      }

      const dropJournal = await GeneralLedgerService.createJournalEntry({
        date: todayStr,
        accountingDate: todayStr,
        sourceModule: 'Treasury',
        sourceReferenceId: `shift-drop-${shift.shiftNumber}`,
        sourceDocumentNumber: shift.shiftNumber,
        memo: `Shift drop to Main Safe from ${shift.drawerId} (${shift.cashierName})`,
        department: 'Finance',
        lines: [
          {
            accountCode: '1030', // Main Hotel Safe
            debit: dropAmount,
            credit: 0,
            description: `Shift cash drop received from ${shift.shiftNumber}`,
            partnerType: 'Employee',
            partnerName: shift.cashierName,
          },
          {
            accountCode: shift.glAccountCode, // 1010 or 1020
            debit: 0,
            credit: dropAmount,
            description: `Shift cash drop transfer to safe`,
            partnerType: 'Employee',
            partnerName: shift.cashierName,
          },
        ],
        status: 'Posted',
        createdBy: input.closedBy,
      });
      dropJournalNumber = dropJournal.entryNumber;

      // Update Main Safe current balance
      await CashDrawerModel.updateOne(
        { glAccountCode: '1030' },
        { $inc: { currentBalance: dropAmount } }
      );
    }

    const closingFloatRemaining = round2(closingCashCounted - dropAmount);

    // Update Shift
    shift.status = 'Closed';
    shift.closedAt = new Date();
    shift.closingCashCounted = closingCashCounted;
    shift.expectedCash = expectedCash;
    shift.cashVariance = cashVariance;
    shift.varianceStatus = varianceStatus;
    shift.varianceReason = input.varianceReason || (varianceStatus === 'Balanced' ? 'Shift perfectly balanced' : '');
    shift.varianceJournalEntryNumber = varianceJournalNumber;
    shift.dropToSafeAmount = dropAmount;
    shift.dropJournalEntryNumber = dropJournalNumber;
    shift.closingFloatRemaining = closingFloatRemaining;
    shift.closedBy = input.closedBy;
    await shift.save();

    // Release and update Cash Drawer
    drawer.status = 'Active';
    drawer.activeShiftNumber = null;
    drawer.assignedUserId = null;
    drawer.assignedUserName = null;
    drawer.currentBalance = closingFloatRemaining;
    await drawer.save();

    return shift;
  }

  /**
   * Manager Audit and Sign-off on a closed cashier shift.
   */
  static async auditCashierShift(
    shiftNumber: string,
    auditedBy: string
  ): Promise<ICashierShift> {
    await connectToDatabase();

    const shift = await CashierShiftModel.findOne({ shiftNumber: shiftNumber.trim() });
    if (!shift) {
      throw new Error(`Shift "${shiftNumber}" not found.`);
    }

    if (shift.status !== 'Closed') {
      throw new Error(`Only closed shifts can be audited. Shift is currently "${shift.status}".`);
    }

    shift.status = 'Audited';
    shift.auditedBy = auditedBy.trim();
    shift.auditedAt = new Date();
    await shift.save();

    return shift;
  }

  /**
   * Generates a complete Reconciliation Sheet for a shift session.
   */
  static async getShiftReconciliationSheet(shiftNumber: string) {
    await connectToDatabase();

    const shift = await CashierShiftModel.findOne({ shiftNumber: shiftNumber.trim() });
    if (!shift) {
      throw new Error(`Shift "${shiftNumber}" not found.`);
    }

    const drawer = await CashDrawerModel.findOne({ drawerId: shift.drawerId });

    const totalNonCash = round2(
      shift.nonCashTenders.telebirr +
        shift.nonCashTenders.cbeBirr +
        shift.nonCashTenders.card +
        shift.nonCashTenders.bankTransfer +
        shift.nonCashTenders.roomCharge
    );

    const totalGrossRevenueCollected = round2(shift.cashSales + totalNonCash);

    return {
      shiftNumber: shift.shiftNumber,
      cashier: {
        id: shift.cashierId,
        name: shift.cashierName,
      },
      drawer: {
        id: shift.drawerId,
        name: drawer?.name || shift.drawerId,
        station: shift.station,
        glAccountCode: shift.glAccountCode,
      },
      timestamps: {
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        durationMinutes: shift.closedAt
          ? Math.round((new Date(shift.closedAt).getTime() - new Date(shift.openedAt).getTime()) / 60000)
          : null,
      },
      status: shift.status,
      cashReconciliation: {
        openingFloat: shift.openingFloat,
        cashSales: shift.cashSales,
        cashPaidOut: shift.cashPaidOut,
        expectedCash: shift.expectedCash,
        closingCashCounted: shift.closingCashCounted,
        variance: shift.cashVariance,
        varianceStatus: shift.varianceStatus,
        varianceReason: shift.varianceReason,
        varianceJournalEntry: shift.varianceJournalEntryNumber,
        dropToSafeAmount: shift.dropToSafeAmount,
        dropJournalEntry: shift.dropJournalEntryNumber,
        closingFloatRemaining: shift.closingFloatRemaining,
      },
      tenderBreakdown: {
        cash: shift.cashSales,
        telebirr: shift.nonCashTenders.telebirr,
        cbeBirr: shift.nonCashTenders.cbeBirr,
        card: shift.nonCashTenders.card,
        bankTransfer: shift.nonCashTenders.bankTransfer,
        roomCharge: shift.nonCashTenders.roomCharge,
        totalNonCash,
        totalGrossRevenueCollected,
      },
      audit: {
        closedBy: shift.closedBy,
        auditedBy: shift.auditedBy,
        auditedAt: shift.auditedAt,
      },
      notes: shift.notes,
    };
  }

  /**
   * Returns live treasury dashboard summary across all drawers, bank accounts, and active shifts.
   */
  static async getTreasuryDashboardSummary() {
    await connectToDatabase();

    const drawers = await CashDrawerModel.find().lean();
    const banks = await BankAccountModel.find().lean();
    const openShifts = await CashierShiftModel.find({ status: 'Open' }).lean();

    const totalDrawerCash = round2(
      drawers.reduce((sum, d) => sum + (Number(d.currentBalance) || 0), 0)
    );
    const totalBankBalances = round2(
      banks
        .filter((b) => b.accountType === 'Bank')
        .reduce((sum, b) => sum + (Number(b.currentBalance) || 0), 0)
    );
    const totalMobileMoney = round2(
      banks
        .filter((b) => b.accountType === 'MobileMoney')
        .reduce((sum, b) => sum + (Number(b.currentBalance) || 0), 0)
    );

    const totalLiquidAssets = round2(totalDrawerCash + totalBankBalances + totalMobileMoney);

    return {
      summary: {
        totalLiquidAssets,
        totalDrawerCash,
        totalBankBalances,
        totalMobileMoney,
        currency: 'ETB',
        openShiftsCount: openShifts.length,
      },
      drawers: drawers.map((d) => ({
        id: d.drawerId,
        name: d.name,
        station: d.station,
        glAccountCode: d.glAccountCode,
        currentBalance: d.currentBalance,
        status: d.status,
        activeShift: d.activeShiftNumber,
        cashier: d.assignedUserName,
      })),
      bankAccounts: banks.map((b) => ({
        id: b.bankId,
        name: b.accountName,
        type: b.accountType,
        bank: b.bankName,
        accountNumber: b.accountNumber,
        glAccountCode: b.glAccountCode,
        currentBalance: b.currentBalance,
        status: b.status,
        isPrimary: b.isPrimary,
      })),
      activeShifts: openShifts.map((s) => ({
        shiftNumber: s.shiftNumber,
        cashier: s.cashierName,
        drawerId: s.drawerId,
        station: s.station,
        openedAt: s.openedAt,
        openingFloat: s.openingFloat,
        currentCashSales: s.cashSales,
        expectedCashNow: s.expectedCash,
      })),
    };
  }
}
