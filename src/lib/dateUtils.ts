/**
 * Returns current date string 'YYYY-MM-DD' in Ethiopian / East Africa Time (UTC+3 / Africa/Addis_Ababa).
 * This prevents late-night transactions (after 21:00 UTC / 00:00 EAT) from being posted to the incorrect calendar date.
 */
export function getEthiopianLocalDate(dateInput: Date = new Date()): string {
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return formatter.format(dateInput);
  } catch {
    // Fallback if timezone formatting fails
    const utcMs = dateInput.getTime() + dateInput.getTimezoneOffset() * 60000;
    const eatDate = new Date(utcMs + 3 * 3600000);
    return eatDate.toISOString().split('T')[0];
  }
}

/**
 * Checks if two date ranges (checkIn1-checkOut1) and (checkIn2-checkOut2) overlap.
 */
export function isDateRangeOverlapping(
  checkIn1: string,
  checkOut1: string,
  checkIn2: string,
  checkOut2: string
): boolean {
  const start1 = new Date(checkIn1).getTime();
  const end1 = new Date(checkOut1).getTime();
  const start2 = new Date(checkIn2).getTime();
  const end2 = new Date(checkOut2).getTime();

  return start1 < end2 && end1 > start2;
}
