import { connectToDatabase } from '@/lib/db';
import { AccountModel, IAccount } from '@/lib/models/Account';
import { JournalEntryModel } from '@/lib/models/JournalEntry';
import { toCents, toBirr, round2 } from './money';

export interface TrialBalanceAccountItem {
  code: string;
  name: string;
  type: string;
  subType?: string;
  normalBalance: string;
  debitSum: number;
  creditSum: number;
  netDebit: number;
  netCredit: number;
}

export interface TrialBalanceReport {
  asOfDate: string;
  accounts: TrialBalanceAccountItem[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
  byCategory: {
    assets: { debit: number; credit: number };
    liabilities: { debit: number; credit: number };
    equity: { debit: number; credit: number };
    revenue: { debit: number; credit: number };
    expense: { debit: number; credit: number };
  };
}

export interface BalanceSheetItem {
  code: string;
  name: string;
  subType?: string;
  balance: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: {
    currentAssets: {
      cashAndBank: BalanceSheetItem[];
      receivables: BalanceSheetItem[];
      taxPrepaid: BalanceSheetItem[];
      inventories: BalanceSheetItem[];
      totalCurrentAssets: number;
    };
    nonCurrentAssets: {
      fixedAssets: BalanceSheetItem[];
      accumulatedDepreciation: BalanceSheetItem[];
      totalNonCurrentAssets: number;
    };
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: {
      tradePayables: BalanceSheetItem[];
      guestDepositsAndPrepayments: BalanceSheetItem[];
      statutoryAndTaxPayables: BalanceSheetItem[];
      totalCurrentLiabilities: number;
    };
    longTermLiabilities: {
      bankLoans: BalanceSheetItem[];
      totalLongTermLiabilities: number;
    };
    totalLiabilities: number;
  };
  equity: {
    capital: BalanceSheetItem[];
    retainedEarningsPrior: BalanceSheetItem[];
    currentPeriodNetIncome: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  difference: number;
}

export interface PnLLineItem {
  code: string;
  name: string;
  amount: number;
}

export interface ProfitAndLossReport {
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: {
    roomStay: PnLLineItem[];
    foodAndBeverage: PnLLineItem[];
    banquetAndEvents: PnLLineItem[];
    ancillary: PnLLineItem[];
    totalRevenue: number;
  };
  cogs: {
    foodIngredients: PnLLineItem[];
    beverageStock: PnLLineItem[];
    cateringDirect: PnLLineItem[];
    totalCOGS: number;
  };
  grossProfit: number;
  grossMarginPercentage: number;
  operatingExpenses: {
    payrollAndBenefits: PnLLineItem[];
    housekeepingAndLaundry: PnLLineItem[];
    utilities: PnLLineItem[];
    maintenance: PnLLineItem[];
    marketingAndOTA: PnLLineItem[];
    depreciation: PnLLineItem[];
    administrativeAndOffice: PnLLineItem[];
    cashOverAndShort: PnLLineItem[];
    otherExpenses: PnLLineItem[];
    totalOperatingExpenses: number;
  };
  operatingIncome: number;
  netIncome: number;
  netMarginPercentage: number;
}

export interface GeneralLedgerTransaction {
  date: string;
  entryNumber: string;
  sourceModule: string;
  sourceDocumentNumber?: string;
  memo: string;
  description: string;
  partnerName?: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface GeneralLedgerAccountReport {
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  openingBalance: number;
  transactions: GeneralLedgerTransaction[];
  periodDebit: number;
  periodCredit: number;
  closingBalance: number;
}

export interface TaxSummaryReport {
  period: {
    startDate: string;
    endDate: string;
  };
  vat: {
    outputVatRate: number; // 15%
    taxableRevenueBase: number;
    outputVatCollected: number; // Account 2100
    taxablePurchasesBase: number;
    inputVatDeductible: number; // Account 1150
    netVatPayableToMoR: number; // Output - Input
  };
  serviceCharge: {
    serviceChargeRate: number; // 10%
    serviceChargeCollected: number; // Account 2110
  };
  withholdingTax: {
    withholdingRate: number; // 2%
    withholdingTaxRemittanceDue: number; // Account 2120
  };
  payrollTaxes: {
    personalIncomeTaxWithheld: number; // Account 2130
    pensionContributionsPayable: number; // Account 2140 (18% total)
  };
  totalStatutoryRemittanceDue: number; // Net VAT + WHT + PIT + Pension
}

export class FinancialReportingService {
  /**
   * Generates a real-time Trial Balance with category summaries.
   */
  static async getTrialBalance(options?: {
    asOfDate?: string;
    startDate?: string;
  }): Promise<TrialBalanceReport> {
    await connectToDatabase();
    const asOfDate = options?.asOfDate || new Date().toISOString().split('T')[0];

    const accounts = await AccountModel.find({ isActive: true }).sort({ code: 1 }).lean();

    const matchQuery: any = {
      status: 'Posted',
      accountingDate: { $lte: asOfDate },
    };

    if (options?.startDate) {
      matchQuery.accountingDate.$gte = options.startDate;
    }

    const aggregated = await JournalEntryModel.aggregate([
      { $match: matchQuery },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.accountCode',
          totalDebitCents: { $sum: '$lines.debitCents' },
          totalCreditCents: { $sum: '$lines.creditCents' },
        },
      },
    ]);

    const balanceMap = new Map<string, { totalDebitCents: number; totalCreditCents: number }>();
    for (const item of aggregated) {
      balanceMap.set(item._id, {
        totalDebitCents: item.totalDebitCents,
        totalCreditCents: item.totalCreditCents,
      });
    }

    let grandDebitCents = 0;
    let grandCreditCents = 0;

    const byCategory = {
      assets: { debit: 0, credit: 0 },
      liabilities: { debit: 0, credit: 0 },
      equity: { debit: 0, credit: 0 },
      revenue: { debit: 0, credit: 0 },
      expense: { debit: 0, credit: 0 },
    };

    const trialBalanceAccounts: TrialBalanceAccountItem[] = accounts.map((acc) => {
      const data = balanceMap.get(acc.code) || { totalDebitCents: 0, totalCreditCents: 0 };
      const debitSum = toBirr(data.totalDebitCents);
      const creditSum = toBirr(data.totalCreditCents);

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
        if (diffCents <= 0) {
          netCredit = toBirr(Math.abs(diffCents));
        } else {
          netDebit = toBirr(diffCents);
        }
      }

      grandDebitCents += toCents(netDebit);
      grandCreditCents += toCents(netCredit);

      const netDebCents = toCents(netDebit);
      const netCredCents = toCents(netCredit);

      if (acc.type === 'Asset') {
        byCategory.assets.debit += toBirr(netDebCents);
        byCategory.assets.credit += toBirr(netCredCents);
      } else if (acc.type === 'Liability') {
        byCategory.liabilities.debit += toBirr(netDebCents);
        byCategory.liabilities.credit += toBirr(netCredCents);
      } else if (acc.type === 'Equity') {
        byCategory.equity.debit += toBirr(netDebCents);
        byCategory.equity.credit += toBirr(netCredCents);
      } else if (acc.type === 'Revenue') {
        byCategory.revenue.debit += toBirr(netDebCents);
        byCategory.revenue.credit += toBirr(netCredCents);
      } else if (acc.type === 'Expense') {
        byCategory.expense.debit += toBirr(netDebCents);
        byCategory.expense.credit += toBirr(netCredCents);
      }

      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        normalBalance: acc.normalBalance,
        debitSum,
        creditSum,
        netDebit,
        netCredit,
      };
    });

    const activeAccounts = trialBalanceAccounts.filter(
      (a) => a.debitSum > 0 || a.creditSum > 0 || a.netDebit > 0 || a.netCredit > 0
    );

    const diffCents = Math.abs(grandDebitCents - grandCreditCents);

    return {
      asOfDate,
      accounts: activeAccounts,
      totalDebit: toBirr(grandDebitCents),
      totalCredit: toBirr(grandCreditCents),
      isBalanced: diffCents === 0,
      difference: toBirr(diffCents),
      byCategory: {
        assets: { debit: round2(byCategory.assets.debit), credit: round2(byCategory.assets.credit) },
        liabilities: { debit: round2(byCategory.liabilities.debit), credit: round2(byCategory.liabilities.credit) },
        equity: { debit: round2(byCategory.equity.debit), credit: round2(byCategory.equity.credit) },
        revenue: { debit: round2(byCategory.revenue.debit), credit: round2(byCategory.revenue.credit) },
        expense: { debit: round2(byCategory.expense.debit), credit: round2(byCategory.expense.credit) },
      },
    };
  }

  /**
   * Generates a fully balanced Balance Sheet: Assets = Liabilities + Equity.
   * Unclosed Net Income from P&L is factored as the Current Period Net Income plug in Equity.
   */
  static async getBalanceSheet(options?: { asOfDate?: string }): Promise<BalanceSheetReport> {
    await connectToDatabase();
    const asOfDate = options?.asOfDate || new Date().toISOString().split('T')[0];

    const accounts = await AccountModel.find({ isActive: true }).sort({ code: 1 }).lean();

    const aggregated = await JournalEntryModel.aggregate([
      {
        $match: {
          status: 'Posted',
          accountingDate: { $lte: asOfDate },
        },
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.accountCode',
          totalDebitCents: { $sum: '$lines.debitCents' },
          totalCreditCents: { $sum: '$lines.creditCents' },
        },
      },
    ]);

    const balanceMap = new Map<string, number>(); // code -> net balance in birr
    for (const item of aggregated) {
      const code = item._id;
      const acc = accounts.find((a) => a.code === code);
      if (!acc) continue;

      const diffCents = item.totalDebitCents - item.totalCreditCents;
      if (acc.normalBalance === 'Debit') {
        balanceMap.set(code, toBirr(diffCents));
      } else {
        balanceMap.set(code, toBirr(-diffCents));
      }
    }

    // Categorize Assets
    const cashAndBank: BalanceSheetItem[] = [];
    const receivables: BalanceSheetItem[] = [];
    const taxPrepaid: BalanceSheetItem[] = [];
    const inventories: BalanceSheetItem[] = [];
    const fixedAssets: BalanceSheetItem[] = [];
    const accumulatedDepreciation: BalanceSheetItem[] = [];

    // Categorize Liabilities
    const tradePayables: BalanceSheetItem[] = [];
    const guestDepositsAndPrepayments: BalanceSheetItem[] = [];
    const statutoryAndTaxPayables: BalanceSheetItem[] = [];
    const bankLoans: BalanceSheetItem[] = [];

    // Categorize Equity
    const capital: BalanceSheetItem[] = [];
    const retainedEarningsPrior: BalanceSheetItem[] = [];

    // Categorize P&L for Current Period Net Income plug
    let totalRevenueCents = 0;
    let totalExpenseCents = 0;

    for (const acc of accounts) {
      const balance = balanceMap.get(acc.code) || 0;
      if (Math.abs(balance) < 0.005) continue;

      const item: BalanceSheetItem = {
        code: acc.code,
        name: acc.name,
        subType: acc.subType,
        balance,
      };

      if (acc.type === 'Asset') {
        const codeNum = parseInt(acc.code, 10);
        if (codeNum >= 1010 && codeNum <= 1070) {
          cashAndBank.push(item);
        } else if (codeNum >= 1100 && codeNum <= 1120) {
          receivables.push(item);
        } else if (codeNum === 1150) {
          taxPrepaid.push(item);
        } else if (codeNum >= 1200 && codeNum <= 1400) {
          inventories.push(item);
        } else if (codeNum === 1610) {
          accumulatedDepreciation.push(item);
        } else if (codeNum >= 1500) {
          fixedAssets.push(item);
        } else {
          cashAndBank.push(item);
        }
      } else if (acc.type === 'Liability') {
        const codeNum = parseInt(acc.code, 10);
        if (codeNum === 2010) {
          tradePayables.push(item);
        } else if (codeNum === 2020 || codeNum === 2030) {
          guestDepositsAndPrepayments.push(item);
        } else if (codeNum >= 2100 && codeNum <= 2140) {
          statutoryAndTaxPayables.push(item);
        } else if (codeNum >= 2500) {
          bankLoans.push(item);
        } else {
          tradePayables.push(item);
        }
      } else if (acc.type === 'Equity') {
        if (acc.code === '3010') {
          capital.push(item);
        } else {
          retainedEarningsPrior.push(item);
        }
      } else if (acc.type === 'Revenue') {
        totalRevenueCents += toCents(balance);
      } else if (acc.type === 'Expense') {
        totalExpenseCents += toCents(balance);
      }
    }

    const currentPeriodNetIncome = toBirr(totalRevenueCents - totalExpenseCents);

    const totalCashBank = round2(cashAndBank.reduce((sum, i) => sum + i.balance, 0));
    const totalRec = round2(receivables.reduce((sum, i) => sum + i.balance, 0));
    const totalTaxPrepaid = round2(taxPrepaid.reduce((sum, i) => sum + i.balance, 0));
    const totalInv = round2(inventories.reduce((sum, i) => sum + i.balance, 0));
    const totalCurrentAssets = round2(totalCashBank + totalRec + totalTaxPrepaid + totalInv);

    const totalFixed = round2(fixedAssets.reduce((sum, i) => sum + i.balance, 0));
    const totalAccDeprec = round2(accumulatedDepreciation.reduce((sum, i) => sum + i.balance, 0));
    const totalNonCurrentAssets = round2(totalFixed - Math.abs(totalAccDeprec));

    const totalAssets = round2(totalCurrentAssets + totalNonCurrentAssets);

    const totalPayables = round2(tradePayables.reduce((sum, i) => sum + i.balance, 0));
    const totalDeposits = round2(guestDepositsAndPrepayments.reduce((sum, i) => sum + i.balance, 0));
    const totalStatutory = round2(statutoryAndTaxPayables.reduce((sum, i) => sum + i.balance, 0));
    const totalCurrentLiabilities = round2(totalPayables + totalDeposits + totalStatutory);

    const totalLoans = round2(bankLoans.reduce((sum, i) => sum + i.balance, 0));
    const totalLongTermLiabilities = totalLoans;

    const totalLiabilities = round2(totalCurrentLiabilities + totalLongTermLiabilities);

    const totalCapital = round2(capital.reduce((sum, i) => sum + i.balance, 0));
    const totalPriorRetained = round2(retainedEarningsPrior.reduce((sum, i) => sum + i.balance, 0));
    const totalEquity = round2(totalCapital + totalPriorRetained + currentPeriodNetIncome);

    const totalLiabilitiesAndEquity = round2(totalLiabilities + totalEquity);
    const diff = round2(Math.abs(totalAssets - totalLiabilitiesAndEquity));
    const isBalanced = diff < 0.01;

    return {
      asOfDate,
      assets: {
        currentAssets: {
          cashAndBank,
          receivables,
          taxPrepaid,
          inventories,
          totalCurrentAssets,
        },
        nonCurrentAssets: {
          fixedAssets,
          accumulatedDepreciation,
          totalNonCurrentAssets,
        },
        totalAssets,
      },
      liabilities: {
        currentLiabilities: {
          tradePayables,
          guestDepositsAndPrepayments,
          statutoryAndTaxPayables,
          totalCurrentLiabilities,
        },
        longTermLiabilities: {
          bankLoans,
          totalLongTermLiabilities,
        },
        totalLiabilities,
      },
      equity: {
        capital,
        retainedEarningsPrior,
        currentPeriodNetIncome,
        totalEquity,
      },
      totalLiabilitiesAndEquity,
      isBalanced,
      difference: diff,
    };
  }

  /**
   * Generates a USALI-compliant Hotel Profit and Loss Statement (Income Statement).
   */
  static async getProfitAndLoss(options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ProfitAndLossReport> {
    await connectToDatabase();
    const now = new Date();
    const startDate = options?.startDate || `${now.getFullYear()}-01-01`;
    const endDate = options?.endDate || now.toISOString().split('T')[0];

    const accounts = await AccountModel.find({
      type: { $in: ['Revenue', 'Expense'] },
      isActive: true,
    })
      .sort({ code: 1 })
      .lean();

    const aggregated = await JournalEntryModel.aggregate([
      {
        $match: {
          status: 'Posted',
          accountingDate: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.accountCode',
          totalDebitCents: { $sum: '$lines.debitCents' },
          totalCreditCents: { $sum: '$lines.creditCents' },
        },
      },
    ]);

    const balanceMap = new Map<string, number>();
    for (const item of aggregated) {
      const code = item._id;
      const acc = accounts.find((a) => a.code === code);
      if (!acc) continue;

      const diffCents = item.totalDebitCents - item.totalCreditCents;
      if (acc.normalBalance === 'Debit') {
        balanceMap.set(code, toBirr(diffCents));
      } else {
        balanceMap.set(code, toBirr(-diffCents));
      }
    }

    // Departmental Revenue categorization
    const roomStay: PnLLineItem[] = [];
    const foodAndBeverage: PnLLineItem[] = [];
    const banquetAndEvents: PnLLineItem[] = [];
    const ancillary: PnLLineItem[] = [];

    // Cost of Goods Sold categorization
    const foodIngredients: PnLLineItem[] = [];
    const beverageStock: PnLLineItem[] = [];
    const cateringDirect: PnLLineItem[] = [];

    // Operating Expenses categorization
    const payrollAndBenefits: PnLLineItem[] = [];
    const housekeepingAndLaundry: PnLLineItem[] = [];
    const utilities: PnLLineItem[] = [];
    const maintenance: PnLLineItem[] = [];
    const marketingAndOTA: PnLLineItem[] = [];
    const depreciation: PnLLineItem[] = [];
    const administrativeAndOffice: PnLLineItem[] = [];
    const cashOverAndShort: PnLLineItem[] = [];
    const otherExpenses: PnLLineItem[] = [];

    for (const acc of accounts) {
      const balance = balanceMap.get(acc.code) || 0;
      if (Math.abs(balance) < 0.005) continue;

      const lineItem: PnLLineItem = {
        code: acc.code,
        name: acc.name,
        amount: balance,
      };

      const codeNum = parseInt(acc.code, 10);

      if (acc.type === 'Revenue') {
        if (codeNum === 4010) roomStay.push(lineItem);
        else if (codeNum === 4020 || codeNum === 4030) foodAndBeverage.push(lineItem);
        else if (codeNum === 4040) banquetAndEvents.push(lineItem);
        else ancillary.push(lineItem);
      } else if (acc.type === 'Expense') {
        if (codeNum >= 5000 && codeNum < 6000) {
          // COGS
          if (codeNum === 5010) foodIngredients.push(lineItem);
          else if (codeNum === 5020) beverageStock.push(lineItem);
          else if (codeNum === 5030) cateringDirect.push(lineItem);
          else foodIngredients.push(lineItem);
        } else {
          // Operating Expenses
          if (codeNum >= 6010 && codeNum <= 6030) payrollAndBenefits.push(lineItem);
          else if (codeNum === 6100 || codeNum === 6110) housekeepingAndLaundry.push(lineItem);
          else if (codeNum === 6200) utilities.push(lineItem);
          else if (codeNum === 6210) maintenance.push(lineItem);
          else if (codeNum === 6300) marketingAndOTA.push(lineItem);
          else if (codeNum === 6500) depreciation.push(lineItem);
          else if (codeNum === 6900) administrativeAndOffice.push(lineItem);
          else if (codeNum === 6950) cashOverAndShort.push(lineItem);
          else otherExpenses.push(lineItem);
        }
      }
    }

    const totalRevRoom = round2(roomStay.reduce((s, i) => s + i.amount, 0));
    const totalRevFB = round2(foodAndBeverage.reduce((s, i) => s + i.amount, 0));
    const totalRevBanquet = round2(banquetAndEvents.reduce((s, i) => s + i.amount, 0));
    const totalRevAncillary = round2(ancillary.reduce((s, i) => s + i.amount, 0));
    const totalRevenue = round2(totalRevRoom + totalRevFB + totalRevBanquet + totalRevAncillary);

    const totalCogsFood = round2(foodIngredients.reduce((s, i) => s + i.amount, 0));
    const totalCogsBev = round2(beverageStock.reduce((s, i) => s + i.amount, 0));
    const totalCogsCat = round2(cateringDirect.reduce((s, i) => s + i.amount, 0));
    const totalCOGS = round2(totalCogsFood + totalCogsBev + totalCogsCat);

    const grossProfit = round2(totalRevenue - totalCOGS);
    const grossMarginPercentage = totalRevenue > 0 ? round2((grossProfit / totalRevenue) * 100) : 0;

    const totalOpexPayroll = round2(payrollAndBenefits.reduce((s, i) => s + i.amount, 0));
    const totalOpexHousekeeping = round2(housekeepingAndLaundry.reduce((s, i) => s + i.amount, 0));
    const totalOpexUtilities = round2(utilities.reduce((s, i) => s + i.amount, 0));
    const totalOpexMaintenance = round2(maintenance.reduce((s, i) => s + i.amount, 0));
    const totalOpexMarketing = round2(marketingAndOTA.reduce((s, i) => s + i.amount, 0));
    const totalOpexDeprec = round2(depreciation.reduce((s, i) => s + i.amount, 0));
    const totalOpexAdmin = round2(administrativeAndOffice.reduce((s, i) => s + i.amount, 0));
    const totalOpexOverShort = round2(cashOverAndShort.reduce((s, i) => s + i.amount, 0));
    const totalOpexOther = round2(otherExpenses.reduce((s, i) => s + i.amount, 0));

    const totalOperatingExpenses = round2(
      totalOpexPayroll +
        totalOpexHousekeeping +
        totalOpexUtilities +
        totalOpexMaintenance +
        totalOpexMarketing +
        totalOpexDeprec +
        totalOpexAdmin +
        totalOpexOverShort +
        totalOpexOther
    );

    const operatingIncome = round2(grossProfit - totalOperatingExpenses);
    const netIncome = operatingIncome;
    const netMarginPercentage = totalRevenue > 0 ? round2((netIncome / totalRevenue) * 100) : 0;

    return {
      period: { startDate, endDate },
      revenue: {
        roomStay,
        foodAndBeverage,
        banquetAndEvents,
        ancillary,
        totalRevenue,
      },
      cogs: {
        foodIngredients,
        beverageStock,
        cateringDirect,
        totalCOGS,
      },
      grossProfit,
      grossMarginPercentage,
      operatingExpenses: {
        payrollAndBenefits,
        housekeepingAndLaundry,
        utilities,
        maintenance,
        marketingAndOTA,
        depreciation,
        administrativeAndOffice,
        cashOverAndShort,
        otherExpenses,
        totalOperatingExpenses,
      },
      operatingIncome,
      netIncome,
      netMarginPercentage,
    };
  }

  /**
   * Generates a comprehensive General Ledger Report with opening balances and chronological transactions.
   */
  static async getGeneralLedgerReport(options?: {
    startDate?: string;
    endDate?: string;
    accountCode?: string;
    accountType?: string;
  }): Promise<{
    period: { startDate: string; endDate: string };
    accounts: GeneralLedgerAccountReport[];
  }> {
    await connectToDatabase();
    const now = new Date();
    const startDate = options?.startDate || `${now.getFullYear()}-01-01`;
    const endDate = options?.endDate || now.toISOString().split('T')[0];

    const accountFilter: any = { isActive: true };
    if (options?.accountCode) {
      accountFilter.code = options.accountCode.trim();
    }
    if (options?.accountType) {
      accountFilter.type = options.accountType;
    }

    const accounts = await AccountModel.find(accountFilter).sort({ code: 1 }).lean();

    // 1. Calculate opening balances strictly before startDate
    const openingAgg = await JournalEntryModel.aggregate([
      {
        $match: {
          status: 'Posted',
          accountingDate: { $lt: startDate },
        },
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.accountCode',
          totalDebitCents: { $sum: '$lines.debitCents' },
          totalCreditCents: { $sum: '$lines.creditCents' },
        },
      },
    ]);

    const openingMap = new Map<string, number>();
    for (const item of openingAgg) {
      const acc = accounts.find((a) => a.code === item._id);
      if (!acc) continue;
      const diffCents = item.totalDebitCents - item.totalCreditCents;
      openingMap.set(item._id, acc.normalBalance === 'Debit' ? toBirr(diffCents) : toBirr(-diffCents));
    }

    // 2. Fetch all journal entries inside [startDate, endDate]
    const entries = await JournalEntryModel.find({
      status: 'Posted',
      accountingDate: { $gte: startDate, $lte: endDate },
    })
      .sort({ accountingDate: 1, idNumber: 1 })
      .lean();

    const reportAccounts: GeneralLedgerAccountReport[] = [];

    for (const acc of accounts) {
      const openingBalance = openingMap.get(acc.code) || 0;
      let runningBalance = openingBalance;
      let periodDebitCents = 0;
      let periodCreditCents = 0;
      const transactions: GeneralLedgerTransaction[] = [];

      for (const entry of entries) {
        for (const line of entry.lines) {
          if (line.accountCode === acc.code) {
            periodDebitCents += line.debitCents || toCents(line.debit);
            periodCreditCents += line.creditCents || toCents(line.credit);

            if (acc.normalBalance === 'Debit') {
              runningBalance = round2(runningBalance + line.debit - line.credit);
            } else {
              runningBalance = round2(runningBalance + line.credit - line.debit);
            }

            transactions.push({
              date: entry.accountingDate,
              entryNumber: entry.entryNumber,
              sourceModule: entry.sourceModule,
              sourceDocumentNumber: entry.sourceDocumentNumber || '',
              memo: entry.memo,
              description: line.description,
              partnerName: line.partnerName || null,
              debit: line.debit,
              credit: line.credit,
              runningBalance,
            });
          }
        }
      }

      if (Math.abs(openingBalance) > 0 || transactions.length > 0) {
        reportAccounts.push({
          code: acc.code,
          name: acc.name,
          type: acc.type,
          normalBalance: acc.normalBalance,
          openingBalance,
          transactions,
          periodDebit: toBirr(periodDebitCents),
          periodCredit: toBirr(periodCreditCents),
          closingBalance: runningBalance,
        });
      }
    }

    return {
      period: { startDate, endDate },
      accounts: reportAccounts,
    };
  }

  /**
   * Generates Ethiopian Tax Summary Report for filing with the Ministry of Revenues (MoR).
   */
  static async getTaxSummaryReport(options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<TaxSummaryReport> {
    await connectToDatabase();
    const now = new Date();
    const startDate = options?.startDate || `${now.getFullYear()}-01-01`;
    const endDate = options?.endDate || now.toISOString().split('T')[0];

    const aggregated = await JournalEntryModel.aggregate([
      {
        $match: {
          status: 'Posted',
          accountingDate: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.accountCode',
          totalDebitCents: { $sum: '$lines.debitCents' },
          totalCreditCents: { $sum: '$lines.creditCents' },
        },
      },
    ]);

    const taxAccountMap = new Map<string, { debit: number; credit: number }>();
    for (const item of aggregated) {
      taxAccountMap.set(item._id, {
        debit: toBirr(item.totalDebitCents),
        credit: toBirr(item.totalCreditCents),
      });
    }

    // 1. Output VAT 15% (Account 2100 - Normal Credit)
    const vat2100 = taxAccountMap.get('2100') || { debit: 0, credit: 0 };
    const outputVatCollected = round2(vat2100.credit - vat2100.debit);
    const taxableRevenueBase = round2(outputVatCollected / 0.15);

    // 2. Input VAT 15% Deductible (Account 1150 - Normal Debit)
    const vat1150 = taxAccountMap.get('1150') || { debit: 0, credit: 0 };
    const inputVatDeductible = round2(vat1150.debit - vat1150.credit);
    const taxablePurchasesBase = round2(inputVatDeductible / 0.15);

    // Net VAT Payable to MoR
    const netVatPayableToMoR = round2(outputVatCollected - inputVatDeductible);

    // 3. Service Charge 10% (Account 2110 - Normal Credit)
    const sc2110 = taxAccountMap.get('2110') || { debit: 0, credit: 0 };
    const serviceChargeCollected = round2(sc2110.credit - sc2110.debit);

    // 4. Statutory Withholding Tax 2% (Account 2120 - Normal Credit)
    const wht2120 = taxAccountMap.get('2120') || { debit: 0, credit: 0 };
    const withholdingTaxRemittanceDue = round2(wht2120.credit - wht2120.debit);

    // 5. Personal Income Tax (Account 2130)
    const pit2130 = taxAccountMap.get('2130') || { debit: 0, credit: 0 };
    const personalIncomeTaxWithheld = round2(pit2130.credit - pit2130.debit);

    // 6. Pension Fund (Account 2140)
    const pension2140 = taxAccountMap.get('2140') || { debit: 0, credit: 0 };
    const pensionContributionsPayable = round2(pension2140.credit - pension2140.debit);

    // Total Remittance Due to Ministry of Revenues
    const totalStatutoryRemittanceDue = round2(
      Math.max(0, netVatPayableToMoR) +
        withholdingTaxRemittanceDue +
        personalIncomeTaxWithheld +
        pensionContributionsPayable
    );

    return {
      period: { startDate, endDate },
      vat: {
        outputVatRate: 15.0,
        taxableRevenueBase,
        outputVatCollected,
        taxablePurchasesBase,
        inputVatDeductible,
        netVatPayableToMoR,
      },
      serviceCharge: {
        serviceChargeRate: 10.0,
        serviceChargeCollected,
      },
      withholdingTax: {
        withholdingRate: 2.0,
        withholdingTaxRemittanceDue,
      },
      payrollTaxes: {
        personalIncomeTaxWithheld,
        pensionContributionsPayable,
      },
      totalStatutoryRemittanceDue,
    };
  }
}
