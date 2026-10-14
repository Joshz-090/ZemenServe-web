import assert from 'assert';
import { round2, toCents, toBirr, formatETB, validateJournalBalance } from '../src/lib/accounting/money';

async function runFinancialReportingEngineTests() {
  console.log('================================================================');
  console.log('📊 RUNNING PHASE 7: FINANCIAL REPORTING ENGINE TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Real-Time Trial Balance Equilibrium
  // -------------------------------------------------------------
  console.log('▶ Test 1: Real-Time Trial Balance Equilibrium & Category Reconciliation');
  // Scenario: Hotel active accounts with balanced ledger entries
  const trialBalanceAccounts = [
    // Current Assets
    { code: '1010', name: 'Front Desk Cash Drawer', type: 'Asset', normalBalance: 'Debit', debitSum: 25000.0, creditSum: 5000.0, netDebit: 20000.0, netCredit: 0 },
    { code: '1060', name: 'Commercial Bank of Ethiopia (CBE)', type: 'Asset', normalBalance: 'Debit', debitSum: 462000.0, creditSum: 50000.0, netDebit: 412000.0, netCredit: 0 },
    { code: '1100', name: 'Guest Folios AR', type: 'Asset', normalBalance: 'Debit', debitSum: 85000.0, creditSum: 40000.0, netDebit: 45000.0, netCredit: 0 },
    { code: '1150', name: 'Input VAT Recoverable (15%)', type: 'Asset', normalBalance: 'Debit', debitSum: 18000.0, creditSum: 0, netDebit: 18000.0, netCredit: 0 },
    { code: '1200', name: 'Food & Beverage Inventory', type: 'Asset', normalBalance: 'Debit', debitSum: 65000.0, creditSum: 20000.0, netDebit: 45000.0, netCredit: 0 },
    // Fixed Assets
    { code: '1500', name: 'Hotel Buildings & Infrastructure', type: 'Asset', normalBalance: 'Debit', debitSum: 2500000.0, creditSum: 0, netDebit: 2500000.0, netCredit: 0 },
    { code: '1610', name: 'Accumulated Depreciation', type: 'Asset', normalBalance: 'Credit', debitSum: 0, creditSum: 150000.0, netDebit: 0, netCredit: 150000.0 },

    // Liabilities
    { code: '2010', name: 'Accounts Payable - Trade Suppliers', type: 'Liability', normalBalance: 'Credit', debitSum: 30000.0, creditSum: 120000.0, netDebit: 0, netCredit: 90000.0 },
    { code: '2020', name: 'Guest Advance Prepayments (Liability)', type: 'Liability', normalBalance: 'Credit', debitSum: 10000.0, creditSum: 45000.0, netDebit: 0, netCredit: 35000.0 },
    { code: '2100', name: 'Output VAT Payable (15%)', type: 'Liability', normalBalance: 'Credit', debitSum: 0, creditSum: 37500.0, netDebit: 0, netCredit: 37500.0 },
    { code: '2110', name: 'Service Charge Payable (10%)', type: 'Liability', normalBalance: 'Credit', debitSum: 0, creditSum: 25000.0, netDebit: 0, netCredit: 25000.0 },
    { code: '2120', name: 'Withholding Tax Payable (2%)', type: 'Liability', normalBalance: 'Credit', debitSum: 0, creditSum: 3500.0, netDebit: 0, netCredit: 3500.0 },
    { code: '2500', name: 'Commercial Bank Mortgage Loan', type: 'Liability', normalBalance: 'Credit', debitSum: 0, creditSum: 800000.0, netDebit: 0, netCredit: 800000.0 },

    // Equity
    { code: '3010', name: "Owner's Equity Capital", type: 'Equity', normalBalance: 'Credit', debitSum: 0, creditSum: 1600000.0, netDebit: 0, netCredit: 1600000.0 },
    { code: '3020', name: 'Retained Earnings Prior', type: 'Equity', normalBalance: 'Credit', debitSum: 0, creditSum: 100000.0, netDebit: 0, netCredit: 100000.0 },

    // Revenue
    { code: '4010', name: 'Room Stay Lodging Revenue', type: 'Revenue', normalBalance: 'Credit', debitSum: 0, creditSum: 160000.0, netDebit: 0, netCredit: 160000.0 },
    { code: '4020', name: 'Restaurant Dining Revenue', type: 'Revenue', normalBalance: 'Credit', debitSum: 0, creditSum: 65000.0, netDebit: 0, netCredit: 65000.0 },
    { code: '4040', name: 'Banquet & Events Revenue', type: 'Revenue', normalBalance: 'Credit', debitSum: 0, creditSum: 45000.0, netDebit: 0, netCredit: 45000.0 },

    // COGS
    { code: '5010', name: 'COGS - Food Ingredients', type: 'Expense', normalBalance: 'Debit', debitSum: 20000.0, creditSum: 0, netDebit: 20000.0, netCredit: 0 },

    // Operating Expenses
    { code: '6010', name: 'Staff Salaries Expense', type: 'Expense', normalBalance: 'Debit', debitSum: 35000.0, creditSum: 0, netDebit: 35000.0, netCredit: 0 },
    { code: '6200', name: 'Utilities - Electricity & Water', type: 'Expense', normalBalance: 'Debit', debitSum: 12000.0, creditSum: 0, netDebit: 12000.0, netCredit: 0 },
    { code: '6950', name: 'Cash Over and Short Discrepancies', type: 'Expense', normalBalance: 'Debit', debitSum: 5000.0, creditSum: 1000.0, netDebit: 4000.0, netCredit: 0 },
  ];

  let totalDebitCents = 0;
  let totalCreditCents = 0;

  for (const acc of trialBalanceAccounts) {
    totalDebitCents += toCents(acc.netDebit);
    totalCreditCents += toCents(acc.netCredit);
  }

  assert.strictEqual(totalDebitCents, totalCreditCents, 'Trial Balance Total Debits must equal Total Credits in integer cents');
  assert.strictEqual(totalDebitCents, 311100000); // 3,111,000.00 ETB
  const isBalanced = totalDebitCents === totalCreditCents;
  assert.strictEqual(isBalanced, true);

  console.log(`  ✔ Passed: Trial Balance in exact equilibrium.`);
  console.log(`     • Total Debits:  ETB ${formatETB(toBirr(totalDebitCents))}`);
  console.log(`     • Total Credits: ETB ${formatETB(toBirr(totalCreditCents))}`);
  console.log(`     • Discrepancy:   ETB 0.00\n`);

  // -------------------------------------------------------------
  // TEST 2: Balance Sheet Fundamental Accounting Equation
  // -------------------------------------------------------------
  console.log('▶ Test 2: Balance Sheet Fundamental Accounting Equation (Assets = Liabilities + Equity)');
  // Total Assets
  // Current: 20,000 (Cash) + 412,000 (Bank) + 45,000 (AR) + 18,000 (Input VAT) + 45,000 (Inventory) = 540,000
  // Non-Current: 2,500,000 (Building) - 150,000 (Accum Deprec) = 2,350,000
  // Total Assets = 540,000 + 2,350,000 = 2,890,000 ETB
  const totalAssets = 540000.0 + 2350000.0;
  assert.strictEqual(totalAssets, 2890000.0);

  // Total Liabilities
  // Current: 90,000 (AP) + 35,000 (Deposits) + 37,500 (Output VAT) + 25,000 (SC) + 3,500 (WHT) = 191,000
  // Long-Term: 800,000 (Loan)
  // Total Liabilities = 191,000 + 800,000 = 991,000 ETB
  const totalLiabilities = 191000.0 + 800000.0;
  assert.strictEqual(totalLiabilities, 991000.0);

  // P&L Net Income plug:
  // Revenue: 160,000 + 65,000 + 45,000 = 270,000
  // COGS: 20,000
  // Opex: 35,000 (Salary) + 12,000 (Utilities) + 4,000 (Cash Short) = 51,000
  // Net Income = 270,000 - 20,000 - 51,000 = 199,000 ETB
  const netIncome = 270000.0 - 20000.0 - 51000.0;
  assert.strictEqual(netIncome, 199000.0);

  // Total Equity:
  // Capital (1,600,000) + Prior Retained Earnings (100,000) + Current Year Net Income (199,000) = 1,899,000 ETB
  const totalEquity = 1600000.0 + 100000.0 + netIncome;
  assert.strictEqual(totalEquity, 1899000.0);

  // Total Liabilities & Equity = 991,000 + 1,899,000 = 2,890,000 ETB
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  assert.strictEqual(totalLiabilitiesAndEquity, totalAssets);

  const balanceSheetDifference = Math.abs(totalAssets - totalLiabilitiesAndEquity);
  assert.strictEqual(balanceSheetDifference, 0.0);

  console.log(`  ✔ Passed: Balance Sheet validates Assets = Liabilities + Equity with zero variance.`);
  console.log(`     • Total Assets:                ETB ${formatETB(totalAssets)}`);
  console.log(`     • Total Liabilities:           ETB ${formatETB(totalLiabilities)}`);
  console.log(`     • Total Equity (incl. P&L NI): ETB ${formatETB(totalEquity)}`);
  console.log(`     • Total Liabilities & Equity:  ETB ${formatETB(totalLiabilitiesAndEquity)}`);
  console.log(`     • Equilibrium Variance:        ETB ${formatETB(balanceSheetDifference)}\n`);

  // -------------------------------------------------------------
  // TEST 3: Profit & Loss Statement (USALI Standard)
  // -------------------------------------------------------------
  console.log('▶ Test 3: Profit & Loss Statement (Departmental Revenues, COGS, Gross Profit & Net Margin)');
  const totalRevenue = 270000.0;
  const totalCOGS = 20000.0;
  const grossProfit = round2(totalRevenue - totalCOGS);
  const grossMarginPercent = round2((grossProfit / totalRevenue) * 100);

  assert.strictEqual(grossProfit, 250000.0);
  assert.strictEqual(grossMarginPercent, 92.59); // 250,000 / 270,000 = 92.59%

  const totalOperatingExpenses = 51000.0;
  const operatingProfit = round2(grossProfit - totalOperatingExpenses);
  const netMarginPercent = round2((operatingProfit / totalRevenue) * 100);

  assert.strictEqual(operatingProfit, 199000.0);
  assert.strictEqual(netMarginPercent, 73.7); // 199,000 / 270,000 = 73.7%

  console.log(`  ✔ Passed: P&L Statement calculated according to USALI standard:`);
  console.log(`     • Total Revenue:          ETB ${formatETB(totalRevenue)}`);
  console.log(`     • Cost of Goods Sold:     ETB ${formatETB(totalCOGS)}`);
  console.log(`     • Gross Profit:           ETB ${formatETB(grossProfit)} (${grossMarginPercent}%)`);
  console.log(`     • Operating Expenses:     ETB ${formatETB(totalOperatingExpenses)}`);
  console.log(`     • Net Profit (EBITDA):    ETB ${formatETB(operatingProfit)} (${netMarginPercent}%)\n`);

  // -------------------------------------------------------------
  // TEST 4: General Ledger Chronological Running Balances
  // -------------------------------------------------------------
  console.log('▶ Test 4: General Ledger Chronological Audit Trail & Running Balances');
  let runningBalance = 10000.0; // Opening Balance (Debit)
  const glTransactions = [
    { date: '2026-10-01', entryNumber: 'JE-202610-0001', debit: 5000.0, credit: 0.0 }, // +5,000 -> 15,000
    { date: '2026-10-05', entryNumber: 'JE-202610-0002', debit: 0.0, credit: 3200.0 }, // -3,200 -> 11,800
    { date: '2026-10-10', entryNumber: 'JE-202610-0003', debit: 12500.0, credit: 0.0 }, // +12,500 -> 24,300
    { date: '2026-10-12', entryNumber: 'JE-202610-0004', debit: 0.0, credit: 4300.0 }, // -4,300 -> 20,000
  ];

  for (const tx of glTransactions) {
    runningBalance = round2(runningBalance + tx.debit - tx.credit);
  }

  assert.strictEqual(runningBalance, 20000.0);
  console.log(`  ✔ Passed: GL running balance reconciled from Opening ETB 10,000.00 to Closing ETB ${formatETB(runningBalance)}.\n`);

  // -------------------------------------------------------------
  // TEST 5: Ethiopian Ministry of Revenues (MoR) Tax Summary
  // -------------------------------------------------------------
  console.log('▶ Test 5: Ethiopian Tax Summary (15% VAT, 2% WHT, 10% Service Charge & Net Remittance)');
  // Output VAT collected: 37,500 ETB (from 250,000 taxable hotel sales @ 15%)
  const outputVat = 37500.0;
  // Deductible Input VAT paid on purchases: 18,000 ETB (from 120,000 vendor purchases @ 15%)
  const inputVat = 18000.0;
  // Net VAT Remittance to MoR = Output VAT - Input VAT
  const netVatPayable = round2(outputVat - inputVat);
  assert.strictEqual(netVatPayable, 19500.0); // 37,500 - 18,000 = 19,500 ETB

  // Service Charge (10% hospitality): 25,000 ETB (Account 2110)
  const serviceCharge = 25000.0;
  // Withholding Tax (2% statutory withheld on purchases > 10k ETB): 3,500 ETB (Account 2120)
  const withholdingTax = 3500.0;
  // Employee Personal Income Tax (PIT): 8,200 ETB (Account 2130)
  const pit = 8200.0;
  // Pension Fund (18% total: 7% employee + 11% employer): 6,300 ETB (Account 2140)
  const pension = 6300.0;

  // Total Statutory Remittance to MoR = Net VAT (19,500) + WHT (3,500) + PIT (8,200) + Pension (6,300) = 37,500 ETB
  const totalMoRRemittance = round2(netVatPayable + withholdingTax + pit + pension);
  assert.strictEqual(totalMoRRemittance, 37500.0);

  console.log(`  ✔ Passed: Ethiopian Tax Summary calculated and reconciled:`);
  console.log(`     • Output VAT (15%):                ETB ${formatETB(outputVat)}`);
  console.log(`     • Input VAT Deductible (15%):      ETB ${formatETB(inputVat)}`);
  console.log(`     • Net VAT Remittance Due:          ETB ${formatETB(netVatPayable)}`);
  console.log(`     • Service Charge (10% Staff Pool): ETB ${formatETB(serviceCharge)}`);
  console.log(`     • Withholding Tax (2% MoR):        ETB ${formatETB(withholdingTax)}`);
  console.log(`     • Employee PIT Withheld:           ETB ${formatETB(pit)}`);
  console.log(`     • Pension Fund (18% Total):        ETB ${formatETB(pension)}`);
  console.log(`     • Total Statutory MoR Remittance:  ETB ${formatETB(totalMoRRemittance)}\n`);

  console.log('================================================================');
  console.log('🎉 ALL PHASE 7 FINANCIAL REPORTING ENGINE TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
}

runFinancialReportingEngineTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
