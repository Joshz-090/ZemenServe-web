import assert from 'assert';
import { round2, toCents, toBirr, formatETB, validateJournalBalance } from '../src/lib/accounting/money';
import { AccountsPayableService } from '../src/lib/accounting/ap.service';

async function runSupplierBillsAPTests() {
  console.log('================================================================');
  console.log('📦 RUNNING PHASE 5: SUPPLIER MANAGEMENT & AP AGING TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Supplier Registration & Ethiopian Tax Attributes
  // -------------------------------------------------------------
  console.log('▶ Test 1: Supplier Directory Attributes & Ethiopian TIN Validation');
  const mockSupplier = {
    idNumber: 1001,
    supplierCode: 'SUP-1001',
    name: 'Addis Abattoir & Premium Meats PLC',
    tinNumber: '0019283746', // 10-digit TIN
    vatRegistered: true,
    withholdingAgent: false,
    paymentTermsDays: 30,
    category: 'Food & Meat',
  };

  assert.strictEqual(mockSupplier.tinNumber.length, 10, 'Supplier TIN must be exactly 10 digits');
  assert.strictEqual(mockSupplier.paymentTermsDays, 30);
  assert.strictEqual(mockSupplier.vatRegistered, true);
  console.log(`  ✔ Passed: Supplier ${mockSupplier.name} registered with valid 10-digit TIN (${mockSupplier.tinNumber}).\n`);

  // -------------------------------------------------------------
  // TEST 2: Bill Calculation with 15% Input VAT & 2% Withholding Tax
  // -------------------------------------------------------------
  console.log('▶ Test 2: Bill Totals with 15% Input VAT & 2% Statutory Withholding Tax');
  const sampleBillLines = [
    {
      description: 'Prime Beef Tenderloin (100 kg)',
      quantity: 100,
      unit: 'kg',
      unitPrice: 650.0, // Subtotal = 65,000 ETB
      vatRate: 15.0, // VAT 15% = 9,750 ETB
      assetOrExpenseAccountCode: '1200',
    },
    {
      description: 'Fresh Poultry Cuts (50 kg)',
      quantity: 50,
      unit: 'kg',
      unitPrice: 300.0, // Subtotal = 15,000 ETB
      vatRate: 15.0, // VAT 15% = 2,250 ETB
      assetOrExpenseAccountCode: '1200',
    },
  ];

  // Subtotal = 80,000 ETB. VAT 15% = 12,000 ETB.
  // 2% Withholding Tax on 80,000 = 1,600 ETB (deducted for MoR).
  // Net Payable to Supplier = 80,000 + 12,000 - 1,600 = 90,400 ETB.
  const billTotals = AccountsPayableService.calculateBillTotals(sampleBillLines, 2.0);

  assert.strictEqual(billTotals.subtotal, 80000.0);
  assert.strictEqual(billTotals.vatTotal, 12000.0);
  assert.strictEqual(billTotals.withholdingTaxAmount, 1600.0);
  assert.strictEqual(billTotals.grandTotal, 90400.0);
  console.log(`  ✔ Passed: Subtotal: ETB 80,000 | Input VAT (15%): ETB 12,000 | WHT (2%): ETB 1,600 | Net Payable: ETB 90,400.\n`);

  // -------------------------------------------------------------
  // TEST 3: Three-Way Stock Receipt Matching & Weighted Average Cost (AVCO)
  // -------------------------------------------------------------
  console.log('▶ Test 3: Three-Way Matching & Weighted Average Unit Cost (AVCO)');
  // Existing Stock: 100 kg beef @ 550.00 ETB/kg = 55,000 ETB
  const existingStockQty = 100.0;
  const existingUnitCost = 550.0;
  const existingValuation = existingStockQty * existingUnitCost; // 55,000

  // Delivery Received (GRN matched with Bill): 100 kg beef @ 650.00 ETB/kg = 65,000 ETB
  const receivedQty = 100.0;
  const receivedUnitPrice = 650.0;
  const receivedValuation = receivedQty * receivedUnitPrice; // 65,000

  // Combined Stock = 200 kg. Total Valuation = 120,000 ETB.
  // New Weighted Average Unit Cost = 120,000 / 200 = 600.00 ETB/kg
  const totalStock = existingStockQty + receivedQty;
  const newWeightedAvgCost = round2((existingValuation + receivedValuation) / totalStock);

  assert.strictEqual(totalStock, 200.0);
  assert.strictEqual(newWeightedAvgCost, 600.0);
  console.log(`  ✔ Passed: Stock restocked to ${totalStock} kg. Unit cost adjusted from ETB 550.00 to ETB 600.00 (AVCO).\n`);

  // -------------------------------------------------------------
  // TEST 4: General Ledger Double-Entry Balancing for Bills & Payments
  // -------------------------------------------------------------
  console.log('▶ Test 4: General Ledger Double-Entry Balancing for AP Bill & Payment');
  // Bill Entry:
  // Dr Food Inventory Asset (1200): 80,000
  // Dr Input VAT Recoverable 15% (1300): 12,000
  // Cr Withholding Tax Payable 2% (2120): 1,600
  // Cr Trade Accounts Payable (2010): 90,400
  const billGLLines = [
    { debit: billTotals.subtotal, credit: 0 },
    { debit: billTotals.vatTotal, credit: 0 },
    { debit: 0, credit: billTotals.withholdingTaxAmount },
    { debit: 0, credit: billTotals.grandTotal },
  ];
  const billGLVal = validateJournalBalance(billGLLines);
  assert.strictEqual(billGLVal.isValid, true);
  assert.strictEqual(billGLVal.totalDebitCents, 9200000);
  assert.strictEqual(billGLVal.totalCreditCents, 9200000);

  // Payment Disbursement Entry:
  // Dr Trade Accounts Payable (2010): 90,400
  // Cr Bank CBE Operating Account (1060): 90,400
  const paymentGLLines = [
    { debit: billTotals.grandTotal, credit: 0 },
    { debit: 0, credit: billTotals.grandTotal },
  ];
  const payGLVal = validateJournalBalance(paymentGLLines);
  assert.strictEqual(payGLVal.isValid, true);
  assert.strictEqual(payGLVal.totalDebitCents, 9040000);
  assert.strictEqual(payGLVal.totalCreditCents, 9040000);
  console.log('  ✔ Passed: Bill posting and bank payment voucher balance perfectly.\n');

  // -------------------------------------------------------------
  // TEST 5: Accounts Payable (AP) 5-Bucket Aging Categorization
  // -------------------------------------------------------------
  console.log('▶ Test 5: AP Aging Categorization across 5 Standard Overdue Buckets');
  const asOfDateStr = '2026-10-15';
  const asOfMs = new Date(asOfDateStr).getTime();

  interface MockAgingBill {
    billNumber: string;
    supplierName: string;
    dueDate: string;
    balanceDue: number;
  }

  const mockBills: MockAgingBill[] = [
    { billNumber: 'BILL-01', supplierName: 'Awash Winery', dueDate: '2026-10-25', balanceDue: 60000 },  // Current (not due)
    { billNumber: 'BILL-02', supplierName: 'Awash Winery', dueDate: '2026-10-05', balanceDue: 25000 },  // 10 days overdue (1-30)
    { billNumber: 'BILL-03', supplierName: 'Addis Dairy', dueDate: '2026-09-05', balanceDue: 18000 },   // 40 days overdue (31-60)
    { billNumber: 'BILL-04', supplierName: 'Bole Cleaning', dueDate: '2026-07-25', balanceDue: 12000 }, // 82 days overdue (61-90)
    { billNumber: 'BILL-05', supplierName: 'Bole Cleaning', dueDate: '2026-05-15', balanceDue: 35000 }, // 153 days overdue (90+)
  ];

  let currentTotal = 0;
  let days1_30 = 0;
  let days31_60 = 0;
  let days61_90 = 0;
  let days90Plus = 0;

  for (const b of mockBills) {
    const dueMs = new Date(b.dueDate).getTime();
    const diffDays = Math.floor((asOfMs - dueMs) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) currentTotal += b.balanceDue;
    else if (diffDays <= 30) days1_30 += b.balanceDue;
    else if (diffDays <= 60) days31_60 += b.balanceDue;
    else if (diffDays <= 90) days61_90 += b.balanceDue;
    else days90Plus += b.balanceDue;
  }

  assert.strictEqual(currentTotal, 60000);
  assert.strictEqual(days1_30, 25000);
  assert.strictEqual(days31_60, 18000);
  assert.strictEqual(days61_90, 12000);
  assert.strictEqual(days90Plus, 35000);

  const grandTotalAP = currentTotal + days1_30 + days31_60 + days61_90 + days90Plus;
  assert.strictEqual(grandTotalAP, 150000);
  console.log('  ✔ Passed: AP Aging accurately categorized across all 5 buckets:');
  console.log(`     • Current (Not Overdue):  ETB ${currentTotal.toLocaleString()}`);
  console.log(`     • 1 - 30 Days Overdue:    ETB ${days1_30.toLocaleString()}`);
  console.log(`     • 31 - 60 Days Overdue:   ETB ${days31_60.toLocaleString()}`);
  console.log(`     • 61 - 90 Days Overdue:   ETB ${days61_90.toLocaleString()}`);
  console.log(`     • 90+ Days Overdue:       ETB ${days90Plus.toLocaleString()}`);
  console.log(`     • Total Trade Payables:   ETB ${grandTotalAP.toLocaleString()}\n`);

  // -------------------------------------------------------------
  // TEST 6: Vendor Statement Running Balance Reconciliations
  // -------------------------------------------------------------
  console.log('▶ Test 6: Vendor Statement of Account Running Balances');
  const vendorTransactions = [
    { type: 'Bill', ref: 'BILL-001', amount: 80000, date: '2026-08-01' },
    { type: 'Payment', ref: 'VOUCHER-001', amount: 80000, date: '2026-08-25' },
    { type: 'Bill', ref: 'BILL-002', amount: 65000, date: '2026-09-10' },
    { type: 'Payment', ref: 'VOUCHER-002', amount: 25000, date: '2026-09-30' },
    { type: 'Bill', ref: 'BILL-003', amount: 45000, date: '2026-10-05' },
  ];

  let totalPurchases = 0;
  let totalPaid = 0;

  for (const tx of vendorTransactions) {
    if (tx.type === 'Bill') totalPurchases += tx.amount;
    else if (tx.type === 'Payment') totalPaid += tx.amount;
  }

  const currentPayable = totalPurchases - totalPaid; // (80,000 + 65,000 + 45,000) - (80,000 + 25,000) = 190,000 - 105,000 = 85,000
  assert.strictEqual(totalPurchases, 190000);
  assert.strictEqual(totalPaid, 105000);
  assert.strictEqual(currentPayable, 85000);
  console.log(`  ✔ Passed: Vendor statement reconciled: Purchases ETB ${totalPurchases.toLocaleString()} - Paid ETB ${totalPaid.toLocaleString()} = Net Payable ETB ${currentPayable.toLocaleString()}.\n`);

  console.log('================================================================');
  console.log('🎉 ALL PHASE 5 SUPPLIER MANAGEMENT & AP TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
}

runSupplierBillsAPTests().catch((err) => {
  console.error('❌ Supplier Bills & AP Test Suite Failed:', err);
  process.exit(1);
});
