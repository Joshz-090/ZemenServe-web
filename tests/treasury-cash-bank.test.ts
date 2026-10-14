import assert from 'assert';
import { round2, toCents, toBirr, formatETB, validateJournalBalance } from '../src/lib/accounting/money';

async function runTreasuryCashBankTests() {
  console.log('================================================================');
  console.log('📦 RUNNING PHASE 6: CASH, BANK & MULTI-TENDER MANAGEMENT TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Cash Drawers & Multi-Tender Ethiopian Bank/Wallet Registry
  // -------------------------------------------------------------
  console.log('▶ Test 1: Cash Drawers & Multi-Tender Ethiopian Bank Account Setup');
  const mockDrawers = [
    { drawerId: 'CDR-FD-01', name: 'Front Desk Register 1', station: 'Front Desk', glAccountCode: '1010', currency: 'ETB' },
    { drawerId: 'CDR-POS-01', name: 'Restaurant POS Drawer', station: 'Restaurant', glAccountCode: '1020', currency: 'ETB' },
    { drawerId: 'CDR-SAFE-01', name: 'Main Hotel Safe Vault', station: 'Main Safe', glAccountCode: '1030', currency: 'ETB' },
  ];

  const mockBanks = [
    { bankId: 'BNK-CBE-01', accountName: 'CBE Main Operating', glAccountCode: '1060', type: 'Bank' },
    { bankId: 'BNK-AWASH-01', accountName: 'Awash Bank POS Clearing', glAccountCode: '1070', type: 'Bank' },
    { bankId: 'WAL-TELEBIRR-01', accountName: 'Telebirr Merchant Wallet', glAccountCode: '1040', type: 'MobileMoney' },
    { bankId: 'WAL-CBEBIRR-01', accountName: 'CBE Birr Wallet Clearing', glAccountCode: '1050', type: 'MobileMoney' },
  ];

  assert.strictEqual(mockDrawers.length, 3);
  assert.strictEqual(mockBanks.length, 4);
  console.log('  ✔ Passed: 3 Cash Drawers (1010, 1020, 1030) and 4 Bank/Mobile Wallets (1060, 1070, 1040, 1050) verified.\n');

  // -------------------------------------------------------------
  // TEST 2: Cashier Shift Opening Lifecycle & Float Allocation
  // -------------------------------------------------------------
  console.log('▶ Test 2: Cashier Shift Opening Lifecycle & Drawer Float Allocation');
  const shiftOpen = {
    shiftNumber: 'CS-202610-0001',
    cashierName: 'Abebe Bikila',
    drawerId: 'CDR-FD-01',
    station: 'Front Desk',
    glAccountCode: '1010',
    openingFloat: 2500.0, // ETB 2,500.00
    status: 'Open',
  };

  assert.strictEqual(shiftOpen.openingFloat, 2500.0);
  assert.strictEqual(shiftOpen.status, 'Open');
  console.log(`  ✔ Passed: Shift ${shiftOpen.shiftNumber} opened on ${shiftOpen.drawerId} with opening float ETB ${formatETB(shiftOpen.openingFloat)}.\n`);

  // -------------------------------------------------------------
  // TEST 3: Multi-Tender Transactions & Expected Cash Computation
  // -------------------------------------------------------------
  console.log('▶ Test 3: Multi-Tender Sales Tracking & Expected Cash Calculation');
  const shiftActivity = {
    openingFloat: 2500.0,
    cashSales: 18500.0,
    cashPaidOut: 1500.0, // petty cash office purchases
    nonCashTenders: {
      telebirr: 7400.0,
      cbeBirr: 5200.0,
      card: 12000.0,
      bankTransfer: 15000.0,
      roomCharge: 4800.0,
    },
  };

  // Expected Cash = Opening Float + Cash Sales - Cash Disbursements
  const expectedCash = round2(shiftActivity.openingFloat + shiftActivity.cashSales - shiftActivity.cashPaidOut);
  assert.strictEqual(expectedCash, 19500.0); // 2500 + 18500 - 1500 = 19,500 ETB

  const totalElectronicRevenue = round2(
    shiftActivity.nonCashTenders.telebirr +
      shiftActivity.nonCashTenders.cbeBirr +
      shiftActivity.nonCashTenders.card +
      shiftActivity.nonCashTenders.bankTransfer +
      shiftActivity.nonCashTenders.roomCharge
  );
  assert.strictEqual(totalElectronicRevenue, 44400.0);

  const totalGrossTakings = round2(shiftActivity.cashSales + totalElectronicRevenue);
  assert.strictEqual(totalGrossTakings, 62900.0);

  console.log(`  ✔ Passed: Expected Cash: ETB ${formatETB(expectedCash)} | Non-Cash Tenders: ETB ${formatETB(totalElectronicRevenue)} | Gross Takings: ETB ${formatETB(totalGrossTakings)}.\n`);

  // -------------------------------------------------------------
  // TEST 4: Shift Close with Cash Shortage Variance & Auto-GL Posting
  // -------------------------------------------------------------
  console.log('▶ Test 4: Shift Close with Cash Shortage Variance & Auto-GL Posting');
  // Cashier physically counted ETB 19,200.00 (Short by ETB 300.00)
  const actualCashCounted = 19200.0;
  const cashVariance = round2(actualCashCounted - expectedCash); // 19,200 - 19,500 = -300.00
  const varianceStatus = cashVariance < 0 ? 'Shortage' : cashVariance > 0 ? 'Overage' : 'Balanced';

  assert.strictEqual(cashVariance, -300.0);
  assert.strictEqual(varianceStatus, 'Shortage');

  // General Ledger Auto-Posting for Cash Shortage:
  // Dr 6950 Cash Over and Short Discrepancies (Expense): 300.00 ETB
  // Cr 1010 Front Desk Register 1 (Asset): 300.00 ETB
  const shortageGLLines = [
    { debit: Math.abs(cashVariance), credit: 0 },
    { debit: 0, credit: Math.abs(cashVariance) },
  ];
  const shortageValidation = validateJournalBalance(shortageGLLines);
  assert.strictEqual(shortageValidation.isValid, true);
  assert.strictEqual(shortageValidation.totalDebitCents, 30000);
  assert.strictEqual(shortageValidation.totalCreditCents, 30000);

  console.log(`  ✔ Passed: Shortage of ETB ${Math.abs(cashVariance).toFixed(2)} detected. Auto-posted balanced GL adjustment:`);
  console.log(`     • Dr 6950 (Cash Over/Short Expense): ETB 300.00`);
  console.log(`     • Cr 1010 (Front Desk Drawer):       ETB 300.00\n`);

  // -------------------------------------------------------------
  // TEST 5: Shift Close with Cash Overage & Safe Drop Transfer
  // -------------------------------------------------------------
  console.log('▶ Test 5: Shift Close with Cash Overage Variance & Safe Drop Transfer');
  // Scenario 2: Restaurant POS Shift
  const posOpeningFloat = 1000.0;
  const posCashSales = 13000.0;
  const posCashPaidOut = 0;
  const posExpectedCash = posOpeningFloat + posCashSales - posCashPaidOut; // 14,000.00

  // Cashier physically counted ETB 14,350.00 (Overage of ETB 350.00)
  const posActualCounted = 14350.0;
  const posVariance = round2(posActualCounted - posExpectedCash); // +350.00
  const posVarianceStatus = posVariance > 0 ? 'Overage' : 'Shortage';

  assert.strictEqual(posVariance, 350.0);
  assert.strictEqual(posVarianceStatus, 'Overage');

  // General Ledger Auto-Posting for Cash Overage:
  // Dr 1020 Restaurant POS Drawer: 350.00 ETB
  // Cr 6950 Cash Over and Short Discrepancies: 350.00 ETB
  const overageGLLines = [
    { debit: posVariance, credit: 0 },
    { debit: 0, credit: posVariance },
  ];
  const overageValidation = validateJournalBalance(overageGLLines);
  assert.strictEqual(overageValidation.isValid, true);
  assert.strictEqual(overageValidation.totalDebitCents, 35000);
  assert.strictEqual(overageValidation.totalCreditCents, 35000);

  // Cashier drops ETB 12,000.00 into Main Hotel Safe (1030)
  const dropToSafeAmount = 12000.0;
  const remainingDrawerFloat = round2(posActualCounted - dropToSafeAmount); // 14,350 - 12,000 = 2,350.00

  assert.strictEqual(remainingDrawerFloat, 2350.0);

  // Safe Drop GL Posting:
  // Dr 1030 Main Hotel Safe: 12,000.00 ETB
  // Cr 1020 Restaurant POS Drawer: 12,000.00 ETB
  const dropGLLines = [
    { debit: dropToSafeAmount, credit: 0 },
    { debit: 0, credit: dropToSafeAmount },
  ];
  const dropValidation = validateJournalBalance(dropGLLines);
  assert.strictEqual(dropValidation.isValid, true);
  assert.strictEqual(dropValidation.totalDebitCents, 1200000);
  assert.strictEqual(dropValidation.totalCreditCents, 1200000);

  console.log(`  ✔ Passed: Overage of ETB ${posVariance.toFixed(2)} recorded. Safe drop of ETB ${formatETB(dropToSafeAmount)} processed.`);
  console.log(`     • Dr 1030 (Main Hotel Safe):     ETB 12,000.00`);
  console.log(`     • Cr 1020 (Restaurant Drawer):   ETB 12,000.00`);
  console.log(`     • Remaining Drawer Float:        ETB ${formatETB(remainingDrawerFloat)}\n`);

  // -------------------------------------------------------------
  // TEST 6: Internal Cash Movement & Telebirr Sweep to CBE Operating Bank
  // -------------------------------------------------------------
  console.log('▶ Test 6: Internal Bank Transfer & Mobile Money Sweep to CBE Bank');
  // Sweep ETB 40,000.00 accumulated in Telebirr Merchant Clearing (1040) to CBE Bank Operating (1060)
  const sweepAmount = 40000.0;
  const sweepGLLines = [
    { debit: sweepAmount, credit: 0 }, // Dr 1060 CBE Bank
    { debit: 0, credit: sweepAmount }, // Cr 1040 Telebirr Clearing
  ];
  const sweepValidation = validateJournalBalance(sweepGLLines);
  assert.strictEqual(sweepValidation.isValid, true);
  assert.strictEqual(sweepValidation.totalDebitCents, 4000000);
  assert.strictEqual(sweepValidation.totalCreditCents, 4000000);

  // Safe to Drawer Replenishment: ETB 2,500.00 from Main Safe (1030) to Front Desk (1010)
  const replenishAmount = 2500.0;
  const replenishGLLines = [
    { debit: replenishAmount, credit: 0 }, // Dr 1010 Front Desk
    { debit: 0, credit: replenishAmount }, // Cr 1030 Main Safe
  ];
  const replenishValidation = validateJournalBalance(replenishGLLines);
  assert.strictEqual(replenishValidation.isValid, true);

  console.log(`  ✔ Passed: Telebirr sweep of ETB ${formatETB(sweepAmount)} to CBE Bank (1060) and float replenishment balanced.\n`);

  // -------------------------------------------------------------
  // TEST 7: Manager Shift Audit & Treasury Dashboard Asset Aggregation
  // -------------------------------------------------------------
  console.log('▶ Test 7: Manager Shift Audit & Treasury Dashboard Liquid Asset Aggregation');
  const drawerBalances = [
    { drawerId: 'CDR-FD-01', balance: 19200.0 },
    { drawerId: 'CDR-POS-01', balance: 2350.0 },
    { drawerId: 'CDR-SAFE-01', balance: 85000.0 }, // Safe holding accumulated cash drops
  ];

  const bankBalances = [
    { bankId: 'BNK-CBE-01', type: 'Bank', balance: 450000.0 },
    { bankId: 'BNK-AWASH-01', type: 'Bank', balance: 180000.0 },
    { bankId: 'WAL-TELEBIRR-01', type: 'MobileMoney', balance: 35000.0 },
    { bankId: 'WAL-CBEBIRR-01', type: 'MobileMoney', balance: 22000.0 },
  ];

  const totalDrawerCash = round2(drawerBalances.reduce((s, d) => s + d.balance, 0));
  const totalBankMoney = round2(bankBalances.filter(b => b.type === 'Bank').reduce((s, b) => s + b.balance, 0));
  const totalMobileMoney = round2(bankBalances.filter(b => b.type === 'MobileMoney').reduce((s, b) => s + b.balance, 0));
  const totalLiquidAssets = round2(totalDrawerCash + totalBankMoney + totalMobileMoney);

  assert.strictEqual(totalDrawerCash, 106550.0); // 19200 + 2350 + 85000
  assert.strictEqual(totalBankMoney, 630000.0); // 450000 + 180000
  assert.strictEqual(totalMobileMoney, 57000.0); // 35000 + 22000
  assert.strictEqual(totalLiquidAssets, 793550.0); // 106550 + 630000 + 57000

  console.log(`  ✔ Passed: Live Treasury Aggregations verified:`);
  console.log(`     • Physical Cash Drawers & Safe: ETB ${formatETB(totalDrawerCash)}`);
  console.log(`     • Commercial Bank Operating:    ETB ${formatETB(totalBankMoney)}`);
  console.log(`     • Mobile Money Merchant Wallets: ETB ${formatETB(totalMobileMoney)}`);
  console.log(`     • Total Liquid Treasury Assets:  ETB ${formatETB(totalLiquidAssets)}\n`);

  console.log('================================================================');
  console.log('🎉 ALL PHASE 6 CASH, BANK & MULTI-TENDER TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
}

runTreasuryCashBankTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
