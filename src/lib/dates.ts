/** Date helpers for Monday–Sunday challenge weeks. All dates are local calendar dates as YYYY-MM-DD. */

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
  const day = date.getDay(); // 0=Sun … 6=Sat
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date.getTime() + offsetToMonday * DAY_MS);
  return formatDateOnly(monday);
}

export function getWeekEnd(weekStart: string): string {
  const monday = parseDateOnly(weekStart);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  return formatDateOnly(sunday);
}

/** Inclusive list of Monday week-starts from yearStart through the week of `throughDate`. */
export function listWeekStartsInRange(
  fromDate: string,
  throughDate: string,
): string[] {
  let cursor = getWeekStart(fromDate);
  const last = getWeekStart(throughDate);
  const weeks: string[] = [];

  while (cursor <= last) {
    weeks.push(cursor);
    const next = new Date(parseDateOnly(cursor).getTime() + 7 * DAY_MS);
    cursor = formatDateOnly(next);
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
