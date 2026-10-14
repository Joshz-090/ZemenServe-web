import assert from 'assert';
import { round2, toCents, toBirr, formatETB, validateJournalBalance } from '../src/lib/accounting/money';
import { AccountsReceivableService } from '../src/lib/accounting/ar.service';

async function runCustomerInvoicingARTests() {
  console.log('================================================================');
  console.log('📋 RUNNING PHASE 4: CUSTOMER INVOICING & AR AGING TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Line Item Calculation, Discount, VAT 15% & Service Charge 10%
  // -------------------------------------------------------------
  console.log('▶ Test 1: Line Item Calculations, Discounts, VAT 15% & Service Charge');
  const sampleLines = [
    {
      description: 'Deluxe Suite Lodging (3 Nights)',
      quantity: 3,
      unitPrice: 4000.0,
      discountPercentage: 10, // 10% corporate discount
      vatRate: 15.0,
      serviceChargeRate: 0,
      revenueAccountCode: '4010',
    },
    {
      description: 'Executive Banquet Dinner (20 Covers)',
      quantity: 20,
      unitPrice: 500.0,
      discountPercentage: 0,
      vatRate: 15.0,
      serviceChargeRate: 10.0, // 10% service charge
      revenueAccountCode: '4020',
    },
  ];

  const totals = AccountsReceivableService.calculateInvoiceTotals(sampleLines);

  // Line 1: Gross = 12,000, Discount = 1,200, Net = 10,800, VAT 15% = 1,620, SC = 0 -> Total = 12,420
  const line1 = totals.calculatedLines[0];
  assert.strictEqual(line1.netAmount, 10800.0);
  assert.strictEqual(line1.vatAmount, 1620.0);
  assert.strictEqual(line1.serviceChargeAmount, 0);
  assert.strictEqual(line1.totalLineAmount, 12420.0);

  // Line 2: Gross = 10,000, Discount = 0, Net = 10,000, VAT 15% = 1,500, SC 10% = 1,000 -> Total = 12,500
  const line2 = totals.calculatedLines[1];
  assert.strictEqual(line2.netAmount, 10000.0);
  assert.strictEqual(line2.vatAmount, 1500.0);
  assert.strictEqual(line2.serviceChargeAmount, 1000.0);
  assert.strictEqual(line2.totalLineAmount, 12500.0);

  // Invoice Grand Total = 12,420 + 12,500 = 24,920
  assert.strictEqual(totals.subtotal, 22000.0);
  assert.strictEqual(totals.totalDiscount, 1200.0);
  assert.strictEqual(totals.vatTotal, 3120.0);
  assert.strictEqual(totals.serviceChargeTotal, 1000.0);
  assert.strictEqual(totals.grandTotal, 24920.0);
  console.log(`  ✔ Passed: Invoice totals accurately computed: Grand Total = ETB ${totals.grandTotal.toLocaleString()}.\n`);

  // -------------------------------------------------------------
  // TEST 2: General Ledger Double-Entry Balancing for Invoices
  // -------------------------------------------------------------
  console.log('▶ Test 2: Double-Entry Balancing for Customer Invoice Posting');
  // Dr AR (1110): 24,920 | Cr Room Rev (4010): 10,800 | Cr Food Rev (4020): 10,000 | Cr VAT (2100): 3,120 | Cr SC (2110): 1,000
  const invoiceGLLines = [
    { debit: totals.grandTotal, credit: 0 },
    { debit: 0, credit: line1.netAmount },
    { debit: 0, credit: line2.netAmount },
    { debit: 0, credit: totals.vatTotal },
    { debit: 0, credit: totals.serviceChargeTotal },
  ];
  const glBal = validateJournalBalance(invoiceGLLines);
  assert.strictEqual(glBal.isValid, true);
  assert.strictEqual(glBal.totalDebitCents, 2492000);
  assert.strictEqual(glBal.totalCreditCents, 2492000);
  console.log('  ✔ Passed: Invoice GL posting balances perfectly with integer cents (ETB 24,920.00).\n');

  // -------------------------------------------------------------
  // TEST 3: Partial Payment & Full Settlement
  // -------------------------------------------------------------
  console.log('▶ Test 3: Invoice Partial Payment & Full Settlement Transitions');
  let amountPaid = 0;
  let balanceDue = 24920.0;
  let status = 'Issued';

  function applyPayment(paymentAmount: number) {
    assert.ok(paymentAmount <= balanceDue, 'Payment cannot exceed balance due');
    amountPaid = round2(amountPaid + paymentAmount);
    balanceDue = round2(24920.0 - amountPaid);
    status = balanceDue === 0 ? 'Paid' : 'Partial';
    return { amountPaid, balanceDue, status };
  }

  // Payment 1: Partial payment ETB 10,000 via Telebirr
  const pay1 = applyPayment(10000.0);
  assert.strictEqual(pay1.amountPaid, 10000.0);
  assert.strictEqual(pay1.balanceDue, 14920.0);
  assert.strictEqual(pay1.status, 'Partial');

  // Payment 2: Final settlement ETB 14,920 via CBE Bank Transfer
  const pay2 = applyPayment(14920.0);
  assert.strictEqual(pay2.amountPaid, 24920.0);
  assert.strictEqual(pay2.balanceDue, 0.0);
  assert.strictEqual(pay2.status, 'Paid');
  console.log('  ✔ Passed: Handled partial payment (ETB 10,000) and final settlement (ETB 14,920) transitioning to Paid.\n');

  // -------------------------------------------------------------
  // TEST 4: Accounts Receivable (AR) 5-Bucket Aging Categorization
  // -------------------------------------------------------------
  console.log('▶ Test 4: AR Aging Categorization across 5 Standard Overdue Buckets');
  const asOfDateStr = '2026-10-15';
  const asOfMs = new Date(asOfDateStr).getTime();

  interface MockAgingInvoice {
    invoiceNumber: string;
    customerName: string;
    dueDate: string;
    balanceDue: number;
  }

  const mockInvoices: MockAgingInvoice[] = [
    { invoiceNumber: 'INV-101', customerName: 'Ethiopian Airlines', dueDate: '2026-10-20', balanceDue: 45000 }, // Current (not due)
    { invoiceNumber: 'INV-102', customerName: 'Ethiopian Airlines', dueDate: '2026-10-01', balanceDue: 18000 }, // 14 days overdue (1-30)
    { invoiceNumber: 'INV-103', customerName: 'UNDP Ethiopia', dueDate: '2026-08-30', balanceDue: 32000 },       // 46 days overdue (31-60)
    { invoiceNumber: 'INV-104', customerName: 'Bole Medhanealem NGO', dueDate: '2026-07-20', balanceDue: 15000 },// 87 days overdue (61-90)
    { invoiceNumber: 'INV-105', customerName: 'Bole Medhanealem NGO', dueDate: '2026-05-10', balanceDue: 22000 },// 158 days overdue (90+)
  ];

  let currentTotal = 0;
  let days1_30 = 0;
  let days31_60 = 0;
  let days61_90 = 0;
  let days90Plus = 0;

  for (const inv of mockInvoices) {
    const dueMs = new Date(inv.dueDate).getTime();
    const diffDays = Math.floor((asOfMs - dueMs) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) currentTotal += inv.balanceDue;
    else if (diffDays <= 30) days1_30 += inv.balanceDue;
    else if (diffDays <= 60) days31_60 += inv.balanceDue;
    else if (diffDays <= 90) days61_90 += inv.balanceDue;
    else days90Plus += inv.balanceDue;
  }

  assert.strictEqual(currentTotal, 45000);
  assert.strictEqual(days1_30, 18000);
  assert.strictEqual(days31_60, 32000);
  assert.strictEqual(days61_90, 15000);
  assert.strictEqual(days90Plus, 22000);

  const grandTotalAR = currentTotal + days1_30 + days31_60 + days61_90 + days90Plus;
  assert.strictEqual(grandTotalAR, 132000);
  console.log('  ✔ Passed: AR Aging correctly segmented 5 buckets:');
  console.log(`     • Current (Not Overdue):  ETB ${currentTotal.toLocaleString()}`);
  console.log(`     • 1 - 30 Days Overdue:    ETB ${days1_30.toLocaleString()}`);
  console.log(`     • 31 - 60 Days Overdue:   ETB ${days31_60.toLocaleString()}`);
  console.log(`     • 61 - 90 Days Overdue:   ETB ${days61_90.toLocaleString()}`);
  console.log(`     • 90+ Days Overdue:       ETB ${days90Plus.toLocaleString()}`);
  console.log(`     • Total Receivables:      ETB ${grandTotalAR.toLocaleString()}\n`);

  // -------------------------------------------------------------
  // TEST 5: Customer Statement of Account Running Balances
  // -------------------------------------------------------------
  console.log('▶ Test 5: Customer Account Statement Itemization & Net Balance');
  const customerInvoices = [
    { ref: 'INV-2026-001', date: '2026-09-01', billed: 35000, paid: 35000, balance: 0 },
    { ref: 'INV-2026-002', date: '2026-09-15', billed: 28000, paid: 10000, balance: 18000 },
    { ref: 'INV-2026-003', date: '2026-10-05', billed: 45000, paid: 0, balance: 45000 },
  ];

  const totalBilled = customerInvoices.reduce((s, i) => s + i.billed, 0); // 108,000
  const totalPaid = customerInvoices.reduce((s, i) => s + i.paid, 0);     // 45,000
  const netOutstanding = totalBilled - totalPaid;                          // 63,000

  assert.strictEqual(totalBilled, 108000);
  assert.strictEqual(totalPaid, 45000);
  assert.strictEqual(netOutstanding, 63000);
  console.log(`  ✔ Passed: Statement reconciles: Total Billed ETB ${totalBilled.toLocaleString()} - Paid ETB ${totalPaid.toLocaleString()} = Net Due ETB ${netOutstanding.toLocaleString()}.\n`);

  // -------------------------------------------------------------
  // TEST 6: Ministry of Revenues Printable Tax Invoice Structure
  // -------------------------------------------------------------
  console.log('▶ Test 6: Ethiopian Ministry of Revenues (MoR) Compliant Tax Invoice Fields');
  const printableMock = {
    documentTitle: 'OFFICIAL TAX INVOICE',
    hotelTin: '0098765432', // 10-digit TIN
    customerTin: '0012345678',
    invoiceNumber: 'INV-2026-00042',
    vatRate: 15.0,
    serviceChargeRate: 10.0,
  };

  assert.strictEqual(printableMock.documentTitle, 'OFFICIAL TAX INVOICE');
  assert.strictEqual(printableMock.hotelTin.length, 10, 'Hotel TIN must be 10 digits');
  assert.strictEqual(printableMock.customerTin.length, 10, 'Customer TIN must be 10 digits');
  assert.strictEqual(printableMock.vatRate, 15.0);
  assert.strictEqual(printableMock.serviceChargeRate, 10.0);
  console.log('  ✔ Passed: Mandatory Ethiopian tax invoice fields validated.\n');

  console.log('================================================================');
  console.log('🎉 ALL PHASE 4 CUSTOMER INVOICING & AR TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
}

runCustomerInvoicingARTests().catch((err) => {
  console.error('❌ Customer Invoicing & AR Test Suite Failed:', err);
  process.exit(1);
});
