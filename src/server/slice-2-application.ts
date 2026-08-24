import { SLICE_1_RULES } from "../domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../fixtures/calendar/england-wales-bank-holidays";
import { SarahV1ContextSource } from "../infrastructure/context/sarah-v1-context-source";
import { InMemorySimulationRunStore } from "../infrastructure/runs/in-memory-simulation-run-store";
import { createSimulatorApplication } from "./simulator-application";

const runStore = new InMemorySimulationRunStore();

const dependencies = Object.freeze({
  contextSource: new SarahV1ContextSource(),
  rules: SLICE_1_RULES,
  calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
  calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA,
  runStore
});

export const slice2Application = createSimulatorApplication(dependencies);
