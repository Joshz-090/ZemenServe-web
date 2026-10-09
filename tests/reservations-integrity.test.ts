import assert from 'assert';
import { getEthiopianLocalDate, isDateRangeOverlapping } from '../src/lib/dateUtils';

async function runReservationIntegrityTests() {
  console.log('=== Running Reservation Overlap & Ethiopian Date Integrity Tests ===\n');

  // Test 1: Ethiopian Local Date UTC+3 Timezone calculation
  const lateNightUtc = new Date('2026-10-09T22:30:00Z'); // 10:30 PM UTC = Oct 10, 2026 1:30 AM EAT
  const eatDateStr = getEthiopianLocalDate(lateNightUtc);
  assert.strictEqual(eatDateStr, '2026-10-10', 'Late night UTC must roll over to the next day in UTC+3 (Ethiopian Local Time)');
  console.log('✔ Test 1 Passed: getEthiopianLocalDate correctly calculates UTC+3 date (2026-10-10).');

  // Test 2: Overlapping Date Ranges Logic
  // Existing booking: 2026-10-10 to 2026-10-15

  // Case A: Partial Overlap (Starts before, ends inside)
  assert.strictEqual(
    isDateRangeOverlapping('2026-10-08', '2026-10-12', '2026-10-10', '2026-10-15'),
    true,
    'Should detect partial start overlap'
  );

  // Case B: Partial Overlap (Starts inside, ends after)
  assert.strictEqual(
    isDateRangeOverlapping('2026-10-12', '2026-10-18', '2026-10-10', '2026-10-15'),
    true,
    'Should detect partial end overlap'
  );

  // Case C: Enclosing Overlap (Starts before, ends after)
  assert.strictEqual(
    isDateRangeOverlapping('2026-10-05', '2026-10-20', '2026-10-10', '2026-10-15'),
    true,
    'Should detect enclosing overlap'
  );

  // Case D: Exact Same Dates
  assert.strictEqual(
    isDateRangeOverlapping('2026-10-10', '2026-10-15', '2026-10-10', '2026-10-15'),
    true,
    'Should detect exact match overlap'
  );

  // Case E: Non-overlapping (Checkout on same day another check-in occurs)
  assert.strictEqual(
    isDateRangeOverlapping('2026-10-05', '2026-10-10', '2026-10-10', '2026-10-15'),
    false,
    'Check-out on check-in date should NOT be considered overlapping'
  );

  // Case F: Non-overlapping (Completely after)
  assert.strictEqual(
    isDateRangeOverlapping('2026-10-16', '2026-10-20', '2026-10-10', '2026-10-15'),
    false,
    'Completely separated date range should NOT overlap'
  );
  console.log('✔ Test 2 Passed: Overlapping date range helper logic verified for all edge cases.');

  // Test 3: Reservation Conflict Guard Simulation
  interface ActiveBooking {
    id: number;
    roomId: number;
    checkInDate: string;
    checkOutDate: string;
    status: string;
  }

  const existingBookings: ActiveBooking[] = [
    { id: 101, roomId: 1, checkInDate: '2026-10-08', checkOutDate: '2026-10-11', status: 'Checked-In' },
    { id: 102, roomId: 3, checkInDate: '2026-10-09', checkOutDate: '2026-10-13', status: 'Reserved' },
  ];

  function validateNewReservation(roomId: number, newCheckIn: string, newCheckOut: string) {
    const conflicts = existingBookings.filter(
      (b) =>
        b.roomId === roomId &&
        ['Reserved', 'Checked-In'].includes(b.status) &&
        isDateRangeOverlapping(newCheckIn, newCheckOut, b.checkInDate, b.checkOutDate)
    );

    if (conflicts.length > 0) {
      return { success: false, status: 409, error: `Overlapping reservation conflict for Room ${roomId}` };
    }
    return { success: true, status: 200 };
  }

  // Attempt overlapping booking on Room 1 (Oct 9 to Oct 12 overlaps Oct 8 to Oct 11)
  const overlapRes = validateNewReservation(1, '2026-10-09', '2026-10-12');
  assert.strictEqual(overlapRes.status, 409, 'Must return 409 Conflict for overlapping room booking');
  assert.strictEqual(overlapRes.success, false);
  console.log('✔ Test 3 Passed: Reservation overlap guard correctly returned 409 Conflict.');

  // Attempt valid non-overlapping booking on Room 1 (Oct 11 to Oct 14)
  const validRes = validateNewReservation(1, '2026-10-11', '2026-10-14');
  assert.strictEqual(validRes.status, 200, 'Must allow non-overlapping check-in after prior checkout');
  assert.strictEqual(validRes.success, true);
  console.log('✔ Test 4 Passed: Non-overlapping booking starting on checkout date allowed with 200 OK.');

  console.log('\n✅ ALL RESERVATION INTEGRITY & ETHIOPIAN DATE TESTS PASSED CLEANLY!\n');
}

runReservationIntegrityTests().catch((err) => {
  console.error('❌ Reservation Integrity Test Suite Failed:', err);
  process.exit(1);
});
