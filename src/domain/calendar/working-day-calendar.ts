import {
  addDays,
  compareDates,
  dateInMonth,
  dayOfWeek,
  daysInMonth,
  type LocalDate,
  type YearMonth
} from "../shared/date";

export type Jurisdiction = "ENGLAND_AND_WALES";
export type CalendarSource = "COMMITTED_FIXTURE" | "WEEKDAY_FALLBACK";

export interface WorkingDayDecision {
  readonly isWorkingDay: boolean;
  readonly source: CalendarSource;
}

export interface LastWorkingDayResult {
  readonly date: LocalDate;
  readonly source: CalendarSource;
  readonly usedFallback: boolean;
}

export interface WorkingDayCalendar {
  readonly version: string;
  readonly jurisdiction: Jurisdiction;
  isWorkingDay(date: LocalDate, jurisdiction: Jurisdiction): WorkingDayDecision;
  lastWorkingDay(period: YearMonth, jurisdiction: Jurisdiction): LastWorkingDayResult;
}

function weekday(date: LocalDate): boolean {
  const day = dayOfWeek(date);
  return day !== 0 && day !== 6;
}

export interface VersionedHolidayCalendarInput {
  readonly version: string;
  readonly jurisdiction: Jurisdiction;
  readonly coverageStart: LocalDate;
  readonly coverageEnd: LocalDate;
  readonly holidays: readonly LocalDate[];
}

export class VersionedHolidayCalendar implements WorkingDayCalendar {
  readonly version: string;
  readonly jurisdiction: Jurisdiction;
  readonly #coverageStart: LocalDate;
  readonly #coverageEnd: LocalDate;
  readonly #holidays: ReadonlySet<LocalDate>;

  constructor(input: VersionedHolidayCalendarInput) {
    this.version = input.version;
    this.jurisdiction = input.jurisdiction;
    this.#coverageStart = input.coverageStart;
    this.#coverageEnd = input.coverageEnd;
    this.#holidays = new Set(input.holidays);
  }

  isWorkingDay(date: LocalDate, jurisdiction: Jurisdiction): WorkingDayDecision {
    const covered =
      jurisdiction === this.jurisdiction &&
      compareDates(date, this.#coverageStart) >= 0 &&
      compareDates(date, this.#coverageEnd) <= 0;

    if (!covered) {
      return { isWorkingDay: weekday(date), source: "WEEKDAY_FALLBACK" };
    }

    return {
      isWorkingDay: weekday(date) && !this.#holidays.has(date),
      source: "COMMITTED_FIXTURE"
    };
  }

  lastWorkingDay(period: YearMonth, jurisdiction: Jurisdiction): LastWorkingDayResult {
    let candidate = dateInMonth(period, daysInMonth(period));
    let usedFallback = false;

    for (let attempts = 0; attempts < 10; attempts += 1) {
      const decision = this.isWorkingDay(candidate, jurisdiction);
      usedFallback ||= decision.source === "WEEKDAY_FALLBACK";
      if (decision.isWorkingDay) {
        return {
          date: candidate,
          source: usedFallback ? "WEEKDAY_FALLBACK" : "COMMITTED_FIXTURE",
          usedFallback
        };
      }
      candidate = addDays(candidate, -1);
    }

    throw new Error(`Unable to resolve a working day for ${period}.`);
  }
}

export class WeekdayFallbackCalendar implements WorkingDayCalendar {
  readonly version: string;
  readonly jurisdiction: Jurisdiction = "ENGLAND_AND_WALES";

  constructor(version = "weekday-fallback/v1") {
    this.version = version;
  }

  isWorkingDay(date: LocalDate, _jurisdiction: Jurisdiction = this.jurisdiction): WorkingDayDecision {
    return { isWorkingDay: weekday(date), source: "WEEKDAY_FALLBACK" };
  }

  lastWorkingDay(
    period: YearMonth,
    jurisdiction: Jurisdiction = this.jurisdiction
  ): LastWorkingDayResult {
    let candidate = dateInMonth(period, daysInMonth(period));
    while (!this.isWorkingDay(candidate, jurisdiction).isWorkingDay) {
      candidate = addDays(candidate, -1);
    }
    return { date: candidate, source: "WEEKDAY_FALLBACK", usedFallback: true };
  }
}
