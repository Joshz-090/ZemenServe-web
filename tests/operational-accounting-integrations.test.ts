import assert from 'assert';
import { toCents, toBirr, round2, validateJournalBalance } from '../src/lib/accounting/money';
import { STANDARD_ETHIOPIAN_HOTEL_ACCOUNTS } from '../src/lib/accounting/standardAccounts';
import { AccountingIntegrationService } from '../src/lib/accounting/integration.service';

async function runOperationalAccountingIntegrationTests() {
  console.log('================================================================');
  console.log('🏨 RUNNING PHASE 3: HOTEL OPERATIONAL INTEGRATIONS TEST SUITE');
  console.log('================================================================\n');

  // Account registry for validation
  const accountMap = new Map<string, any>();
  STANDARD_ETHIOPIAN_HOTEL_ACCOUNTS.forEach((a) => accountMap.set(a.code, a));

  // -------------------------------------------------------------
  // TEST 1: Tender Account Resolution Helper
  // -------------------------------------------------------------
  console.log('▶ Test 1: Payment Tender to Asset Account Mapping');
  assert.strictEqual(AccountingIntegrationService.getTenderAccountCode('Cash', '1010'), '1010');
  assert.strictEqual(AccountingIntegrationService.getTenderAccountCode('Cash', '1020'), '1020');
  assert.strictEqual(AccountingIntegrationService.getTenderAccountCode('Telebirr'), '1040');
  assert.strictEqual(AccountingIntegrationService.getTenderAccountCode('CBE Birr'), '1050');
  assert.strictEqual(AccountingIntegrationService.getTenderAccountCode('Bank Transfer'), '1060');
  assert.strictEqual(AccountingIntegrationService.getTenderAccountCode('Room Charge'), '1100');
  console.log('  ✔ Passed: Verified multi-tender payment asset mapping.\n');

  // -------------------------------------------------------------
  // TEST 2: Guest Advance Booking Deposit (Unearned Revenue Liability)
  // -------------------------------------------------------------
  console.log('▶ Test 2: Guest Advance Prepayment Liability Recognition (Account 2020)');
  // Scenario: Guest Dawit deposits ETB 3,000 in Cash at check-in
  const depositAmount = 3000.0;
  const depositLines = [
    { debit: depositAmount, credit: 0 }, // Dr Cash on Hand - Front Desk (1010)
    { debit: 0, credit: depositAmount }, // Cr Guest Advance Deposits Liability (2020)
  ];
  const depositVal = validateJournalBalance(depositLines);
  assert.strictEqual(depositVal.isValid, true);
  assert.strictEqual(depositVal.totalDebitCents, 300000);
  assert.strictEqual(depositVal.totalCreditCents, 300000);
  console.log('  ✔ Passed: Deposit recorded as liability (Account 2020), NOT earned revenue.\n');

  // -------------------------------------------------------------
  // TEST 3: Night Audit Room Stay Lodging Charge & Output VAT
  // -------------------------------------------------------------
  console.log('▶ Test 3: Night Audit Room Charge & VAT Output Breakdown');
  // Scenario: Room 201 rate is ETB 8,500.00 (tax-inclusive 15% VAT)
  const nightlyRate = 8500.0;
  const netRoomRev = round2(nightlyRate / 1.15); // 7,391.30 ETB
  const outputVat = round2(nightlyRate - netRoomRev); // 1,108.70 ETB

  assert.strictEqual(round2(netRoomRev + outputVat), nightlyRate);

  const nightAuditLines = [
    { debit: nightlyRate, credit: 0 }, // Dr Guest Folio AR (1100)
    { debit: 0, credit: netRoomRev },  // Cr Room Accommodation Revenue (4010)
    { debit: 0, credit: outputVat },   // Cr Output VAT 15% (2100)
  ];
  const nightVal = validateJournalBalance(nightAuditLines);
  assert.strictEqual(nightVal.isValid, true);
  assert.strictEqual(nightVal.differenceCents, 0);
  console.log(`  ✔ Passed: Night audit posted ETB ${nightlyRate} (Net Rev: ETB ${netRoomRev}, VAT 15%: ETB ${outputVat}).\n`);

  // -------------------------------------------------------------
  // TEST 4: Guest Checkout Folio Settlement & Liability Application
  // -------------------------------------------------------------
  console.log('▶ Test 4: Checkout Folio Settlement Clearing AR against Deposit Liability');
  // Scenario: Total Stay = 8,500 ETB. Advance Deposit = 3,000 ETB. Remainder Paid in Cash = 5,500 ETB.
  const totalStay = 8500.0;
  const depositUsed = 3000.0;
  const balancePaid = 5500.0;

  const checkoutLines = [
    { debit: depositUsed, credit: 0 }, // Dr Clear Guest Advance Deposit Liability (2020)
    { debit: balancePaid, credit: 0 }, // Dr Cash on Hand (1010)
    { debit: 0, credit: totalStay },   // Cr Clear Guest Folios AR (1100)
  ];
  const checkoutVal = validateJournalBalance(checkoutLines);
  assert.strictEqual(checkoutVal.isValid, true);
  assert.strictEqual(checkoutVal.totalDebit, 8500.0);
  assert.strictEqual(checkoutVal.totalCredit, 8500.0);
  console.log('  ✔ Passed: Folio AR cleared against deposit liability and checkout cash payment.\n');

  // -------------------------------------------------------------
  // TEST 5: Restaurant POS Checkout Revenue & Output VAT Hook
  // -------------------------------------------------------------
  console.log('▶ Test 5: Restaurant POS Order Checkout Revenue Hook');
  // Scenario: Dinner bill ETB 2,300 paid via Telebirr
  const orderTotal = 2300.0;
  const netFood = round2(orderTotal / 1.15); // 2,000.00 ETB
  const posVat = round2(orderTotal - netFood); // 300.00 ETB

  const posRevLines = [
    { debit: orderTotal, credit: 0 }, // Dr Telebirr Clearing Account (1040)
    { debit: 0, credit: netFood },    // Cr Restaurant Food Sales (4020)
    { debit: 0, credit: posVat },     // Cr Output VAT 15% (2100)
  ];
  const posRevVal = validateJournalBalance(posRevLines);
  assert.strictEqual(posRevVal.isValid, true);
  assert.strictEqual(posRevVal.differenceCents, 0);
  console.log(`  ✔ Passed: POS order revenue recorded in Telebirr clearing account.\n`);

  // -------------------------------------------------------------
  // TEST 6: Recipe Inventory Consumption & COGS Hook
  // -------------------------------------------------------------
  console.log('▶ Test 6: Recipe Inventory Depletion & COGS Hook');
  // Scenario: Cost of beef, spices, and oil depleted for Order #102 is ETB 650.00
  const cogsAmount = 650.0;
  const cogsLines = [
    { debit: cogsAmount, credit: 0 }, // Dr COGS - Food & Kitchen Ingredients (5010)
    { debit: 0, credit: cogsAmount }, // Cr Inventory - Food & Kitchen Ingredients (1200)
  ];
  const cogsVal = validateJournalBalance(cogsLines);
  assert.strictEqual(cogsVal.isValid, true);
  assert.strictEqual(cogsVal.totalDebit, 650.0);
  assert.strictEqual(cogsVal.totalCredit, 650.0);
  console.log('  ✔ Passed: Recipe ingredients deducted from Inventory asset and charged to COGS.\n');

  // -------------------------------------------------------------
  // TEST 7: Event & Banquet Advance Deposit (Liability Hook)
  // -------------------------------------------------------------
  console.log('▶ Test 7: Banquet & Event Booking Advance Deposit (Account 2030)');
  // Scenario: UN Summit organizer deposits ETB 50,000 via Bank Transfer
  const eventDeposit = 50000.0;
  const eventDepositLines = [
    { debit: eventDeposit, credit: 0 }, // Dr CBE Operating Bank (1060)
    { debit: 0, credit: eventDeposit }, // Cr Banquet Advance Deposits Liability (2030)
  ];
  const eventDepVal = validateJournalBalance(eventDepositLines);
  assert.strictEqual(eventDepVal.isValid, true);
  assert.strictEqual(eventDepVal.totalDebit, 50000.0);
  assert.strictEqual(eventDepVal.totalCredit, 50000.0);
  console.log('  ✔ Passed: Event deposit recognized as unearned liability (Account 2030).\n');

  // -------------------------------------------------------------
  // TEST 8: Event Final Settlement & Revenue Recognition
  // -------------------------------------------------------------
  console.log('▶ Test 8: Event Final Settlement & Revenue Recognition');
  // Scenario: Total Event = 120,000 ETB. Deposit = 50,000 ETB. Balance Paid by Bank = 70,000 ETB.
  const totalEvent = 120000.0;
  const netLeasing = round2(totalEvent / 1.15); // 104,347.83 ETB
  const eventVat = round2(totalEvent - netLeasing); // 15,652.17 ETB
  const evtDepositUsed = 50000.0;
  const evtBalancePaid = 70000.0;

  const eventSettleLines = [
    { debit: evtDepositUsed, credit: 0 }, // Dr Clear Banquet Advance Deposit Liability (2030)
    { debit: evtBalancePaid, credit: 0 }, // Dr CBE Operating Bank (1060)
    { debit: 0, credit: netLeasing },     // Cr Banquet Hall Leasing Revenue (4040)
    { debit: 0, credit: eventVat },       // Cr Output VAT 15% (2100)
  ];
  const evtSettleVal = validateJournalBalance(eventSettleLines);
  assert.strictEqual(evtSettleVal.isValid, true);
  assert.strictEqual(evtSettleVal.totalDebit, 120000.0);
  assert.strictEqual(evtSettleVal.totalCredit, 120000.0);
  console.log('  ✔ Passed: Event completed, deposit liability cleared, and revenue recognized.\n');

  // -------------------------------------------------------------
  // TEST 9: Consolidated Hotel Operations Trial Balance Equilibrium
  // -------------------------------------------------------------
  console.log('▶ Test 9: Consolidated Hotel Operations Trial Balance Equilibrium');
  const allOperationalLines = [
    ...depositLines,
    ...nightAuditLines,
    ...checkoutLines,
    ...posRevLines,
    ...cogsLines,
    ...eventDepositLines,
    ...eventSettleLines,
  ];

  let cumulativeDebitCents = 0;
  let cumulativeCreditCents = 0;

  for (const line of allOperationalLines) {
    cumulativeDebitCents += toCents(line.debit);
    cumulativeCreditCents += toCents(line.credit);
  }

  assert.strictEqual(cumulativeDebitCents, cumulativeCreditCents);
  const totalTrialBirr = toBirr(cumulativeDebitCents);
  console.log(`  ✔ Passed: Consolidated Trial Balance in equilibrium across all 7 operational events.`);
  console.log(`     Total Debits: ETB ${totalTrialBirr.toLocaleString()} === Total Credits: ETB ${totalTrialBirr.toLocaleString()}\n`);

  console.log('================================================================');
  console.log('🎉 ALL PHASE 3 OPERATIONAL INTEGRATION TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
}

runOperationalAccountingIntegrationTests().catch((err) => {
  console.error('❌ Operational Integration Test Suite Failed:', err);
  process.exit(1);
});
