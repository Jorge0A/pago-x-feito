/**
 * Date helpers for pt-BR. Calendar dates are ISO strings "YYYY-MM-DD" (no time zone).
 * Moments are Date objects, displayed in America/Sao_Paulo.
 */

export const SAO_PAULO_TZ = "America/Sao_Paulo";

export type ISODate = string; // "YYYY-MM-DD"
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const BR_RE = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s*$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string") return false;
  const m = ISO_RE.exec(value);
  if (!m) return false;
  return isValidYMD(Number(m[1]), Number(m[2]), Number(m[3]));
}

function isValidYMD(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function toISODate(y: number, m: number, d: number): ISODate {
  return `${y.toString().padStart(4, "0")}-${pad2(m)}-${pad2(d)}`;
}

export function splitISO(iso: ISODate): { y: number; m: number; d: number } {
  const m = ISO_RE.exec(iso);
  if (!m) throw new RangeError(`Invalid ISO date: ${iso}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** "2026-10-23" → "23/10/2026". Also accepts a Date (rendered in São Paulo time). */
export function formatDateBR(value: ISODate | Date | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: SAO_PAULO_TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(value);
  }
  const { y, m, d } = splitISO(value);
  return `${pad2(d)}/${pad2(m)}/${y}`;
}

/** Moment rendered as "23/10/2026 14:30" in São Paulo time. */
export function formatDateTimeBR(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", "");
}

/** "23/10/2026" or "23/10/26" → "2026-10-23". Returns null when invalid. */
export function parseDateBR(input: string | null | undefined): ISODate | null {
  if (!input) return null;
  const m = BR_RE.exec(input);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = Number(m[3]);
  if (m[3]!.length === 2) y += 2000;
  if (!isValidYMD(y, mo, d)) return null;
  return toISODate(y, mo, d);
}

/** Today's calendar date in São Paulo. */
export function todayISO(now: Date = new Date()): ISODate {
  return dateInTZ(now, SAO_PAULO_TZ);
}

/** The calendar date of a moment in a time zone. */
export function dateInTZ(moment: Date, timeZone: string): ISODate {
  return wallClockInTZ(moment, timeZone).date;
}

/** Local wall-clock parts of a moment in a time zone. */
export function wallClockInTZ(
  moment: Date,
  timeZone: string,
): { date: ISODate; hour: number; minute: number; weekday: Weekday } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(moment);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hour = Number(get("hour")) % 24; // some engines print "24" at midnight
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour,
    minute: Number(get("minute")),
    weekday: weekdays.indexOf(get("weekday")) as Weekday,
  };
}

function utcOf(iso: ISODate): number {
  const { y, m, d } = splitISO(iso);
  return Date.UTC(y, m - 1, d);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const dt = new Date(utcOf(iso) + days * 86_400_000);
  return toISODate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** b - a in whole days (positive when b is after a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((utcOf(b) - utcOf(a)) / 86_400_000);
}

export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function weekdayOf(iso: ISODate): Weekday {
  return new Date(utcOf(iso)).getUTCDay() as Weekday;
}

export function isWeekend(iso: ISODate): boolean {
  const w = weekdayOf(iso);
  return w === 0 || w === 6;
}
