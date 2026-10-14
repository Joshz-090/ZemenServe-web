import { connectToDatabase } from '@/lib/db';
import {
  CustomerInvoiceModel,
  ICustomerInvoice,
  IInvoiceLine,
  InvoiceStatus,
  InvoiceType,
  CustomerType,
} from '@/lib/models/CustomerInvoice';
import { GeneralLedgerService } from './ledger.service';
import { getNextSequenceValue } from '@/lib/models/Counter';
import { round2, toBirr, toCents, formatETB } from './money';
import { AccountingIntegrationService } from './integration.service';

export interface CreateInvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
  vatRate?: number; // default 15%
  serviceChargeRate?: number; // default 0% or 10%
  revenueAccountCode?: string; // default '4010'
}

export interface CreateInvoiceInput {
  invoiceType?: InvoiceType;
  customerType?: CustomerType;
  customerId?: number | null;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerTin?: string;
  customerAddress?: string;
  reservationId?: number | null;
  eventBookingId?: number | null;
  orderId?: number | null;
  roomNumber?: string;
  issueDate?: string; // 'YYYY-MM-DD'
  dueDate?: string; // 'YYYY-MM-DD'
  paymentTermsDays?: number;
  lines: CreateInvoiceLineInput[];
  notes?: string;
  postToLedger?: boolean; // default true
  createdBy: string;
}

export interface RecordInvoicePaymentInput {
  paymentAmount: number;
  paymentMethod?: string; // 'Cash' | 'Telebirr' | 'CBE Birr' | 'Bank Transfer' | 'Card'
  referenceCode?: string;
  paymentDate?: string;
  recordedBy: string;
  notes?: string;
}

export interface ARAgingBucket {
  customerName: string;
  customerTin?: string;
  customerType: string;
  totalOutstanding: number;
  current: number; // Not yet overdue (<= 0 days)
  days1_30: number; // 1 - 30 days overdue
  days31_60: number; // 31 - 60 days overdue
  days61_90: number; // 61 - 90 days overdue
  days90Plus: number; // > 90 days overdue
  invoicesCount: number;
}

export class AccountsReceivableService {
  /**
   * Generates a sequential, gapless Invoice Reference.
   * E.g. 'INV-2026-00001'
   */
  static async generateInvoiceNumber(year?: number): Promise<{ idNumber: number; invoiceNumber: string }> {
    const yr = year || new Date().getFullYear();
    const nextSeq = await getNextSequenceValue('customerInvoiceId', 1);
    const invoiceNumber = `INV-${yr}-${String(nextSeq).padStart(5, '0')}`;
    return { idNumber: nextSeq, invoiceNumber };
  }

  /**
   * Computes line item figures, discounts, Ethiopian VAT (15%), Service Charge, and grand total.
   */
  static calculateInvoiceTotals(lines: CreateInvoiceLineInput[]): {
    calculatedLines: IInvoiceLine[];
    subtotal: number;
    totalDiscount: number;
    vatTotal: number;
    serviceChargeTotal: number;
    grandTotal: number;
  } {
    let subtotal = 0;
    let totalDiscount = 0;
    let vatTotal = 0;
    let serviceChargeTotal = 0;

    const calculatedLines: IInvoiceLine[] = lines.map((l, index) => {
      const qty = Math.max(1, Number(l.quantity) || 1);
      const unitPrice = Math.max(0, Number(l.unitPrice) || 0);
      const discountPct = Math.max(0, Math.min(100, Number(l.discountPercentage) || 0));
      const vatRate = l.vatRate !== undefined ? Number(l.vatRate) : 15.0;
      const scRate = l.serviceChargeRate !== undefined ? Number(l.serviceChargeRate) : 0;

      const gross = round2(qty * unitPrice);
      const discount = round2(gross * (discountPct / 100));
      const netAmount = round2(gross - discount);
      const vatAmount = round2(netAmount * (vatRate / 100));
      const scAmount = round2(netAmount * (scRate / 100));
      const totalLineAmount = round2(netAmount + vatAmount + scAmount);

      subtotal += gross;
      totalDiscount += discount;
      vatTotal += vatAmount;
      serviceChargeTotal += scAmount;

      return {
        lineId: `line-${index + 1}`,
        description: l.description.trim(),
        quantity: qty,
        unitPrice,
        discountPercentage: discountPct,
        netAmount,
        vatRate,
        vatAmount,
        serviceChargeRate: scRate,
        serviceChargeAmount: scAmount,
        totalLineAmount,
        revenueAccountCode: l.revenueAccountCode || '4010',
      };
    });

    const netSubtotal = round2(subtotal - totalDiscount);
    const grandTotal = round2(netSubtotal + vatTotal + serviceChargeTotal);

    return {
      calculatedLines,
      subtotal: round2(subtotal),
      totalDiscount: round2(totalDiscount),
      vatTotal: round2(vatTotal),
      serviceChargeTotal: round2(serviceChargeTotal),
      grandTotal,
    };
  }

  /**
   * Creates a formal Customer Invoice and automatically posts it to the General Ledger.
   */
  static async createCustomerInvoice(input: CreateInvoiceInput): Promise<ICustomerInvoice> {
    await connectToDatabase();

    if (!input.customerName || !input.lines || input.lines.length === 0) {
      throw new Error('Customer Name and at least one line item are required to create an invoice.');
    }

    const todayStr = input.issueDate || new Date().toISOString().split('T')[0];
    const terms = input.paymentTermsDays || 0;

    let dueDate = input.dueDate;
    if (!dueDate) {
      const issueDateObj = new Date(todayStr);
      issueDateObj.setDate(issueDateObj.getDate() + terms);
      dueDate = issueDateObj.toISOString().split('T')[0];
    }

    const { idNumber, invoiceNumber } = await this.generateInvoiceNumber();
    const totals = this.calculateInvoiceTotals(input.lines);

    // Determine Accounts Receivable account: 1110 for Corporate/Airline/NGO, 1100 for Guests
    const arAccountCode =
      input.customerType && input.customerType !== 'Guest' && input.customerType !== 'General'
        ? '1110' // Accounts Receivable - Corporate & Airline Contracts
        : '1100'; // Accounts Receivable - Guest Folios

    let journalEntryNumber: string | null = null;

    // Automated General Ledger Posting
    if (input.postToLedger !== false && totals.grandTotal > 0) {
      const glLines = [];

      // 1. Dr Accounts Receivable
      glLines.push({
        accountCode: arAccountCode,
        debit: totals.grandTotal,
        credit: 0,
        description: `Invoice ${invoiceNumber} billed to ${input.customerName}`,
        partnerType: 'Guest' as const,
        partnerName: input.customerName,
      });

      // 2. Cr Revenue accounts (grouped by revenue account code)
      const revenueByAccount = new Map<string, number>();
      for (const line of totals.calculatedLines) {
        const code = line.revenueAccountCode || '4010';
        revenueByAccount.set(code, (revenueByAccount.get(code) || 0) + line.netAmount);
      }

      revenueByAccount.forEach((amt, code) => {
        glLines.push({
          accountCode: code,
          debit: 0,
          credit: round2(amt),
          description: `Revenue earned on ${invoiceNumber} (${input.customerName})`,
          partnerType: 'Guest' as const,
          partnerName: input.customerName,
        });
      });

      // 3. Cr Output VAT 15% (Account 2100)
      if (totals.vatTotal > 0) {
        glLines.push({
          accountCode: '2100',
          debit: 0,
          credit: totals.vatTotal,
          description: `Output VAT 15% on ${invoiceNumber}`,
          partnerType: 'Guest' as const,
          partnerName: input.customerName,
        });
      }

      // 4. Cr Hospitality Service Charge 10% (Account 2110)
      if (totals.serviceChargeTotal > 0) {
        glLines.push({
          accountCode: '2110',
          debit: 0,
          credit: totals.serviceChargeTotal,
          description: `Service Charge on ${invoiceNumber}`,
          partnerType: 'Guest' as const,
          partnerName: input.customerName,
        });
      }

      const journal = await GeneralLedgerService.createJournalEntry({
        date: todayStr,
        accountingDate: todayStr,
        sourceModule: 'AR',
        sourceReferenceId: `invoice-${invoiceNumber}`,
        sourceDocumentNumber: invoiceNumber,
        memo: `Customer Invoice ${invoiceNumber}: ${input.customerName} (${input.invoiceType || 'RoomStay'})`,
        department: input.roomNumber ? 'Front Desk' : 'Finance',
        lines: glLines,
        status: 'Posted',
        createdBy: input.createdBy,
      });

      journalEntryNumber = journal.entryNumber;
    }

    const invoiceDoc = await CustomerInvoiceModel.create({
      idNumber,
      invoiceNumber,
      invoiceType: input.invoiceType || 'RoomStay',
      customerType: input.customerType || 'Guest',
      customerId: input.customerId || null,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone || '',
      customerEmail: input.customerEmail || '',
      customerTin: input.customerTin || '',
      customerAddress: input.customerAddress || '',
      reservationId: input.reservationId || null,
      eventBookingId: input.eventBookingId || null,
      orderId: input.orderId || null,
      roomNumber: input.roomNumber || '',
      issueDate: todayStr,
      dueDate,
      paymentTermsDays: terms,
      status: 'Issued',
      lines: totals.calculatedLines,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      vatTotal: totals.vatTotal,
      serviceChargeTotal: totals.serviceChargeTotal,
      grandTotal: totals.grandTotal,
      amountPaid: 0,
      balanceDue: totals.grandTotal,
      journalEntryNumber,
      notes: input.notes || '',
      createdBy: input.createdBy,
    });

    return invoiceDoc;
  }

  /**
   * Records a payment against an invoice and posts the payment receipt to the General Ledger.
   */
  static async recordInvoicePayment(
    invoiceNumber: string,
    input: RecordInvoicePaymentInput
  ): Promise<ICustomerInvoice> {
    await connectToDatabase();

    const invoice = await CustomerInvoiceModel.findOne({ invoiceNumber: invoiceNumber.trim() });
    if (!invoice) {
      throw new Error(`Customer invoice "${invoiceNumber}" not found.`);
    }

    if (invoice.status === 'Paid') {
      throw new Error(`Invoice "${invoiceNumber}" has already been fully paid.`);
    }

    if (invoice.status === 'Cancelled') {
      throw new Error(`Cannot record payment on cancelled invoice "${invoiceNumber}".`);
    }

    const paymentAmount = round2(Number(input.paymentAmount));
    if (paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (paymentAmount > invoice.balanceDue) {
      throw new Error(
        `Payment amount (ETB ${paymentAmount.toFixed(2)}) exceeds outstanding balance due (ETB ${invoice.balanceDue.toFixed(2)}).`
      );
    }

    const todayStr = input.paymentDate || new Date().toISOString().split('T')[0];

    // Determine asset account: 1010 for Cash, 1040 for Telebirr, 1050 for CBE Birr, 1060 for Bank
    const assetAccount = AccountingIntegrationService.getTenderAccountCode(input.paymentMethod, '1010');
    const arAccount =
      invoice.customerType && invoice.customerType !== 'Guest' && invoice.customerType !== 'General'
        ? '1110'
        : '1100';

    // Post payment receipt journal entry
    await GeneralLedgerService.createJournalEntry({
      date: todayStr,
      accountingDate: todayStr,
      sourceModule: 'AR',
      sourceReferenceId: `inv-pay-${invoice.invoiceNumber}-${Date.now()}`,
      sourceDocumentNumber: invoice.invoiceNumber,
      memo: `Payment received for Invoice ${invoice.invoiceNumber} from ${invoice.customerName} via ${input.paymentMethod || 'Cash'}`,
      department: 'Finance',
      lines: [
        {
          accountCode: assetAccount,
          debit: paymentAmount,
          credit: 0,
          description: `Payment receipt via ${input.paymentMethod || 'Cash'} (Ref: ${input.referenceCode || invoice.invoiceNumber})`,
          partnerType: 'Guest',
          partnerName: invoice.customerName,
        },
        {
          accountCode: arAccount,
          debit: 0,
          credit: paymentAmount,
          description: `Credit settlement on Invoice ${invoice.invoiceNumber}`,
          partnerType: 'Guest',
          partnerName: invoice.customerName,
        },
      ],
      status: 'Posted',
      createdBy: input.recordedBy,
    });

    // Update Invoice balances
    invoice.amountPaid = round2(invoice.amountPaid + paymentAmount);
    invoice.balanceDue = round2(invoice.grandTotal - invoice.amountPaid);

    if (invoice.balanceDue === 0) {
      invoice.status = 'Paid';
    } else {
      invoice.status = 'Partial';
    }

    await invoice.save();
    return invoice;
  }

  /**
   * Generates the Accounts Receivable (AR) Aging Report across 5 standard aging buckets:
   * Current (<= 0 days), 1-30 days, 31-60 days, 61-90 days, and 90+ days.
   */
  static async getARAgingReport(asOfDate?: string): Promise<{
    asOfDate: string;
    totalReceivables: number;
    agingBuckets: ARAgingBucket[];
    summary: {
      currentTotal: number;
      days1_30Total: number;
      days31_60Total: number;
      days61_90Total: number;
      days90PlusTotal: number;
    };
  }> {
    await connectToDatabase();

    const targetDateStr = asOfDate || new Date().toISOString().split('T')[0];
    const targetMs = new Date(targetDateStr).getTime();

    // Query all outstanding invoices issued up to target date
    const invoices = await CustomerInvoiceModel.find({
      status: { $in: ['Issued', 'Partial'] },
      balanceDue: { $gt: 0 },
      issueDate: { $lte: targetDateStr },
    }).lean();

    const customerMap = new Map<string, ARAgingBucket>();

    let currentTotal = 0;
    let days1_30Total = 0;
    let days31_60Total = 0;
    let days61_90Total = 0;
    let days90PlusTotal = 0;
    let grandTotalReceivables = 0;

    for (const inv of invoices) {
      const dueMs = new Date(inv.dueDate).getTime();
      const diffDays = Math.floor((targetMs - dueMs) / (1000 * 60 * 60 * 24));
      const balance = inv.balanceDue;

      grandTotalReceivables += balance;

      if (!customerMap.has(inv.customerName)) {
        customerMap.set(inv.customerName, {
          customerName: inv.customerName,
          customerTin: inv.customerTin,
          customerType: inv.customerType,
          totalOutstanding: 0,
          current: 0,
          days1_30: 0,
          days31_60: 0,
          days61_90: 0,
          days90Plus: 0,
          invoicesCount: 0,
        });
      }

      const bucket = customerMap.get(inv.customerName)!;
      bucket.totalOutstanding = round2(bucket.totalOutstanding + balance);
      bucket.invoicesCount += 1;

      if (diffDays <= 0) {
        // Current / Not yet overdue
        bucket.current = round2(bucket.current + balance);
        currentTotal += balance;
      } else if (diffDays <= 30) {
        // 1 - 30 days overdue
        bucket.days1_30 = round2(bucket.days1_30 + balance);
        days1_30Total += balance;
      } else if (diffDays <= 60) {
        // 31 - 60 days overdue
        bucket.days31_60 = round2(bucket.days31_60 + balance);
        days31_60Total += balance;
      } else if (diffDays <= 90) {
        // 61 - 90 days overdue
        bucket.days61_90 = round2(bucket.days61_90 + balance);
        days61_90Total += balance;
      } else {
        // 90+ days overdue
        bucket.days90Plus = round2(bucket.days90Plus + balance);
        days90PlusTotal += balance;
      }
    }

    const agingBuckets = Array.from(customerMap.values()).sort(
      (a, b) => b.totalOutstanding - a.totalOutstanding
    );

    return {
      asOfDate: targetDateStr,
      totalReceivables: round2(grandTotalReceivables),
      agingBuckets,
      summary: {
        currentTotal: round2(currentTotal),
        days1_30Total: round2(days1_30Total),
        days31_60Total: round2(days31_60Total),
        days61_90Total: round2(days61_90Total),
        days90PlusTotal: round2(days90PlusTotal),
      },
    };
  }

  /**
   * Generates a Customer Statement of Account with chronological transaction records and running balance.
   */
  static async getCustomerStatement(
    customerName: string,
    options?: { startDate?: string; endDate?: string }
  ): Promise<{
    customerName: string;
    customerTin?: string;
    customerType: string;
    period: { startDate: string; endDate: string };
    invoices: {
      invoiceNumber: string;
      issueDate: string;
      dueDate: string;
      description: string;
      grandTotal: number;
      amountPaid: number;
      balanceDue: number;
      status: string;
    }[];
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
  }> {
    await connectToDatabase();

    const query: any = { customerName: customerName.trim() };
    if (options?.startDate || options?.endDate) {
      query.issueDate = {};
      if (options.startDate) query.issueDate.$gte = options.startDate;
      if (options.endDate) query.issueDate.$lte = options.endDate;
    }

    const invoices = await CustomerInvoiceModel.find(query).sort({ issueDate: 1 }).lean();

    let totalBilled = 0;
    let totalPaid = 0;
    let customerTin = '';
    let customerType = 'Guest';

    const itemized = invoices.map((inv) => {
      totalBilled += inv.grandTotal;
      totalPaid += inv.amountPaid;
      if (inv.customerTin) customerTin = inv.customerTin;
      if (inv.customerType) customerType = inv.customerType;

      const desc = inv.lines.map((l) => l.description).join(', ');

      return {
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        description: desc,
        grandTotal: inv.grandTotal,
        amountPaid: inv.amountPaid,
        balanceDue: inv.balanceDue,
        status: inv.status,
      };
    });

    const todayStr = new Date().toISOString().split('T')[0];

    return {
      customerName,
      customerTin,
      customerType,
      period: {
        startDate: options?.startDate || (invoices[0]?.issueDate ?? todayStr),
        endDate: options?.endDate || todayStr,
      },
      invoices: itemized,
      totalBilled: round2(totalBilled),
      totalPaid: round2(totalPaid),
      totalOutstanding: round2(totalBilled - totalPaid),
    };
  }

  /**
   * Formats a complete, Ministry of Revenues (MoR) compliant Printable Ethiopian Tax Invoice.
   */
  static async getPrintableTaxInvoice(invoiceNumber: string): Promise<any> {
    await connectToDatabase();
    const invoice = await CustomerInvoiceModel.findOne({ invoiceNumber: invoiceNumber.trim() }).lean();

    if (!invoice) {
      throw new Error(`Customer invoice "${invoiceNumber}" not found.`);
    }

    return {
      documentTitle: 'OFFICIAL TAX INVOICE',
      hotel: {
        name: 'Zemen Grand Hotel & Restaurant',
        tin: invoice.hotelTin || '0098765432',
        vatRegistered: true,
        address: 'Bole Medhanealem, Addis Ababa, Ethiopia',
        phone: '+251 911 123 456',
        email: 'billing@zemengrandhotel.et',
      },
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        paymentTermsDays: invoice.paymentTermsDays,
        status: invoice.status,
        roomNumber: invoice.roomNumber || undefined,
        journalEntryNumber: invoice.journalEntryNumber || undefined,
      },
      customer: {
        name: invoice.customerName,
        tin: invoice.customerTin || 'N/A',
        phone: invoice.customerPhone || 'N/A',
        email: invoice.customerEmail || 'N/A',
        address: invoice.customerAddress || 'Addis Ababa, Ethiopia',
      },
      lines: invoice.lines.map((l: any) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: formatETB(l.unitPrice),
        discountPercentage: l.discountPercentage ? `${l.discountPercentage}%` : '-',
        netAmount: formatETB(l.netAmount),
        vatAmount: formatETB(l.vatAmount),
        totalLineAmount: formatETB(l.totalLineAmount),
      })),
      totals: {
        subtotal: formatETB(invoice.subtotal),
        discountTotal: formatETB(invoice.totalDiscount),
        vatTotal: formatETB(invoice.vatTotal),
        serviceChargeTotal: formatETB(invoice.serviceChargeTotal),
        grandTotal: formatETB(invoice.grandTotal),
        amountPaid: formatETB(invoice.amountPaid),
        balanceDue: formatETB(invoice.balanceDue),
      },
      numericTotals: {
        subtotal: invoice.subtotal,
        discountTotal: invoice.totalDiscount,
        vatTotal: invoice.vatTotal,
        serviceChargeTotal: invoice.serviceChargeTotal,
        grandTotal: invoice.grandTotal,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
      },
    };
  }
}
