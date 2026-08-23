import { compareDates } from "../shared/date";
import { err, ok, type Result } from "../shared/result";
import type {
  DatePrecision,
  EvidenceState,
  InputScope,
  LedgerEventType
} from "./types";
import type { LocalDate, YearMonth } from "../shared/date";

export interface PendingLedgerEvent {
  readonly id: string;
  readonly period: YearMonth;
  readonly date: LocalDate;
  readonly datePrecision: DatePrecision;
  readonly time: string | null;
  readonly type: LedgerEventType;
  readonly signedCashMinor: bigint;
  readonly reserveDeltaMinor: bigint;
  readonly required: boolean;
  readonly evidenceState: EvidenceState;
  readonly scope: InputScope;
  readonly dependsOn: readonly string[];
  readonly sourceOrder: number;
  readonly goalId: string | null;
  readonly description: string;
}

const PHASE: Readonly<Record<LedgerEventType, number>> = {
  REQUIRED_OBLIGATION: 1,
  ROUTINE_SPENDING: 2,
  CONFIRMED_ONE_OFF: 2,
  HYPOTHETICAL_ONE_OFF: 2,
  INCOME: 3,
  NEXT_CYCLE_RESERVE: 4,
  GOAL_TRANSFER: 5
};

function compareBase(left: PendingLedgerEvent, right: PendingLedgerEvent): number {
  const date = compareDates(left.date, right.date);
  if (date !== 0) return date;
  if (left.time !== null && right.time !== null && left.time !== right.time) {
    return left.time < right.time ? -1 : 1;
  }
  const phase = PHASE[left.type] - PHASE[right.type];
  if (phase !== 0) return phase;
  const source = left.sourceOrder - right.sourceOrder;
  if (source !== 0) return source;
  return left.id.localeCompare(right.id);
}

export interface EventOrderingError {
  readonly code: "DUPLICATE_EVENT_ID" | "UNKNOWN_EVENT_DEPENDENCY" | "EVENT_DEPENDENCY_CYCLE";
  readonly eventId: string;
}

export function orderEvents(
  events: readonly PendingLedgerEvent[]
): Result<readonly PendingLedgerEvent[], EventOrderingError> {
  const byId = new Map<string, PendingLedgerEvent>();
  const indegree = new Map<string, number>();
  const dependants = new Map<string, string[]>();

  for (const event of events) {
    if (byId.has(event.id)) return err({ code: "DUPLICATE_EVENT_ID", eventId: event.id });
    byId.set(event.id, event);
    indegree.set(event.id, event.dependsOn.length);
  }

  for (const event of events) {
    for (const dependency of event.dependsOn) {
      if (!byId.has(dependency)) {
        return err({ code: "UNKNOWN_EVENT_DEPENDENCY", eventId: event.id });
      }
      const values = dependants.get(dependency) ?? [];
      values.push(event.id);
      dependants.set(dependency, values);
    }
  }

  const available = events.filter((event) => indegree.get(event.id) === 0).sort(compareBase);
  const ordered: PendingLedgerEvent[] = [];

  while (available.length > 0) {
    const event = available.shift()!;
    ordered.push(event);
    for (const dependantId of dependants.get(event.id) ?? []) {
      const next = (indegree.get(dependantId) ?? 0) - 1;
      indegree.set(dependantId, next);
      if (next === 0) {
        available.push(byId.get(dependantId)!);
        available.sort(compareBase);
      }
    }
  }

  if (ordered.length !== events.length) {
    const cyclic = events.find((event) => (indegree.get(event.id) ?? 0) > 0);
    return err({ code: "EVENT_DEPENDENCY_CYCLE", eventId: cyclic?.id ?? "unknown" });
  }

  return ok(ordered);
}
