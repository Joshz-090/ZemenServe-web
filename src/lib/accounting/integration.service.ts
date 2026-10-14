import { GeneralLedgerService } from './ledger.service';
import { toCents, toBirr, round2 } from './money';
import { IJournalEntry } from '@/lib/models/JournalEntry';

export interface PostGuestDepositParams {
  reservationId: number;
  bookingRef: string;
  guestName: string;
  depositAmount: number;
  paymentMethod?: string; // 'Cash' | 'Telebirr' | 'CBE Birr' | 'Card' | 'Bank Transfer'
  postedBy: string;
  date?: string;
}

export interface PostRoomNightAuditParams {
  reservationId: number;
  bookingRef: string;
  roomNumber: string;
  guestName: string;
  nightlyRate: number;
  isVatInclusive?: boolean; // default true in Ethiopian hospitality
  postedBy: string;
  date?: string;
}

export interface PostGuestCheckoutSettlementParams {
  reservationId: number;
  bookingRef: string;
  roomNumber: string;
  guestName: string;
  totalBilled: number;
  depositUsed: number;
  balancePaid: number;
  paymentMethod?: string;
  postedBy: string;
  date?: string;
}

export interface PostPOSOrderParams {
  orderId: number;
  totalAmount: number;
  cogsAmount?: number;
  paymentMethod?: string;
  isRoomCharge?: boolean;
  roomNumber?: string;
  guestName?: string;
  postedBy: string;
  date?: string;
}

export interface PostEventDepositParams {
  bookingId: number;
  bookingRef: string;
  eventTitle: string;
  organizerName: string;
  depositAmount: number;
  paymentMethod?: string;
  postedBy: string;
  date?: string;
}

export interface PostEventSettlementParams {
  bookingId: number;
  bookingRef: string;
  eventTitle: string;
  organizerName: string;
  totalAmount: number;
  depositUsed: number;
  balancePaid: number;
  paymentMethod?: string;
  postedBy: string;
  date?: string;
}

export class AccountingIntegrationService {
  /**
   * Helper to resolve the appropriate Asset GL account code based on payment tender.
   */
  static getTenderAccountCode(paymentMethod?: string, defaultCashCode = '1010'): string {
    const method = (paymentMethod || '').trim().toLowerCase();
    if (method.includes('telebirr')) return '1040'; // Telebirr Clearing
    if (method.includes('cbe birr') || method.includes('cbebirr')) return '1050'; // CBE Birr
    if (method.includes('card') || method.includes('bank') || method.includes('transfer')) return '1060'; // Bank CBE Operating
    if (method.includes('room charge') || method.includes('room folio')) return '1100'; // Guest Folio AR
    return defaultCashCode; // Front desk 1010 or POS 1020
  }

  // =========================================================================
  // 1. ROOMS & RECEPTION INTEGRATION HOOKS
  // =========================================================================

  /**
   * Records a Guest Advance Deposit as an Unearned Revenue Liability (Account 2020).
   * Double-Entry Equation:
   *   Dr Cash / Bank / Mobile Money (1010 / 1040 / 1050 / 1060)
   *   Cr Guest Advance Deposits & Booking Prepayments (2020)
   */
  static async postGuestDepositJournal(
    params: PostGuestDepositParams
  ): Promise<IJournalEntry | null> {
    const deposit = Number(params.depositAmount);
    if (!deposit || deposit <= 0) return null;

    const todayStr = params.date || new Date().toISOString().split('T')[0];
    const assetAccount = this.getTenderAccountCode(params.paymentMethod, '1010');

    return GeneralLedgerService.createJournalEntry({
      date: todayStr,
      accountingDate: todayStr,
      sourceModule: 'Rooms',
      sourceReferenceId: `guest-deposit-res-${params.reservationId}`,
      sourceDocumentNumber: params.bookingRef,
      memo: `Advance deposit received from ${params.guestName} for reservation ${params.bookingRef}`,
      department: 'Front Desk',
      lines: [
        {
          accountCode: assetAccount,
          debit: deposit,
          credit: 0,
          description: `Deposit via ${params.paymentMethod || 'Cash'} (${params.bookingRef})`,
          partnerType: 'Guest',
          partnerName: params.guestName,
        },
        {
          accountCode: '2020', // Guest Advance Deposits Liability
          debit: 0,
          credit: deposit,
          description: `Advance room booking prepayment liability (${params.bookingRef})`,
          partnerType: 'Guest',
          partnerName: params.guestName,
        },
      ],
      status: 'Posted',
      createdBy: params.postedBy,
    });
  }

  /**
   * Night Audit / Room Folio Posting: Recognizes Room Accommodation Revenue and Output VAT.
   * Double-Entry Equation:
   *   Dr Accounts Receivable - Guest Folios (1100)
   *   Cr Room Accommodation Revenue (4010) [net rate]
   *   Cr Output Value Added Tax (VAT) Payable 15% (2100) [tax]
   */
  static async postRoomNightAuditJournal(
    params: PostRoomNightAuditParams
  ): Promise<IJournalEntry> {
    const rate = Number(params.nightlyRate);
    if (!rate || rate <= 0) {
      throw new Error('Nightly room charge must be greater than zero.');
    }

    const todayStr = params.date || new Date().toISOString().split('T')[0];

    // Standard Ethiopian tax-inclusive breakdown (15% VAT)
    const isInclusive = params.isVatInclusive !== false;
    let netRevenue: number;
    let vatAmount: number;

    if (isInclusive) {
      netRevenue = round2(rate / 1.15);
      vatAmount = round2(rate - netRevenue);
    } else {
      netRevenue = rate;
      vatAmount = round2(rate * 0.15);
    }

    const totalFolioDebit = isInclusive ? rate : round2(netRevenue + vatAmount);

    return GeneralLedgerService.createJournalEntry({
      date: todayStr,
      accountingDate: todayStr,
      sourceModule: 'Rooms',
      sourceReferenceId: `nightaudit-res-${params.reservationId}-${todayStr}`,
      sourceDocumentNumber: `${params.bookingRef}-RM${params.roomNumber}`,
      memo: `Night audit room charge: Room #${params.roomNumber} (${params.guestName})`,
      department: 'Front Desk',
      lines: [
        {
          accountCode: '1100', // Accounts Receivable - Guest Folios
          debit: totalFolioDebit,
          credit: 0,
          description: `Room #${params.roomNumber} nightly lodging charge (${params.guestName})`,
          partnerType: 'Guest',
          partnerName: params.guestName,
        },
        {
          accountCode: '4010', // Room Accommodation Revenue
          debit: 0,
          credit: netRevenue,
          description: `Room lodging revenue - Room #${params.roomNumber}`,
          partnerType: 'Guest',
          partnerName: params.guestName,
        },
        {
          accountCode: '2100', // Output VAT Payable 15%
          debit: 0,
          credit: vatAmount,
          description: `Output VAT 15% on room charge #${params.roomNumber}`,
          partnerType: 'Guest',
          partnerName: params.guestName,
        },
      ],
      status: 'Posted',
      createdBy: params.postedBy,
    });
  }

  /**
   * Guest Checkout Folio Settlement: Clears Guest Folio AR against Advance Deposit Liability + Net Payment.
   * Double-Entry Equation:
   *   Dr Guest Advance Deposits Liability (2020) [deposit applied]
   *   Dr Cash / Bank / Mobile Money (1010 / 1040 / 1050) [settlement payment]
   *   Cr Accounts Receivable - Guest Folios (1100) [cleared folio balance]
   */
  static async postGuestCheckoutSettlementJournal(
    params: PostGuestCheckoutSettlementParams
  ): Promise<IJournalEntry> {
    const todayStr = params.date || new Date().toISOString().split('T')[0];
    const depositUsed = Number(params.depositUsed) || 0;
    const balancePaid = Number(params.balancePaid) || 0;
    const totalBilled = Number(params.totalBilled);

    const assetAccount = this.getTenderAccountCode(params.paymentMethod, '1010');
    const lines = [];

    if (depositUsed > 0) {
      lines.push({
        accountCode: '2020', // Clear Advance Deposit Liability
        debit: depositUsed,
        credit: 0,
        description: `Apply advance deposit liability to folio checkout (${params.bookingRef})`,
        partnerType: 'Guest' as const,
        partnerName: params.guestName,
      });
    }

    if (balancePaid > 0) {
      lines.push({
        accountCode: assetAccount, // Cash / Mobile Money / Bank
        debit: balancePaid,
        credit: 0,
        description: `Checkout settlement via ${params.paymentMethod || 'Cash'} (${params.bookingRef})`,
        partnerType: 'Guest' as const,
        partnerName: params.guestName,
      });
    }

    lines.push({
      accountCode: '1100', // Clear Accounts Receivable - Guest Folios
      debit: 0,
      credit: totalBilled,
      description: `Folio checkout settlement - Room #${params.roomNumber} (${params.guestName})`,
      partnerType: 'Guest' as const,
      partnerName: params.guestName,
    });

    return GeneralLedgerService.createJournalEntry({
      date: todayStr,
      accountingDate: todayStr,
      sourceModule: 'Rooms',
      sourceReferenceId: `checkout-res-${params.reservationId}`,
      sourceDocumentNumber: params.bookingRef,
      memo: `Guest checkout folio settlement: Room #${params.roomNumber} (${params.guestName})`,
      department: 'Front Desk',
      lines,
      status: 'Posted',
      createdBy: params.postedBy,
    });
  }

  // =========================================================================
  // 2. RESTAURANT & BAR POS INTEGRATION HOOKS
  // =========================================================================

  /**
   * Automated POS Order Checkout Hook:
   * 1. Posts Revenue & Output Tax Journal:
   *    Dr Cash POS Drawer / Telebirr / CBE Birr / Room Folio AR
   *    Cr Restaurant & Dining Food Sales (4020)
   *    Cr Output Value Added Tax (VAT) Payable 15% (2100)
   * 2. Posts COGS & Recipe Depletion Journal (if recipe ingredients cost > 0):
   *    Dr COGS - Food & Kitchen Ingredients Consumption (5010)
   *    Cr Inventory - Food & Kitchen Ingredients (1200)
   */
  static async postPOSOrderJournals(
    params: PostPOSOrderParams
  ): Promise<{ revenueEntry: IJournalEntry; cogsEntry?: IJournalEntry }> {
    const totalAmount = Number(params.totalAmount);
    if (!totalAmount || totalAmount <= 0) {
      throw new Error('POS Order total amount must be greater than zero.');
    }

    const todayStr = params.date || new Date().toISOString().split('T')[0];

    // Tender asset selection: 1020 for POS Cash Drawer, 1040 for Telebirr, 1100 for Room Charge
    let assetAccount = '1020';
    if (params.isRoomCharge) {
      assetAccount = '1100'; // Accounts Receivable - Guest Folios
    } else {
      assetAccount = this.getTenderAccountCode(params.paymentMethod, '1020');
    }

    // Tax-inclusive base breakdown (15% VAT)
    const netFoodSales = round2(totalAmount / 1.15);
    const vatAmount = round2(totalAmount - netFoodSales);

    // 1. Create Revenue Journal Entry
    const revenueEntry = await GeneralLedgerService.createJournalEntry({
      date: todayStr,
      accountingDate: todayStr,
      sourceModule: 'POS',
      sourceReferenceId: `pos-order-rev-${params.orderId}`,
      sourceDocumentNumber: `ORD-${params.orderId}`,
      memo: `Restaurant POS Order #${params.orderId} Settlement (${params.paymentMethod || 'Cash'})`,
      department: 'Restaurant POS',
      lines: [
        {
          accountCode: assetAccount,
          debit: totalAmount,
          credit: 0,
          description: params.isRoomCharge
            ? `Charged to Room #${params.roomNumber || 'Folio'} (${params.guestName || 'Guest'})`
            : `POS Settlement via ${params.paymentMethod || 'Cash'}`,
          partnerType: params.guestName ? 'Guest' : null,
          partnerName: params.guestName || null,
        },
        {
          accountCode: '4020', // Restaurant Food Sales
          debit: 0,
          credit: netFoodSales,
          description: `Food sales - Order #${params.orderId}`,
        },
        {
          accountCode: '2100', // Output VAT 15%
          debit: 0,
          credit: vatAmount,
          description: `Output VAT 15% - Order #${params.orderId}`,
        },
      ],
      status: 'Posted',
      createdBy: params.postedBy,
    });

    // 2. Create COGS & Stock Consumption Entry (if ingredients depleted)
    let cogsEntry: IJournalEntry | undefined;
    const cogs = Number(params.cogsAmount) || 0;

    if (cogs > 0) {
      cogsEntry = await GeneralLedgerService.createJournalEntry({
        date: todayStr,
        accountingDate: todayStr,
        sourceModule: 'Inventory',
        sourceReferenceId: `pos-order-cogs-${params.orderId}`,
        sourceDocumentNumber: `ORD-${params.orderId}`,
        memo: `Recipe ingredients consumption for POS Order #${params.orderId}`,
        department: 'Kitchen',
        lines: [
          {
            accountCode: '5010', // COGS - Food & Kitchen Ingredients Consumption
            debit: cogs,
            credit: 0,
            description: `Kitchen recipe stock depletion for Order #${params.orderId}`,
          },
          {
            accountCode: '1200', // Inventory - Food & Kitchen Ingredients
            debit: 0,
            credit: cogs,
            description: `Inventory stock reduction for Order #${params.orderId}`,
          },
        ],
        status: 'Posted',
        createdBy: params.postedBy,
      });
    }

    return { revenueEntry, cogsEntry };
  }

  // =========================================================================
  // 3. EVENTS & BANQUET HALL INTEGRATION HOOKS
  // =========================================================================

  /**
   * Event Hall Advance Deposit: Records unearned liability (Account 2030).
   * Double-Entry Equation:
   *   Dr Cash / Bank / Mobile Money (1010 / 1040 / 1060)
   *   Cr Banquet & Event Advance Deposits (2030)
   */
  static async postEventBookingDepositJournal(
    params: PostEventDepositParams
  ): Promise<IJournalEntry | null> {
    const deposit = Number(params.depositAmount);
    if (!deposit || deposit <= 0) return null;

    const todayStr = params.date || new Date().toISOString().split('T')[0];
    const assetAccount = this.getTenderAccountCode(params.paymentMethod, '1010');

    return GeneralLedgerService.createJournalEntry({
      date: todayStr,
      accountingDate: todayStr,
      sourceModule: 'Events',
      sourceReferenceId: `event-deposit-${params.bookingId}`,
      sourceDocumentNumber: params.bookingRef,
      memo: `Advance deposit for event "${params.eventTitle}" (${params.organizerName})`,
      department: 'Banquets',
      lines: [
        {
          accountCode: assetAccount,
          debit: deposit,
          credit: 0,
          description: `Event advance deposit via ${params.paymentMethod || 'Cash'} (${params.bookingRef})`,
          partnerName: params.organizerName,
        },
        {
          accountCode: '2030', // Banquet & Event Advance Deposits Liability
          debit: 0,
          credit: deposit,
          description: `Unearned event booking prepayment liability (${params.eventTitle})`,
          partnerName: params.organizerName,
        },
      ],
      status: 'Posted',
      createdBy: params.postedBy,
    });
  }

  /**
   * Event Final Settlement: Recognizes Banquet Revenue (4040) & Output VAT (2100),
   * applying the advance deposit liability (2030) and receiving remaining balance.
   */
  static async postEventSettlementJournal(
    params: PostEventSettlementParams
  ): Promise<IJournalEntry> {
    const totalAmount = Number(params.totalAmount);
    const depositUsed = Number(params.depositUsed) || 0;
    const balancePaid = Number(params.balancePaid) || 0;
    const todayStr = params.date || new Date().toISOString().split('T')[0];

    const assetAccount = this.getTenderAccountCode(params.paymentMethod, '1060');

    // Tax-inclusive banquet leasing revenue breakdown (15% VAT)
    const netLeasingRevenue = round2(totalAmount / 1.15);
    const vatAmount = round2(totalAmount - netLeasingRevenue);

    const lines = [];

    if (depositUsed > 0) {
      lines.push({
        accountCode: '2030', // Clear Advance Deposit Liability
        debit: depositUsed,
        credit: 0,
        description: `Apply banquet deposit liability to final settlement (${params.bookingRef})`,
        partnerName: params.organizerName,
      });
    }

    if (balancePaid > 0) {
      lines.push({
        accountCode: assetAccount,
        debit: balancePaid,
        credit: 0,
        description: `Event balance paid via ${params.paymentMethod || 'Bank Transfer'} (${params.bookingRef})`,
        partnerName: params.organizerName,
      });
    }

    lines.push(
      {
        accountCode: '4040', // Banquet Hall & Event Leasing Revenue
        debit: 0,
        credit: netLeasingRevenue,
        description: `Banquet hall leasing revenue - ${params.eventTitle}`,
        partnerName: params.organizerName,
      },
      {
        accountCode: '2100', // Output VAT 15%
        debit: 0,
        credit: vatAmount,
        description: `Output VAT 15% on banquet event #${params.bookingRef}`,
        partnerName: params.organizerName,
      }
    );

    return GeneralLedgerService.createJournalEntry({
      date: todayStr,
      accountingDate: todayStr,
      sourceModule: 'Events',
      sourceReferenceId: `event-settle-${params.bookingId}`,
      sourceDocumentNumber: params.bookingRef,
      memo: `Event completed and settled: "${params.eventTitle}" (${params.organizerName})`,
      department: 'Banquets',
      lines,
      status: 'Posted',
      createdBy: params.postedBy,
    });
  }
}
