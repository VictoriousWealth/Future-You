import { err, ok, type Result } from "./result";

declare const localDateBrand: unique symbol;
declare const yearMonthBrand: unique symbol;

export type LocalDate = string & { readonly [localDateBrand]: true };
export type YearMonth = string & { readonly [yearMonthBrand]: true };

export interface DateError {
  readonly code: "INVALID_LOCAL_DATE" | "INVALID_YEAR_MONTH";
  readonly value: string;
}

export function localDate(value: string): Result<LocalDate, DateError> {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return err({ code: "INVALID_LOCAL_DATE", value });
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return err({ code: "INVALID_LOCAL_DATE", value });
  }
  return ok(value as LocalDate);
}

export function yearMonth(value: string): Result<YearMonth, DateError> {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const month = Number(match?.[2]);
  if (!match || month < 1 || month > 12) {
    return err({ code: "INVALID_YEAR_MONTH", value });
  }
  return ok(value as YearMonth);
}

export function mustLocalDate(value: string): LocalDate {
  const result = localDate(value);
  if (!result.ok) throw new TypeError(`${result.error.code}: ${value}`);
  return result.value;
}

export function mustYearMonth(value: string): YearMonth {
  const result = yearMonth(value);
  if (!result.ok) throw new TypeError(`${result.error.code}: ${value}`);
  return result.value;
}

export function splitYearMonth(value: YearMonth): Readonly<{ year: number; month: number }> {
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) };
}

export function yearMonthOf(date: LocalDate): YearMonth {
  return date.slice(0, 7) as YearMonth;
}

export function daysInMonth(period: YearMonth): number {
  const { year, month } = splitYearMonth(period);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function dateInMonth(period: YearMonth, day: number): LocalDate {
  const maximum = daysInMonth(period);
  if (!Number.isInteger(day) || day < 1 || day > maximum) {
    throw new RangeError(`Day ${day} is outside ${period}.`);
  }
  return mustLocalDate(`${period}-${String(day).padStart(2, "0")}`);
}

export function dayOfWeek(date: LocalDate): number {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return parsed.getUTCDay();
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return mustLocalDate(parsed.toISOString().slice(0, 10));
}

export function addMonths(period: YearMonth, count: number): YearMonth {
  const { year, month } = splitYearMonth(period);
  const date = new Date(Date.UTC(year, month - 1 + count, 1));
  return mustYearMonth(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
}

export function compareDates(left: LocalDate, right: LocalDate): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function monthDifference(from: YearMonth, to: YearMonth): number {
  const left = splitYearMonth(from);
  const right = splitYearMonth(to);
  return (right.year - left.year) * 12 + right.month - left.month;
}
