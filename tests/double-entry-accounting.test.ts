import assert from 'assert';
import {
  toCents,
  toBirr,
  validateJournalBalance,
  round2,
  formatETB,
} from '../src/lib/accounting/money';
import {
  STANDARD_ETHIOPIAN_HOTEL_ACCOUNTS,
} from '../src/lib/accounting/standardAccounts';

async function runDoubleEntryAccountingTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING PHASE 2: DOUBLE-ENTRY ACCOUNTING ENGINE TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Decimal-Safe Arithmetic & Floating Point Trap Prevention
  // -------------------------------------------------------------
  console.log('▶ Test 1: Decimal-Safe Arithmetic & Floating-Point Protection');
  // In IEEE 754 float: 0.1 + 0.2 === 0.30000000000000004
  const floatSum = 0.1 + 0.2;
  assert.notStrictEqual(floatSum, 0.3, 'Native JS float arithmetic exhibits precision anomaly');

  const centsSum = toCents(0.1) + toCents(0.2); // 10 + 20 = 30
  const safeBirr = toBirr(centsSum);
  assert.strictEqual(safeBirr, 0.3, 'Integer-cents math must yield exact 0.30 ETB');
  assert.strictEqual(toCents(2500.5), 250050);
  assert.strictEqual(toBirr(250050), 2500.5);
  assert.strictEqual(formatETB(1250000, true), 'ETB 12,500.00');
  console.log('  ✔ Passed: Float rounding bugs eliminated using integer cents conversion.\n');

  // -------------------------------------------------------------
  // TEST 2: Journal Balance Validator - Equal Debits & Credits
  // -------------------------------------------------------------
  console.log('▶ Test 2: Double-Entry Balance Validator (Equal Debits & Credits)');
  const balancedLines = [
    { debit: 3500.0, credit: 0 }, // Dr Cash - Front Desk (1010)
    { debit: 0, credit: 3500.0 }, // Cr Room Revenue (4010)
  ];
  const val1 = validateJournalBalance(balancedLines);
  assert.strictEqual(val1.isValid, true);
  assert.strictEqual(val1.totalDebit, 3500.0);
  assert.strictEqual(val1.totalCredit, 3500.0);
  assert.strictEqual(val1.differenceCents, 0);
  console.log('  ✔ Passed: 2-line balanced entry accepted (ETB 3,500.00).\n');

  // -------------------------------------------------------------
  // TEST 3: Multi-Legged Compound Journal Entry Validation
  // E.g. Room Night Bill: Dr Guest Folio AR = 4600 | Cr Room Rev = 4000 | Cr VAT = 600
  // -------------------------------------------------------------
  console.log('▶ Test 3: Compound Multi-Legged Journal Entry (Split Revenue & Tax)');
  const compoundLines = [
    { debit: 4600.0, credit: 0 }, // Dr AR Guest Folio (1100)
    { debit: 0, credit: 4000.0 }, // Cr Room Revenue (4010)
    { debit: 0, credit: 600.0 },  // Cr Output VAT 15% (2100)
  ];
  const valCompound = validateJournalBalance(compoundLines);
  assert.strictEqual(valCompound.isValid, true);
  assert.strictEqual(valCompound.totalDebit, 4600.0);
  assert.strictEqual(valCompound.totalCredit, 4600.0);
  assert.strictEqual(valCompound.totalDebitCents, 460000);
  assert.strictEqual(valCompound.totalCreditCents, 460000);
  console.log('  ✔ Passed: Compound entry balanced with exact integer cents.\n');

  // -------------------------------------------------------------
  // TEST 4: Unbalanced Journal Rejection (Fundamental Accounting Rule)
  // -------------------------------------------------------------
  console.log('▶ Test 4: Rejection of Unbalanced Journal Entry');
  const unbalancedLines = [
    { debit: 5000.0, credit: 0 },
    { debit: 0, credit: 4999.5 }, // 50 cents discrepancy
  ];
  const valUnbalanced = validateJournalBalance(unbalancedLines);
  assert.strictEqual(valUnbalanced.isValid, false);
  assert.strictEqual(valUnbalanced.differenceCents, 50); // 50 cents
  assert.ok(valUnbalanced.errorMessage?.includes('Unbalanced journal entry'));
  console.log(`  ✔ Passed: Correctly rejected with: "${valUnbalanced.errorMessage}"\n`);

  // -------------------------------------------------------------
  // TEST 5: Single-Sided & Zero-Value Entry Rejection
  // -------------------------------------------------------------
  console.log('▶ Test 5: Rejection of Single-Sided & Zero-Total Entries');
  const singleLine = [{ debit: 1000.0, credit: 0 }];
  const valSingle = validateJournalBalance(singleLine);
  assert.strictEqual(valSingle.isValid, false);
  assert.ok(valSingle.errorMessage?.includes('at least two lines'));

  const zeroLines = [
    { debit: 0, credit: 0 },
    { debit: 0, credit: 0 },
  ];
  const valZero = validateJournalBalance(zeroLines);
  assert.strictEqual(valZero.isValid, false);
  assert.ok(valZero.errorMessage?.includes('cannot be zero'));
  console.log('  ✔ Passed: Single-line and zero-amount entries strictly prohibited.\n');

  // -------------------------------------------------------------
  // TEST 6: Ethiopian Chart of Accounts Standards Verification
  // -------------------------------------------------------------
  console.log('▶ Test 6: Ethiopian Hotel Chart of Accounts Structure & Codes');
  assert.ok(STANDARD_ETHIOPIAN_HOTEL_ACCOUNTS.length >= 30, 'Must have at least 30 core accounts');

  const accountCodeMap = new Map<string, any>();
  for (const acc of STANDARD_ETHIOPIAN_HOTEL_ACCOUNTS) {
    assert.strictEqual(accountCodeMap.has(acc.code), false, `Account code ${acc.code} must be unique`);
    accountCodeMap.set(acc.code, acc);
  }

  // Verify key operational hotel accounts exist
  assert.ok(accountCodeMap.has('1010'), '1010 Front Desk Cash Drawer must exist');
  assert.ok(accountCodeMap.has('1040'), '1040 Telebirr Clearing Account must exist');
  assert.ok(accountCodeMap.has('1060'), '1060 CBE Operating Bank Account must exist');
  assert.ok(accountCodeMap.has('1100'), '1100 Guest Folio AR must exist');
  assert.ok(accountCodeMap.has('1200'), '1200 Kitchen Inventory Asset must exist');
  assert.ok(accountCodeMap.has('2020'), '2020 Guest Advance Prepayment Liability must exist');
  assert.ok(accountCodeMap.has('2100'), '2100 Output VAT 15% must exist');
  assert.ok(accountCodeMap.has('2110'), '2110 Service Charge 10% must exist');
  assert.ok(accountCodeMap.has('2140'), '2140 Employee Pension Scheme (POESSA 18%) must exist');
  assert.ok(accountCodeMap.has('4010'), '4010 Room Revenue must exist');
  assert.ok(accountCodeMap.has('4020'), '4020 Dining Food Revenue must exist');
  assert.ok(accountCodeMap.has('5010'), '5010 Kitchen COGS must exist');
  console.log(`  ✔ Passed: Verified all ${STANDARD_ETHIOPIAN_HOTEL_ACCOUNTS.length} standard Ethiopian accounts.\n`);

  // -------------------------------------------------------------
  // TEST 7: Controlled Reversal Simulation (Inverted Debits & Credits)
  // -------------------------------------------------------------
  console.log('▶ Test 7: Controlled Journal Entry Reversal Workflow');
  interface MockJournal {
    entryNumber: string;
    status: string;
    isReversed: boolean;
    reversedByEntryNumber?: string;
    lines: { accountCode: string; debit: number; credit: number }[];
  }

  const originalJournal: MockJournal = {
    entryNumber: 'JE-2026-00001',
    status: 'Posted',
    isReversed: false,
    lines: [
      { accountCode: '1010', debit: 2500, credit: 0 },
      { accountCode: '4010', debit: 0, credit: 2500 },
    ],
  };

  function reverseMockJournal(journal: MockJournal, reversalNumber: string): MockJournal {
    assert.strictEqual(journal.status, 'Posted', 'Can only reverse posted journal entries');
    assert.strictEqual(journal.isReversed, false, 'Cannot reverse an already reversed journal');

    journal.isReversed = true;
    journal.reversedByEntryNumber = reversalNumber;

    const invertedLines = journal.lines.map((l) => ({
      accountCode: l.accountCode,
      debit: l.credit, // Inverted
      credit: l.debit, // Inverted
    }));

    const val = validateJournalBalance(invertedLines);
    assert.strictEqual(val.isValid, true, 'Reversal entry must balance');

    return {
      entryNumber: reversalNumber,
      status: 'Posted',
      isReversed: false,
      lines: invertedLines,
    };
  }

  const reversalJournal = reverseMockJournal(originalJournal, 'JE-2026-00002');
  assert.strictEqual(originalJournal.isReversed, true);
  assert.strictEqual(originalJournal.reversedByEntryNumber, 'JE-2026-00002');
  assert.strictEqual(reversalJournal.lines[0].accountCode, '1010');
  assert.strictEqual(reversalJournal.lines[0].credit, 2500, 'Original debit became credit in reversal');
  assert.strictEqual(reversalJournal.lines[1].accountCode, '4010');
  assert.strictEqual(reversalJournal.lines[1].debit, 2500, 'Original credit became debit in reversal');
  console.log('  ✔ Passed: Reversal correctly inverted entries and preserved audit trail.\n');

  // -------------------------------------------------------------
  // TEST 8: Real-Time Trial Balance Equilibrium Simulation
  // -------------------------------------------------------------
  console.log('▶ Test 8: Real-Time Trial Balance Aggregate Reconciliation');
  // Simulate 3 distinct hotel operational transactions:
  // 1. Guest Check-in Advance Deposit (Cash received):
  //    Dr Cash (1010): 5,000 | Cr Guest Advance Deposit Liability (2020): 5,000
  // 2. Room Service Dining POS Settlement (Telebirr):
  //    Dr Telebirr (1040): 1,150 | Cr Food Sales (4020): 1,000 | Cr Output VAT (2100): 150
  // 3. Kitchen Inventory Consumption (COGS):
  //    Dr Kitchen COGS (5010): 400 | Cr Food Inventory Asset (1200): 400

  const allLedgerLines = [
    // Tx 1
    { code: '1010', debit: 5000, credit: 0 },
    { code: '2020', debit: 0, credit: 5000 },
    // Tx 2
    { code: '1040', debit: 1150, credit: 0 },
    { code: '4020', debit: 0, credit: 1000 },
    { code: '2100', debit: 0, credit: 150 },
    // Tx 3
    { code: '5010', debit: 400, credit: 0 },
    { code: '1200', debit: 0, credit: 400 },
  ];

  let totalDebitsTrial = 0;
  let totalCreditsTrial = 0;

  for (const line of allLedgerLines) {
    totalDebitsTrial += toCents(line.debit);
    totalCreditsTrial += toCents(line.credit);
  }

  assert.strictEqual(totalDebitsTrial, totalCreditsTrial);
  assert.strictEqual(toBirr(totalDebitsTrial), 6550.0);
  assert.strictEqual(toBirr(totalCreditsTrial), 6550.0);
  console.log(`  ✔ Passed: Multi-transaction Trial Balance in exact equilibrium (ETB 6,550.00 Dr = ETB 6,550.00 Cr).\n`);

  // -------------------------------------------------------------
  // TEST 9: Accounting Period Closed Protection
  // -------------------------------------------------------------
  console.log('▶ Test 9: Accounting Period Lockout Guard');
  const closedPeriods = [
    { periodCode: 'FY2026-M01', startDate: '2026-01-01', endDate: '2026-01-31', isClosed: true },
    { periodCode: 'FY2026-M02', startDate: '2026-02-01', endDate: '2026-02-28', isClosed: false },
  ];

  function verifyDatePeriodOpen(targetDate: string): boolean {
    const closed = closedPeriods.find(
      (p) => p.isClosed && targetDate >= p.startDate && targetDate <= p.endDate
    );
    if (closed) {
      throw new Error(`Period ${closed.periodCode} is closed. Postings blocked on ${targetDate}.`);
    }
    return true;
  }

  // Attempt to post on Jan 15 (Closed)
  let periodErrorCaught = false;
  try {
    verifyDatePeriodOpen('2026-01-15');
  } catch (err: any) {
    periodErrorCaught = true;
    assert.ok(err.message.includes('closed'));
  }
  assert.strictEqual(periodErrorCaught, true, 'Must block posting in closed Jan period');

  // Post on Feb 10 (Open)
  assert.strictEqual(verifyDatePeriodOpen('2026-02-10'), true, 'Must permit posting in open Feb period');
  console.log('  ✔ Passed: Closed periods block postings; open periods permit postings.\n');

  // -------------------------------------------------------------
  // TEST 10: Idempotency & Duplicate Posting Prevention
  // -------------------------------------------------------------
  console.log('▶ Test 10: Idempotency Key & Duplicate Transaction Prevention');
  const processedKeys = new Set<string>();

  function registerTransaction(sourceModule: string, refId: string) {
    const key = `${sourceModule}:${refId}`;
    if (processedKeys.has(key)) {
      return { success: false, status: 409, error: `Duplicate transaction for ${key}` };
    }
    processedKeys.add(key);
    return { success: true, status: 201 };
  }

  const res1 = registerTransaction('Rooms', 'folio-checkin-101');
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.status, 201);

  // Re-try duplicate event
  const res2 = registerTransaction('Rooms', 'folio-checkin-101');
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.status, 409);
  console.log('  ✔ Passed: Duplicate posting attempt rejected with 409 Conflict.\n');

  console.log('================================================================');
  console.log('🎉 ALL PHASE 2 DOUBLE-ENTRY ACCOUNTING TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
}

runDoubleEntryAccountingTests().catch((err) => {
  console.error('❌ Double-Entry Test Suite Failed:', err);
  process.exit(1);
});
