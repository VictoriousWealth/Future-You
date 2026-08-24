import type { WorkingDayCalendar } from "../../domain/calendar/working-day-calendar";
import type { LocalDate } from "../../domain/shared/date";
import type { SimulationRules } from "../../domain/simulator/types";
import type { FinancialContextSource } from "../ports/financial-context-source";
import type { SimulationRunStore } from "../ports/simulation-run-store";

export interface CalendarFixtureMetadata {
  readonly version: string;
  readonly jurisdiction: "ENGLAND_AND_WALES";
  readonly coverageStart: LocalDate;
  readonly coverageEnd: LocalDate;
  readonly source: "COMMITTED_FIXTURE";
}

export interface SimulatorApplicationDependencies {
  readonly contextSource: FinancialContextSource;
  readonly rules: SimulationRules;
  readonly calendar: WorkingDayCalendar;
  readonly calendarMetadata: CalendarFixtureMetadata;
  readonly runStore: SimulationRunStore;
}
