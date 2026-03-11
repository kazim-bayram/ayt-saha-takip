/**
 * Canonical ISO 8601 week utilities.
 * Every part of the app that reads or writes a weekString MUST use these
 * functions so the format is always YYYY-Www (e.g. "2026-W11").
 */

/** Return the ISO week string for any Date → "YYYY-Www" */
export function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Shortcut: ISO week string for *right now*. */
export function getCurrentWeekString(): string {
  return getISOWeekString(new Date());
}

/** Convert "YYYY-Www" → the Monday of that week (UTC). */
export function weekStringToMonday(ws: string): Date {
  const [yearStr, weekStr] = ws.split('-W');
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

/** Shift a week string by ±N weeks. */
export function shiftWeek(ws: string, offset: number): string {
  const monday = weekStringToMonday(ws);
  monday.setUTCDate(monday.getUTCDate() + offset * 7);
  return getISOWeekString(monday);
}

/** Format "YYYY-Www" as "DD.MM.YYYY – DD.MM.YYYY" (Mon–Sun). */
export function formatWeekRange(ws: string): string {
  const monday = weekStringToMonday(ws);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date) =>
    `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

/** Validate that a string matches YYYY-Www. */
export function isValidWeekString(ws: string | undefined | null): boolean {
  if (!ws) return false;
  return /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(ws);
}
