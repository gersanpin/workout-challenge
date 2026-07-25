/** Date helpers for Monday–Sunday challenge weeks + grace-period lock. */

import { WEEK_CLOSE_GRACE_DAYS } from '../constants/challenge';

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayDateOnly(): string {
  return formatDateOnly(new Date());
}

/** Monday of the week containing `dateStr` (Mon–Sun weeks). */
export function getWeekStart(dateStr: string): string {
  const date = parseDateOnly(dateStr);
  const day = date.getDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date.getTime() + offsetToMonday * DAY_MS);
  return formatDateOnly(monday);
}

export function getWeekEnd(weekStart: string): string {
  return addDays(weekStart, 6);
}

/** Week locks at end of this date (Sunday + grace days). */
export function getWeekCloseDate(weekStart: string): string {
  return addDays(getWeekEnd(weekStart), WEEK_CLOSE_GRACE_DAYS);
}

export function isWeekClosed(weekStart: string, asOfDate: string): boolean {
  return getWeekCloseDate(weekStart) < asOfDate;
}

export function listWeekStartsInRange(
  fromDate: string,
  throughDate: string,
): string[] {
  let cursor = getWeekStart(fromDate);
  const last = getWeekStart(throughDate);
  const weeks: string[] = [];

  while (cursor <= last) {
    weeks.push(cursor);
    cursor = addDays(cursor, 7);
  }

  return weeks;
}

export function yearStartDate(year: number): string {
  return `${year}-01-01`;
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDateOnly(dateStr);
  return formatDateOnly(new Date(d.getTime() + days * DAY_MS));
}

export function formatWeekLabel(weekStart: string): string {
  const start = parseDateOnly(weekStart);
  const end = parseDateOnly(getWeekEnd(weekStart));
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

/**
 * Dates the user may pick when logging:
 * today back through `lookbackDays`, excluding any date whose week is already closed.
 */
export function getAllowedLogDates(
  today: string,
  lookbackDays: number,
): { minDate: string; maxDate: string; isAllowed: (date: string) => boolean } {
  const maxDate = today;
  const rawMin = addDays(today, -lookbackDays);

  const isAllowed = (date: string) => {
    if (date > maxDate || date < rawMin) return false;
    return !isWeekClosed(getWeekStart(date), today);
  };

  // Find earliest allowed day in the window for the picker minimum.
  let minDate = maxDate;
  for (let i = 0; i <= lookbackDays; i++) {
    const candidate = addDays(today, -i);
    if (isAllowed(candidate)) minDate = candidate;
  }

  return { minDate, maxDate, isAllowed };
}
