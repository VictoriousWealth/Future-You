import { describe, expect, it } from "vitest";
import { WeekdayFallbackCalendar } from "../src/domain/calendar/working-day-calendar";
import { mustLocalDate, mustYearMonth } from "../src/domain/shared/date";
import {
  ENGLAND_WALES_CALENDAR_VERSION,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../src/fixtures/calendar/england-wales-bank-holidays";

describe("versioned England and Wales working-day calendar", () => {
  it("resolves a month ending on a normal weekday", () => {
    expect(
      ENGLAND_WALES_WORKING_DAY_CALENDAR.lastWorkingDay(
        mustYearMonth("2026-09"),
        "ENGLAND_AND_WALES"
      )
    ).toEqual({ date: "2026-09-30", source: "COMMITTED_FIXTURE", usedFallback: false });
  });

  it("moves a weekend month-end to Friday", () => {
    expect(
      ENGLAND_WALES_WORKING_DAY_CALENDAR.lastWorkingDay(
        mustYearMonth("2027-01"),
        "ENGLAND_AND_WALES"
      ).date
    ).toBe("2027-01-29");
  });

  it("moves an England and Wales bank-holiday month-end to the prior working day", () => {
    expect(
      ENGLAND_WALES_WORKING_DAY_CALENDAR.lastWorkingDay(
        mustYearMonth("2026-08"),
        "ENGLAND_AND_WALES"
      ).date
    ).toBe("2026-08-28");
  });

  it("handles December payday from the committed calendar", () => {
    expect(
      ENGLAND_WALES_WORKING_DAY_CALENDAR.lastWorkingDay(
        mustYearMonth("2026-12"),
        "ENGLAND_AND_WALES"
      )
    ).toEqual({ date: "2026-12-31", source: "COMMITTED_FIXTURE", usedFallback: false });
  });

  it("uses the disclosed weekday fallback outside committed coverage", () => {
    expect(
      ENGLAND_WALES_WORKING_DAY_CALENDAR.lastWorkingDay(
        mustYearMonth("2030-06"),
        "ENGLAND_AND_WALES"
      )
    ).toEqual({ date: "2030-06-28", source: "WEEKDAY_FALLBACK", usedFallback: true });
  });

  it("the narrow fallback provider never treats weekends as working days", () => {
    const fallback = new WeekdayFallbackCalendar();
    expect(fallback.isWorkingDay(mustLocalDate("2026-08-30"), "ENGLAND_AND_WALES")).toEqual({
      isWorkingDay: false,
      source: "WEEKDAY_FALLBACK"
    });
    expect(fallback.lastWorkingDay(mustYearMonth("2026-08"), "ENGLAND_AND_WALES").date).toBe(
      "2026-08-31"
    );
  });

  it("exposes the exact fixture version used for reproducibility", () => {
    expect(ENGLAND_WALES_WORKING_DAY_CALENDAR.version).toBe(ENGLAND_WALES_CALENDAR_VERSION);
  });
});
