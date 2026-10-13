import assert from 'assert';

console.log('=== Running ZemenServe HR & Workforce Management Test Suite ===\n');

// ==========================================
// Test 1: Employee Staff Code Generation
// ==========================================
function generateStaffCode(idNumber: number): string {
  return `EMP-${String(1000 + idNumber)}`;
}

assert.strictEqual(generateStaffCode(1), 'EMP-1001');
assert.strictEqual(generateStaffCode(42), 'EMP-1042');
console.log('✔ Test 1 Passed: Unique employee staff code generation formatted properly.');

// ==========================================
// Test 2: Shift Overlap Conflict Detection
// ==========================================
function checkShiftOverlap(
  shift1: { start: string; end: string; isOvernight?: boolean },
  shift2: { start: string; end: string; isOvernight?: boolean }
): boolean {
  const [s1H, s1M] = shift1.start.split(':').map(Number);
  const [e1H, e1M] = shift1.end.split(':').map(Number);
  const [s2H, s2M] = shift2.start.split(':').map(Number);
  const [e2H, e2M] = shift2.end.split(':').map(Number);

  const start1 = s1H * 60 + s1M;
  const end1 = e1H * 60 + e1M;
  const start2 = s2H * 60 + s2M;
  const end2 = e2H * 60 + e2M;

  const intervals1 = shift1.isOvernight && end1 <= start1
    ? [[start1, 1440], [0, end1]]
    : [[start1, end1]];

  const intervals2 = shift2.isOvernight && end2 <= start2
    ? [[start2, 1440], [0, end2]]
    : [[start2, end2]];

  for (const [aStart, aEnd] of intervals1) {
    for (const [bStart, bEnd] of intervals2) {
      if (aStart < bEnd && aEnd > bStart) return true;
    }
  }
  return false;
}

// Case A: Morning (06:00 - 14:00) vs Evening (14:00 - 22:00) -> Non-overlapping back-to-back
assert.strictEqual(
  checkShiftOverlap({ start: '06:00', end: '14:00' }, { start: '14:00', end: '22:00' }),
  false
);

// Case B: Morning (06:00 - 14:00) vs Banquet Prep (11:00 - 16:00) -> Overlap!
assert.strictEqual(
  checkShiftOverlap({ start: '06:00', end: '14:00' }, { start: '11:00', end: '16:00' }),
  true
);

// Case C: Overnight Night Shift (22:00 - 06:00) vs Early Morning (04:00 - 10:00) -> Overlap!
assert.strictEqual(
  checkShiftOverlap({ start: '22:00', end: '06:00', isOvernight: true }, { start: '04:00', end: '10:00' }),
  true
);
console.log('✔ Test 2 Passed: Shift overlap & overnight shift conflict engine verified.');

// ==========================================
// Test 3: Leave Request Overlap with Shifts
// ==========================================
function isLeaveOverlappingWithDate(leave: { startDate: string; endDate: string }, targetDate: string): boolean {
  return targetDate >= leave.startDate && targetDate <= leave.endDate;
}

const annualLeave = { startDate: '2026-10-15', endDate: '2026-10-20' };
assert.strictEqual(isLeaveOverlappingWithDate(annualLeave, '2026-10-17'), true);
assert.strictEqual(isLeaveOverlappingWithDate(annualLeave, '2026-10-21'), false);
console.log('✔ Test 3 Passed: Approved leave conflict detection verified.');

// ==========================================
// Test 4: Attendance & Overtime Calculation
// ==========================================
function calculateAttendanceHours(clockIn: string, clockOut: string, breakMinutes = 0, scheduledHours = 8) {
  const [inH, inM] = clockIn.split(':').map(Number);
  const [outH, outM] = clockOut.split(':').map(Number);

  let diffMinutes = outH * 60 + outM - (inH * 60 + inM);
  if (diffMinutes < 0) diffMinutes += 24 * 60; // Overnight punch
  diffMinutes -= breakMinutes;

  const actualHours = Number((Math.max(0, diffMinutes) / 60).toFixed(1));
  const overtimeHours = Number(Math.max(0, actualHours - scheduledHours).toFixed(1));

  return { actualHours, overtimeHours };
}

// 08:00 to 17:00 with 60 min break = 8 hours worked, 0 overtime
const regularShift = calculateAttendanceHours('08:00', '17:00', 60, 8);
assert.strictEqual(regularShift.actualHours, 8.0);
assert.strictEqual(regularShift.overtimeHours, 0.0);

// 08:00 to 19:30 with 30 min break = 11 hours worked, 3 hours overtime
const overtimeShift = calculateAttendanceHours('08:00', '19:30', 30, 8);
assert.strictEqual(overtimeShift.actualHours, 11.0);
assert.strictEqual(overtimeShift.overtimeHours, 3.0);
console.log('✔ Test 4 Passed: Attendance work hours and overtime calculations verified.');

// ==========================================
// Test 5: Sensitive PII & Salary Masking for Non-Managers
// ==========================================
function maskSensitiveEmployeeData(employee: any, requesterRole: string) {
  const canViewConfidential = requesterRole === 'Admin' || requesterRole === 'Manager';
  return {
    id: employee.id,
    fullName: employee.fullName,
    department: employee.department,
    salary: canViewConfidential ? employee.salary : undefined,
    notes: canViewConfidential ? employee.notes : undefined,
  };
}

const rawEmployee = { id: 1, fullName: 'Abebe Kebede', department: 'Front Office', salary: 22000, notes: 'VIP bonus' };

// Manager can see salary
const managerView = maskSensitiveEmployeeData(rawEmployee, 'Manager');
assert.strictEqual(managerView.salary, 22000);

// Receptionist / Cashier CANNOT see salary or confidential HR remarks
const staffView = maskSensitiveEmployeeData(rawEmployee, 'Receptionist');
assert.strictEqual(staffView.salary, undefined);
assert.strictEqual(staffView.notes, undefined);
console.log('✔ Test 5 Passed: Role-based salary & PII protection guard verified.');

console.log('\nAll 5 HR Workforce Management Test Cases Passed Successfully!\n');
