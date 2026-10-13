import assert from 'assert';

async function runPaymentIdempotencyTests() {
  console.log('=== Running Payment Idempotency & Atomic State Test Suite ===\n');

  // Test 1: Compare-And-Swap State Guard Simulation
  interface OrderState {
    idNumber: number;
    isPaid: boolean;
    status: string;
  }

  const orderStore: OrderState[] = [
    { idNumber: 101, isPaid: false, status: 'Pending' },
  ];

  // Simulated atomic Compare-And-Swap function
  function processPaymentAtomic(orderId: number) {
    const order = orderStore.find((o) => o.idNumber === orderId);
    if (!order) return { success: false, status: 404, error: 'Order not found' };

    // Check idempotency
    if (order.isPaid || order.status === 'Paid') {
      return { success: false, status: 409, isAlreadyPaid: true, error: 'Order is already paid.' };
    }

    // Atomic update
    order.isPaid = true;
    order.status = 'Paid';

    return { success: true, status: 200, order };
  }

  // First Payment Attempt
  const res1 = processPaymentAtomic(101);
  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.order?.status, 'Paid');
  console.log('✔ Test 1 Passed: Initial payment processed order state transition to Paid.');

  // Second Duplicate Payment Attempt (Retry / Re-click)
  const res2 = processPaymentAtomic(101);
  assert.strictEqual(res2.status, 409, 'Duplicate payment must return 409 Conflict');
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.isAlreadyPaid, true);
  console.log('✔ Test 2 Passed: Duplicate payment attempt correctly rejected with 409 Conflict (Idempotency Guard).');

  // Stock deduction counter simulation
  let stockQuantity = 50.0;
  const itemDeduction = 2.0;

  function deductStockIfPaymentAllowed(res: ReturnType<typeof processPaymentAtomic>) {
    if (!res.success) return false;
    stockQuantity -= itemDeduction;
    return true;
  }

  const initialDeduction = deductStockIfPaymentAllowed(res1); // Processed
  const duplicateDeduction = deductStockIfPaymentAllowed(res2); // Blocked

  assert.strictEqual(initialDeduction, true);
  assert.strictEqual(duplicateDeduction, false);
  assert.strictEqual(stockQuantity, 48.0, 'Stock must only be deducted once');
  console.log('✔ Test 3 Passed: Verified stock quantity was deducted exactly once (48.0 kg remaining).');

  console.log('\n✅ ALL PAYMENT IDEMPOTENCY & ATOMIC TESTS PASSED CLEANLY!\n');
}

runPaymentIdempotencyTests().catch((err) => {
  console.error('❌ Idempotency Test Suite Failed:', err);
  process.exit(1);
});
