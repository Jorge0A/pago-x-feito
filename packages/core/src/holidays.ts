/**
 * Brazilian holidays relevant to a São Paulo obra: national holidays by law, the universally
 * observed movable days (Carnaval, Sexta-feira Santa, Corpus Christi) and São Paulo city/state days.
 */
import { addDays, type ISODate, toISODate, isWeekend } from "./dates";

export type HolidayScope = "national" | "sao_paulo";

export interface Holiday {
  date: ISODate;
  name: string;
  scope: HolidayScope;
}

/** Anonymous Gregorian algorithm (Meeus/Jones/Butcher). Returns Easter Sunday. */
export function easterSunday(year: number): ISODate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toISODate(year, month, day);
}

export function holidaysForYear(year: number, scope: HolidayScope = "sao_paulo"): Holiday[] {
  const easter = easterSunday(year);
  const list: Holiday[] = [
    { date: toISODate(year, 1, 1), name: "Confraternização Universal", scope: "national" },
    { date: addDays(easter, -48), name: "Carnaval (segunda-feira)", scope: "national" },
    { date: addDays(easter, -47), name: "Carnaval (terça-feira)", scope: "national" },
    { date: addDays(easter, -2), name: "Sexta-feira Santa", scope: "national" },
    { date: toISODate(year, 4, 21), name: "Tiradentes", scope: "national" },
    { date: toISODate(year, 5, 1), name: "Dia do Trabalho", scope: "national" },
    { date: addDays(easter, 60), name: "Corpus Christi", scope: "national" },
    { date: toISODate(year, 9, 7), name: "Independência do Brasil", scope: "national" },
    { date: toISODate(year, 10, 12), name: "Nossa Senhora Aparecida", scope: "national" },
    { date: toISODate(year, 11, 2), name: "Finados", scope: "national" },
    { date: toISODate(year, 11, 15), name: "Proclamação da República", scope: "national" },
    { date: toISODate(year, 11, 20), name: "Dia da Consciência Negra", scope: "national" },
    { date: toISODate(year, 12, 25), name: "Natal", scope: "national" },
  ];
  if (scope === "sao_paulo") {
    list.push(
      { date: toISODate(year, 1, 25), name: "Aniversário de São Paulo", scope: "sao_paulo" },
      { date: toISODate(year, 7, 9), name: "Revolução Constitucionalista", scope: "sao_paulo" },
    );
  }
  return list.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function holidaySet(years: number[], scope: HolidayScope = "sao_paulo"): Set<ISODate> {
  const set = new Set<ISODate>();
  for (const y of years) for (const h of holidaysForYear(y, scope)) set.add(h.date);
  return set;
}

function yearsBetween(a: ISODate, b: ISODate): number[] {
  const ya = Number(a.slice(0, 4));
  const yb = Number(b.slice(0, 4));
  const out: number[] = [];
  for (let y = Math.min(ya, yb) - 1; y <= Math.max(ya, yb) + 1; y++) out.push(y);
  return out;
}

export function isHoliday(iso: ISODate, scope: HolidayScope = "sao_paulo"): boolean {
  return holidaySet([Number(iso.slice(0, 4))], scope).has(iso);
}

/** Monday–Friday and not a holiday. */
export function isBusinessDay(iso: ISODate, scope: HolidayScope = "sao_paulo"): boolean {
  return !isWeekend(iso) && !isHoliday(iso, scope);
}

/**
 * Adds n business days (dias úteis). `from` itself is not counted.
 * addBusinessDays("2026-10-23" (Fri), 5) → "2026-10-30" (Fri).
 */
export function addBusinessDays(from: ISODate, n: number, scope: HolidayScope = "sao_paulo"): ISODate {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("n must be a non-negative integer");
  const holidays = holidaySet(yearsBetween(from, addDays(from, n * 3 + 30)), scope);
  let cur = from;
  let left = n;
  while (left > 0) {
    cur = addDays(cur, 1);
    if (!isWeekend(cur) && !holidays.has(cur)) left--;
  }
  return cur;
}

/** Number of business days strictly after `from` up to and including `to`. */
export function businessDaysBetween(from: ISODate, to: ISODate, scope: HolidayScope = "sao_paulo"): number {
  if (to <= from) return 0;
  const holidays = holidaySet(yearsBetween(from, to), scope);
  let count = 0;
  let cur = from;
  while (cur < to) {
    cur = addDays(cur, 1);
    if (!isWeekend(cur) && !holidays.has(cur)) count++;
  }
  return count;
}
