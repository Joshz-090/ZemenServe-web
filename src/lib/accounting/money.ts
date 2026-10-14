/**
 * Decimal-Safe Monetary Utilities for Double-Entry Accounting
 * Enforces integer-based cent calculations to eliminate IEEE 754 floating-point errors.
 */

/**
 * Converts ETB (Birr) float to integer cents.
 * E.g., 2500.50 -> 250050
 */
export function toCents(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/**
 * Converts integer cents back to ETB (Birr) float with 2 decimal places.
 * E.g., 250050 -> 2500.50
 */
export function toBirr(cents: number): number {
  if (isNaN(cents) || !isFinite(cents)) return 0;
  return Number((cents / 100).toFixed(2));
}

/**
 * Formats a monetary number in standard Ethiopian Birr display format.
 * E.g., 1250000 cents -> "ETB 12,500.00"
 */
export function formatETB(amount: number, isCents = false): string {
  const birr = isCents ? toBirr(amount) : Number(amount.toFixed(2));
  return `ETB ${birr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Rounds any number strictly to 2 decimal places without string parsing issues.
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export interface JournalLineBalanceCheck {
  debit: number;
  credit: number;
}

export interface ValidationResult {
  isValid: boolean;
  totalDebitCents: number;
  totalCreditCents: number;
  totalDebit: number;
  totalCredit: number;
  differenceCents: number;
  errorMessage?: string;
}

/**
 * Validates whether a set of journal lines balances under the double-entry accounting equation:
 * Total Debits === Total Credits (in integer cents).
 */
export function validateJournalBalance(lines: JournalLineBalanceCheck[]): ValidationResult {
  if (!lines || lines.length < 2) {
    return {
      isValid: false,
      totalDebitCents: 0,
      totalCreditCents: 0,
      totalDebit: 0,
      totalCredit: 0,
      differenceCents: 0,
      errorMessage: 'A valid double-entry journal entry must contain at least two lines.',
    };
  }

  let totalDebitCents = 0;
  let totalCreditCents = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const d = line.debit || 0;
    const c = line.credit || 0;

    if (d < 0 || c < 0) {
      return {
        isValid: false,
        totalDebitCents,
        totalCreditCents,
        totalDebit: toBirr(totalDebitCents),
        totalCredit: toBirr(totalCreditCents),
        differenceCents: Math.abs(totalDebitCents - totalCreditCents),
        errorMessage: `Line ${i + 1} contains negative amounts. Debits and credits must be non-negative.`,
      };
    }

    if (d > 0 && c > 0) {
      return {
        isValid: false,
        totalDebitCents,
        totalCreditCents,
        totalDebit: toBirr(totalDebitCents),
        totalCredit: toBirr(totalCreditCents),
        differenceCents: Math.abs(totalDebitCents - totalCreditCents),
        errorMessage: `Line ${i + 1} contains both debit and credit amounts. Each line must be either a debit or a credit.`,
      };
    }

    totalDebitCents += toCents(d);
    totalCreditCents += toCents(c);
  }

  if (totalDebitCents === 0 && totalCreditCents === 0) {
    return {
      isValid: false,
      totalDebitCents: 0,
      totalCreditCents: 0,
      totalDebit: 0,
      totalCredit: 0,
      differenceCents: 0,
      errorMessage: 'Journal entry total cannot be zero.',
    };
  }

  const differenceCents = Math.abs(totalDebitCents - totalCreditCents);
  const isValid = differenceCents === 0;

  return {
    isValid,
    totalDebitCents,
    totalCreditCents,
    totalDebit: toBirr(totalDebitCents),
    totalCredit: toBirr(totalCreditCents),
    differenceCents,
    errorMessage: isValid
      ? undefined
      : `Unbalanced journal entry: Total Debits (ETB ${toBirr(totalDebitCents)}) does not equal Total Credits (ETB ${toBirr(totalCreditCents)}). Discrepancy: ETB ${toBirr(differenceCents)}.`,
  };
}
