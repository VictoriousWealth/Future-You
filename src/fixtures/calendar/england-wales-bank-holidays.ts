import { VersionedHolidayCalendar } from "../../domain/calendar/working-day-calendar";
import { mustLocalDate } from "../../domain/shared/date";

/**
 * Committed Slice 1 snapshot of GOV.UK England and Wales events for 2026-2028.
 * Source: https://www.gov.uk/bank-holidays.json
 * Retrieved: 2026-08-23
 * Dates outside coverage use the disclosed Monday-Friday fallback.
 */
export const ENGLAND_WALES_CALENDAR_VERSION =
  "govuk-england-and-wales-2026-2028@2026-08-23";

export const ENGLAND_WALES_CALENDAR_METADATA = Object.freeze({
  version: ENGLAND_WALES_CALENDAR_VERSION,
  jurisdiction: "ENGLAND_AND_WALES" as const,
  coverageStart: mustLocalDate("2026-01-01"),
  coverageEnd: mustLocalDate("2028-12-31"),
  source: "COMMITTED_FIXTURE" as const
});

const HOLIDAYS = [
  "2026-01-01",
  "2026-04-03",
  "2026-04-06",
  "2026-05-04",
  "2026-05-25",
  "2026-08-31",
  "2026-12-25",
  "2026-12-28",
  "2027-01-01",
  "2027-03-26",
  "2027-03-29",
  "2027-05-03",
  "2027-05-31",
  "2027-08-30",
  "2027-12-27",
  "2027-12-28",
  "2028-01-03",
  "2028-04-14",
  "2028-04-17",
  "2028-05-01",
  "2028-05-29",
  "2028-08-28",
  "2028-12-25",
  "2028-12-26"
] as const;

export const ENGLAND_WALES_WORKING_DAY_CALENDAR = new VersionedHolidayCalendar({
  version: ENGLAND_WALES_CALENDAR_METADATA.version,
  jurisdiction: ENGLAND_WALES_CALENDAR_METADATA.jurisdiction,
  coverageStart: ENGLAND_WALES_CALENDAR_METADATA.coverageStart,
  coverageEnd: ENGLAND_WALES_CALENDAR_METADATA.coverageEnd,
  holidays: HOLIDAYS.map(mustLocalDate)
});
