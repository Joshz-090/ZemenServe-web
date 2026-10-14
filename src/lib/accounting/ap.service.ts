import { connectToDatabase } from '@/lib/db';
import { SupplierModel, ISupplier } from '@/lib/models/Supplier';
import { SupplierBillModel, ISupplierBill, ISupplierBillLine, BillStatus } from '@/lib/models/SupplierBill';
import { IngredientModel } from '@/lib/models/Ingredient';
import { InventoryLogModel } from '@/lib/models/InventoryLog';
import { GeneralLedgerService } from './ledger.service';
import { getNextSequenceValue } from '@/lib/models/Counter';
import { round2, toBirr, toCents, formatETB } from './money';
import { AccountingIntegrationService } from './integration.service';

export interface CreateSupplierInput {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  tinNumber?: string;
  vatRegistered?: boolean;
  withholdingAgent?: boolean;
  category?: string;
  paymentTermsDays?: number;
  bankName?: string;
  bankAccountNumber?: string;
  address?: string;
  notes?: string;
}

export interface CreateBillLineInput {
  ingredientId?: number | null;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  vatRate?: number; // default 15%
  assetOrExpenseAccountCode?: string; // default '1200'
}

export interface CreateSupplierBillInput {
  supplierId: number;
  supplierInvoiceNumber: string;
  billDate?: string; // 'YYYY-MM-DD'
  dueDate?: string; // 'YYYY-MM-DD'
  paymentTermsDays?: number;
  purchaseOrderRef?: string;
  goodsReceivedRef?: string;
  lines: CreateBillLineInput[];
  withholdingTaxRate?: number; // e.g. 2% or 0
  autoRestockInventory?: boolean; // default true if ingredientId provided
  postToLedger?: boolean; // default true
  notes?: string;
  createdBy: string;
}

export interface RecordBillPaymentInput {
  paymentAmount: number;
  paymentMethod?: string; // 'Bank Transfer' | 'Cash' | 'Telebirr' | 'Check'
  referenceCode?: string;
  paymentDate?: string;
  recordedBy: string;
  notes?: string;
}

export interface APAgingBucket {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  supplierTin?: string;
  category: string;
  totalOutstanding: number;
  current: number; // <= 0 days
  days1_30: number; // 1 - 30 days
  days31_60: number; // 31 - 60 days
  days61_90: number; // 61 - 90 days
  days90Plus: number; // > 90 days
  billsCount: number;
}

export class AccountsPayableService {
  /**
   * Creates a new Vendor / Supplier record with unique supplier code.
   */
  static async createSupplier(input: CreateSupplierInput): Promise<ISupplier> {
    await connectToDatabase();

    const name = input.name.trim();
    if (!name || !input.phone) {
      throw new Error('Supplier name and phone number are required.');
    }

    const nextId = await getNextSequenceValue('supplierId', 1001);
    const supplierCode = `SUP-${String(nextId).padStart(4, '0')}`;

    return SupplierModel.create({
      idNumber: nextId,
      supplierCode,
      name,
      contactPerson: input.contactPerson || '',
      phone: input.phone.trim(),
      email: input.email || '',
      tinNumber: input.tinNumber || '',
      vatRegistered: input.vatRegistered !== false,
      withholdingAgent: !!input.withholdingAgent,
      category: input.category || 'General Supplies',
      paymentTermsDays: input.paymentTermsDays !== undefined ? Number(input.paymentTermsDays) : 30,
      bankName: input.bankName || 'Commercial Bank of Ethiopia (CBE)',
      bankAccountNumber: input.bankAccountNumber || '',
      address: input.address || 'Addis Ababa, Ethiopia',
      notes: input.notes || '',
      totalPurchases: 0,
      totalPaid: 0,
      currentBalance: 0,
      isActive: true,
    });
  }

  /**
   * Retrieves all active suppliers with optional search and category filters.
   */
  static async getAllSuppliers(options?: { category?: string; search?: string }): Promise<ISupplier[]> {
    await connectToDatabase();
    const query: any = { isActive: true };

    if (options?.category) {
      query.category = options.category;
    }
    if (options?.search) {
      const regex = new RegExp(options.search, 'i');
      query.$or = [{ name: regex }, { supplierCode: regex }, { tinNumber: regex }, { phone: regex }];
    }

    return SupplierModel.find(query).sort({ name: 1 }).lean();
  }

  /**
   * Generates a sequential, gapless Supplier Bill number.
   * E.g. 'BILL-2026-00001'
   */
  static async generateBillNumber(year?: number): Promise<{ idNumber: number; billNumber: string }> {
    const yr = year || new Date().getFullYear();
    const nextSeq = await getNextSequenceValue('supplierBillId', 1);
    const billNumber = `BILL-${yr}-${String(nextSeq).padStart(5, '0')}`;
    return { idNumber: nextSeq, billNumber };
  }

  /**
   * Computes bill subtotal, 15% Input VAT, Withholding Tax, and net payable grand total.
   */
  static calculateBillTotals(
    lines: CreateBillLineInput[],
    withholdingTaxRate = 0
  ): {
    calculatedLines: ISupplierBillLine[];
    subtotal: number;
    vatTotal: number;
    withholdingTaxRate: number;
    withholdingTaxAmount: number;
    grandTotal: number;
  } {
    let subtotal = 0;
    let vatTotal = 0;

    const calculatedLines: ISupplierBillLine[] = lines.map((l, index) => {
      const qty = Math.max(1, Number(l.quantity) || 1);
      const unitPrice = Math.max(0, Number(l.unitPrice) || 0);
      const vatRate = l.vatRate !== undefined ? Number(l.vatRate) : 15.0;

      const lineTotal = round2(qty * unitPrice);
      const vatAmount = round2(lineTotal * (vatRate / 100));

      subtotal += lineTotal;
      vatTotal += vatAmount;

      return {
        lineId: `bline-${index + 1}`,
        ingredientId: l.ingredientId || null,
        description: l.description.trim(),
        quantity: qty,
        unit: l.unit || 'kg',
        unitPrice,
        lineTotal,
        vatRate,
        vatAmount,
        assetOrExpenseAccountCode: l.assetOrExpenseAccountCode || '1200',
      };
    });

    const whtRate = Math.max(0, Number(withholdingTaxRate) || 0);
    const withholdingTaxAmount = round2(subtotal * (whtRate / 100));
    // Grand Total is the net amount payable to the vendor after statutory Withholding Tax deduction
    const grandTotal = round2(subtotal + vatTotal - withholdingTaxAmount);

    return {
      calculatedLines,
      subtotal: round2(subtotal),
      vatTotal: round2(vatTotal),
      withholdingTaxRate: whtRate,
      withholdingTaxAmount,
      grandTotal,
    };
  }

  /**
   * Creates a Supplier Bill, executes Three-Way Inventory Matching (GRN stock update),
   * and automatically posts the purchase to the General Ledger.
   */
  static async createSupplierBill(input: CreateSupplierBillInput): Promise<ISupplierBill> {
    await connectToDatabase();

    const supplier = await SupplierModel.findOne({ idNumber: Number(input.supplierId) });
    if (!supplier) {
      throw new Error(`Supplier with ID #${input.supplierId} not found.`);
    }

    if (!input.supplierInvoiceNumber || !input.lines || input.lines.length === 0) {
      throw new Error('Supplier invoice reference and at least one line item are required.');
    }

    // Check duplicate vendor invoice prevention
    const duplicateBill = await SupplierBillModel.findOne({
      supplierId: supplier.idNumber,
      supplierInvoiceNumber: input.supplierInvoiceNumber.trim(),
      status: { $ne: 'Cancelled' },
    }).lean();

    if (duplicateBill) {
      throw new Error(
        `Duplicate Bill Prevention: Invoice "${input.supplierInvoiceNumber}" from ${supplier.name} has already been registered (${duplicateBill.billNumber}).`
      );
    }

    const todayStr = input.billDate || new Date().toISOString().split('T')[0];
    const terms = input.paymentTermsDays !== undefined ? Number(input.paymentTermsDays) : supplier.paymentTermsDays;

    let dueDate = input.dueDate;
    if (!dueDate) {
      const billDateObj = new Date(todayStr);
      billDateObj.setDate(billDateObj.getDate() + terms);
      dueDate = billDateObj.toISOString().split('T')[0];
    }

    const { idNumber, billNumber } = await this.generateBillNumber();
    const totals = this.calculateBillTotals(input.lines, input.withholdingTaxRate);

    let matchedWithInventory = false;

    // 1. Three-Way Stock Receipt Matching & Inventory Restocking
    if (input.autoRestockInventory !== false) {
      for (const line of totals.calculatedLines) {
        if (line.ingredientId) {
          const ing = await IngredientModel.findOne({ idNumber: line.ingredientId });
          if (ing) {
            // Compute weighted average unit cost
            const existingTotalVal = ing.stockQuantity * ing.costPerUnit;
            const newTotalVal = line.quantity * line.unitPrice;
            const totalQty = ing.stockQuantity + line.quantity;
            const newAvgCost = totalQty > 0 ? round2((existingTotalVal + newTotalVal) / totalQty) : line.unitPrice;

            ing.stockQuantity = totalQty;
            ing.costPerUnit = newAvgCost;
            await ing.save();

            // Record inventory log atomically
            const maxLog = await InventoryLogModel.findOne().sort({ idNumber: -1 }).lean();
            const nextLogId = await getNextSequenceValue('inventoryLogId', (maxLog?.idNumber || 0) + 1);

            await InventoryLogModel.create({
              idNumber: nextLogId,
              ingredientId: ing.idNumber,
              ingredientName: ing.name,
              changeAmount: line.quantity,
              reason: `Supplier Bill ${billNumber} received from ${supplier.name} (${input.goodsReceivedRef || 'GRN'})`,
              timestamp: new Date().toISOString(),
            });

            matchedWithInventory = true;
          }
        }
      }
    }

    let journalEntryNumber: string | null = null;

    // 2. Automated General Ledger Posting
    if (input.postToLedger !== false && totals.grandTotal > 0) {
      const glLines = [];

      // A. Dr Inventory / Expense Accounts
      const amountsByAccount = new Map<string, number>();
      for (const line of totals.calculatedLines) {
        const code = line.assetOrExpenseAccountCode || '1200';
        amountsByAccount.set(code, (amountsByAccount.get(code) || 0) + line.lineTotal);
      }

      amountsByAccount.forEach((amt, code) => {
        glLines.push({
          accountCode: code,
          debit: round2(amt),
          credit: 0,
          description: `Stock/supplies purchased on ${billNumber} (${supplier.name})`,
          partnerType: 'Supplier' as const,
          partnerId: supplier.idNumber,
          partnerName: supplier.name,
        });
      });

      // B. Dr Value Added Tax (VAT) Input Recoverable 15% (Account 1300)
      if (totals.vatTotal > 0) {
        glLines.push({
          accountCode: '1300', // VAT Input Recoverable (Asset)
          debit: totals.vatTotal,
          credit: 0,
          description: `15% Input VAT on ${billNumber} (Tax Invoice: ${input.supplierInvoiceNumber})`,
          partnerType: 'Supplier' as const,
          partnerId: supplier.idNumber,
          partnerName: supplier.name,
        });
      }

      // C. Cr Withholding Tax Payable 2% (Account 2120)
      if (totals.withholdingTaxAmount > 0) {
        glLines.push({
          accountCode: '2120', // Withholding Tax Payable (Liability)
          debit: 0,
          credit: totals.withholdingTaxAmount,
          description: `Withholding Tax deducted on ${billNumber} for remittance to MoR`,
          partnerType: 'Supplier' as const,
          partnerId: supplier.idNumber,
          partnerName: supplier.name,
        });
      }

      // D. Cr Accounts Payable - Trade Vendors (Account 2010)
      glLines.push({
        accountCode: '2010', // Accounts Payable (Liability)
        debit: 0,
        credit: totals.grandTotal,
        description: `Trade payable for ${billNumber} (${supplier.name})`,
        partnerType: 'Supplier' as const,
        partnerId: supplier.idNumber,
        partnerName: supplier.name,
      });

      const journal = await GeneralLedgerService.createJournalEntry({
        date: todayStr,
        accountingDate: todayStr,
        sourceModule: 'AP',
        sourceReferenceId: `bill-${billNumber}`,
        sourceDocumentNumber: billNumber,
        memo: `Supplier Bill ${billNumber} from ${supplier.name} (Inv: ${input.supplierInvoiceNumber})`,
        department: 'Procurement & Inventory',
        lines: glLines,
        status: 'Posted',
        createdBy: input.createdBy,
      });

      journalEntryNumber = journal.entryNumber;
    }

    // 3. Create Bill Document
    const billDoc = await SupplierBillModel.create({
      idNumber,
      billNumber,
      supplierInvoiceNumber: input.supplierInvoiceNumber.trim(),
      supplierId: supplier.idNumber,
      supplierCode: supplier.supplierCode,
      supplierName: supplier.name,
      supplierTin: supplier.tinNumber,
      billDate: todayStr,
      dueDate,
      paymentTermsDays: terms,
      status: 'Approved',
      purchaseOrderRef: input.purchaseOrderRef || '',
      goodsReceivedRef: input.goodsReceivedRef || '',
      lines: totals.calculatedLines,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      withholdingTaxRate: totals.withholdingTaxRate,
      withholdingTaxAmount: totals.withholdingTaxAmount,
      grandTotal: totals.grandTotal,
      amountPaid: 0,
      balanceDue: totals.grandTotal,
      journalEntryNumber,
      matchedWithInventory,
      approvedBy: input.createdBy,
      approvedAt: new Date(),
      notes: input.notes || '',
      createdBy: input.createdBy,
    });

    // 4. Update Supplier Balances
    supplier.totalPurchases = round2(supplier.totalPurchases + totals.grandTotal);
    supplier.currentBalance = round2(supplier.currentBalance + totals.grandTotal);
    await supplier.save();

    return billDoc;
  }

  /**
   * Records a payment against a Supplier Bill and posts the payment voucher to the General Ledger.
   */
  static async recordBillPayment(billNumber: string, input: RecordBillPaymentInput): Promise<ISupplierBill> {
    await connectToDatabase();

    const bill = await SupplierBillModel.findOne({ billNumber: billNumber.trim() });
    if (!bill) {
      throw new Error(`Supplier bill "${billNumber}" not found.`);
    }

    if (bill.status === 'Paid') {
      throw new Error(`Bill "${billNumber}" is already fully settled.`);
    }

    if (bill.status === 'Cancelled') {
      throw new Error(`Cannot pay cancelled bill "${billNumber}".`);
    }

    const paymentAmount = round2(Number(input.paymentAmount));
    if (paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (paymentAmount > bill.balanceDue) {
      throw new Error(
        `Payment amount (ETB ${paymentAmount.toFixed(2)}) exceeds bill balance due (ETB ${bill.balanceDue.toFixed(2)}).`
      );
    }

    const todayStr = input.paymentDate || new Date().toISOString().split('T')[0];

    // Tender asset selection: 1060 for Bank CBE, 1010 for Cash
    const assetAccount = AccountingIntegrationService.getTenderAccountCode(input.paymentMethod, '1060');

    // Post Payment Voucher Journal Entry:
    // Dr Accounts Payable (2010) | Cr Bank / Cash (1060 / 1010)
    await GeneralLedgerService.createJournalEntry({
      date: todayStr,
      accountingDate: todayStr,
      sourceModule: 'AP',
      sourceReferenceId: `bill-pay-${bill.billNumber}-${Date.now()}`,
      sourceDocumentNumber: bill.billNumber,
      memo: `Payment voucher for ${bill.billNumber} to ${bill.supplierName} via ${input.paymentMethod || 'Bank Transfer'}`,
      department: 'Procurement & Inventory',
      lines: [
        {
          accountCode: '2010', // Accounts Payable - Trade Vendors
          debit: paymentAmount,
          credit: 0,
          description: `Disbursement clearing for ${bill.billNumber} (${bill.supplierName})`,
          partnerType: 'Supplier',
          partnerId: bill.supplierId,
          partnerName: bill.supplierName,
        },
        {
          accountCode: assetAccount, // Bank / Cash Asset
          debit: 0,
          credit: paymentAmount,
          description: `Vendor payment via ${input.paymentMethod || 'Bank Transfer'} (Ref: ${input.referenceCode || bill.billNumber})`,
          partnerType: 'Supplier',
          partnerId: bill.supplierId,
          partnerName: bill.supplierName,
        },
      ],
      status: 'Posted',
      createdBy: input.recordedBy,
    });

    // Update Bill Balances
    bill.amountPaid = round2(bill.amountPaid + paymentAmount);
    bill.balanceDue = round2(bill.grandTotal - bill.amountPaid);
    bill.status = bill.balanceDue === 0 ? 'Paid' : 'Partial';
    await bill.save();

    // Update Supplier Payable Balance
    const supplier = await SupplierModel.findOne({ idNumber: bill.supplierId });
    if (supplier) {
      supplier.totalPaid = round2(supplier.totalPaid + paymentAmount);
      supplier.currentBalance = round2(Math.max(0, supplier.currentBalance - paymentAmount));
      await supplier.save();
    }

    return bill;
  }

  /**
   * Generates the Accounts Payable (AP) Aging Report across 5 standard aging buckets:
   * Current (<= 0 days), 1-30 days, 31-60 days, 61-90 days, and 90+ days.
   */
  static async getAPAgingReport(asOfDate?: string): Promise<{
    asOfDate: string;
    totalPayables: number;
    agingBuckets: APAgingBucket[];
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

    const bills = await SupplierBillModel.find({
      status: { $in: ['Approved', 'Partial'] },
      balanceDue: { $gt: 0 },
      billDate: { $lte: targetDateStr },
    }).lean();

    const supplierMap = new Map<number, APAgingBucket>();

    let currentTotal = 0;
    let days1_30Total = 0;
    let days31_60Total = 0;
    let days61_90Total = 0;
    let days90PlusTotal = 0;
    let grandTotalPayables = 0;

    for (const b of bills) {
      const dueMs = new Date(b.dueDate).getTime();
      const diffDays = Math.floor((targetMs - dueMs) / (1000 * 60 * 60 * 24));
      const balance = b.balanceDue;

      grandTotalPayables += balance;

      if (!supplierMap.has(b.supplierId)) {
        supplierMap.set(b.supplierId, {
          supplierId: b.supplierId,
          supplierCode: b.supplierCode,
          supplierName: b.supplierName,
          supplierTin: b.supplierTin,
          category: 'Vendor',
          totalOutstanding: 0,
          current: 0,
          days1_30: 0,
          days31_60: 0,
          days61_90: 0,
          days90Plus: 0,
          billsCount: 0,
        });
      }

      const bucket = supplierMap.get(b.supplierId)!;
      bucket.totalOutstanding = round2(bucket.totalOutstanding + balance);
      bucket.billsCount += 1;

      if (diffDays <= 0) {
        bucket.current = round2(bucket.current + balance);
        currentTotal += balance;
      } else if (diffDays <= 30) {
        bucket.days1_30 = round2(bucket.days1_30 + balance);
        days1_30Total += balance;
      } else if (diffDays <= 60) {
        bucket.days31_60 = round2(bucket.days31_60 + balance);
        days31_60Total += balance;
      } else if (diffDays <= 90) {
        bucket.days61_90 = round2(bucket.days61_90 + balance);
        days61_90Total += balance;
      } else {
        bucket.days90Plus = round2(bucket.days90Plus + balance);
        days90PlusTotal += balance;
      }
    }

    const agingBuckets = Array.from(supplierMap.values()).sort(
      (a, b) => b.totalOutstanding - a.totalOutstanding
    );

    return {
      asOfDate: targetDateStr,
      totalPayables: round2(grandTotalPayables),
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
   * Generates a Vendor Statement detailing all purchase bills, goods received, payments, and current balance.
   */
  static async getSupplierStatement(
    supplierId: number,
    options?: { startDate?: string; endDate?: string }
  ): Promise<{
    supplier: ISupplier;
    period: { startDate: string; endDate: string };
    bills: {
      billNumber: string;
      supplierInvoiceNumber: string;
      billDate: string;
      dueDate: string;
      description: string;
      grandTotal: number;
      amountPaid: number;
      balanceDue: number;
      status: string;
    }[];
    totalPurchases: number;
    totalPaid: number;
    currentPayableBalance: number;
  }> {
    await connectToDatabase();

    const supplier = await SupplierModel.findOne({ idNumber: Number(supplierId) }).lean();
    if (!supplier) {
      throw new Error(`Supplier with ID #${supplierId} not found.`);
    }

    const query: any = { supplierId: supplier.idNumber };
    if (options?.startDate || options?.endDate) {
      query.billDate = {};
      if (options.startDate) query.billDate.$gte = options.startDate;
      if (options.endDate) query.billDate.$lte = options.endDate;
    }

    const bills = await SupplierBillModel.find(query).sort({ billDate: 1 }).lean();

    let totalPurchases = 0;
    let totalPaid = 0;

    const itemized = bills.map((b) => {
      totalPurchases += b.grandTotal;
      totalPaid += b.amountPaid;

      const desc = b.lines.map((l) => `${l.quantity} ${l.unit} ${l.description}`).join(', ');

      return {
        billNumber: b.billNumber,
        supplierInvoiceNumber: b.supplierInvoiceNumber,
        billDate: b.billDate,
        dueDate: b.dueDate,
        description: desc,
        grandTotal: b.grandTotal,
        amountPaid: b.amountPaid,
        balanceDue: b.balanceDue,
        status: b.status,
      };
    });

    const todayStr = new Date().toISOString().split('T')[0];

    return {
      supplier: supplier as any,
      period: {
        startDate: options?.startDate || (bills[0]?.billDate ?? todayStr),
        endDate: options?.endDate || todayStr,
      },
      bills: itemized,
      totalPurchases: round2(totalPurchases),
      totalPaid: round2(totalPaid),
      currentPayableBalance: round2(totalPurchases - totalPaid),
    };
  }
}
