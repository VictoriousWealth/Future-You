import type { WorkingDayCalendar } from "../calendar/working-day-calendar";
import {
  addMonths,
  dateInMonth,
  daysInMonth,
  mustYearMonth,
  yearMonthOf,
  type LocalDate,
  type YearMonth
} from "../shared/date";
import { deepFreeze } from "../shared/immutable";
import { inputIdentity } from "../shared/identity";
import { gbp, signedGbp, type Money } from "../shared/money";
import { err, ok } from "../shared/result";
import { compareAndClassify } from "./classification";
import { resolveFinancialContext, type ResolvedFinancialContext } from "./context";
import { orderEvents, type PendingLedgerEvent } from "./event-ordering";
import { allocateGoalPool } from "./goal-allocation";
import type {
  Assumption,
  AssumptionManifest,
  BaselineRequest,
  Confidence,
  FinancialContextSnapshot,
  GoalCompletion,
  GoalPeriodState,
  LedgerEvent,
  OneOffPurchaseChange,
  PlanningValue,
  Projection,
  ProjectionPeriod,
  ScenarioDefinition,
  ScenarioRequest,
  ScenarioSimulationResult,
  SimulationError,
  SimulationOutcome,
  SimulationRules
} from "./types";

export const SLICE_1_RULES: SimulationRules = deepFreeze({
  version: "fy-sim/1.0.0",
  classificationAllocationEvents: 6,
  detailedPeriods: 6,
  maxGoalProjectionAllocationEvents: 120
});

interface MutableGoal {
  id: string;
  label: string;
  balanceMinor: bigint;
  targetMinor: bigint;
  paused: boolean;
}

interface ProjectionExecutionInput {
  baselineId: string;
  context: FinancialContextSnapshot;
  resolved: ResolvedFinancialContext;
  rules: SimulationRules;
  calendar: WorkingDayCalendar;
  scenario: ScenarioDefinition | null;
}

class AssumptionCollector {
  readonly #items = new Map<string, Assumption>();

  add(item: Assumption): void {
    const existing = this.#items.get(item.id);
    if (!existing) {
      this.#items.set(item.id, item);
      return;
    }
    this.#items.set(item.id, {
      ...item,
      affectedPeriods: [...new Set([...existing.affectedPeriods, ...item.affectedPeriods])]
    });
  }

  manifest(): AssumptionManifest {
    const items = [...this.#items.values()];
    return {
      confirmedFacts: items.filter((item) => item.category === "CONFIRMED_FACT"),
      acceptedEstimates: items.filter((item) => item.category === "ACCEPTED_ESTIMATE"),
      systemAssumptions: items.filter((item) => item.category === "SYSTEM_ASSUMPTION"),
      hypotheticalChanges: items.filter((item) => item.category === "HYPOTHETICAL_CHANGE"),
      unknownOrExcluded: items.filter((item) => item.category === "UNKNOWN_OR_EXCLUDED")
    };
  }
}

function simulationError(
  code: SimulationError["code"],
  message: string,
  missingFields: readonly string[] = []
): SimulationError {
  return { code, message, missingFields };
}

function valueOrThrow<T>(value: PlanningValue<T>, field: string): T {
  if (value.value === null) throw new Error(`Resolved context unexpectedly lacks ${field}.`);
  return value.value;
}

function assumptionForEvidence(
  collector: AssumptionCollector,
  id: string,
  label: string,
  value: PlanningValue<unknown>,
  affectedPeriods: readonly YearMonth[]
): void {
  if (value.evidence.state === "CONFIRMED") {
    collector.add({
      id,
      category: "CONFIRMED_FACT",
      description: label,
      source: value.evidence.source,
      material: true,
      likelyEffect: "Defines the current-path value used by the projection.",
      scope: "CURRENT_PATH",
      affectedPeriods
    });
  } else if (value.evidence.state === "ESTIMATED") {
    collector.add({
      id,
      category: "ACCEPTED_ESTIMATE",
      description: label,
      source: value.evidence.source,
      material: true,
      likelyEffect: "Changing the accepted estimate may alter cash, buffer, or goal outcomes.",
      scope: "CURRENT_PATH",
      affectedPeriods
    });
  }
}

function dueDate(period: YearMonth, rule: { type: "MONTH_ONLY" } | { type: "DAY_OF_MONTH"; day: number }): LocalDate {
  if (rule.type === "MONTH_ONLY") return dateInMonth(period, 1);
  return dateInMonth(period, Math.min(rule.day, daysInMonth(period)));
}

function payday(
  period: YearMonth,
  context: FinancialContextSnapshot,
  calendar: WorkingDayCalendar,
  collector: AssumptionCollector
): LocalDate {
  if (context.income.paydayRule.type === "FIXED_DAY") {
    return dateInMonth(period, Math.min(context.income.paydayRule.day, daysInMonth(period)));
  }
  const result = calendar.lastWorkingDay(period, context.jurisdiction);
  if (result.usedFallback) {
    collector.add({
      id: `calendar-fallback-${period}`,
      category: "SYSTEM_ASSUMPTION",
      description: `Monday-to-Friday working-day fallback used for ${period}.`,
      source: calendar.version,
      material: false,
      likelyEffect: "May move payday around weekends but does not change the income amount.",
      scope: "CURRENT_PATH",
      affectedPeriods: [period]
    });
  }
  return result.date;
}

function eventBase(
  period: YearMonth,
  id: string,
  date: LocalDate,
  type: PendingLedgerEvent["type"],
  sourceOrder: number
): Pick<
  PendingLedgerEvent,
  "id" | "period" | "date" | "type" | "time" | "dependsOn" | "sourceOrder" | "goalId"
> {
  return {
    id,
    period,
    date,
    type,
    time: null,
    dependsOn: [],
    sourceOrder,
    goalId: null
  };
}

function staticEventsForPeriod(
  period: YearMonth,
  input: ProjectionExecutionInput,
  collector: AssumptionCollector
): SimulationOutcome<readonly PendingLedgerEvent[]> {
  const { context, resolved, scenario } = input;
  const events: PendingLedgerEvent[] = [];
  let sourceOrder = 0;
  let includedObligationsMinor = 0n;
  const incomeDate = payday(period, context, input.calendar, collector);

  for (const obligation of context.requiredObligations) {
    const amount = valueOrThrow(obligation.amount, `required obligation ${obligation.id}`);
    const date = dueDate(period, obligation.due);
    if (obligation.includedInRoutineEnvelope) includedObligationsMinor += amount.minor;
    if (obligation.due.type === "MONTH_ONLY") {
      collector.add({
        id: `month-only-obligation-${obligation.id}`,
        category: "SYSTEM_ASSUMPTION",
        description: `${obligation.label} is conservatively placed on the first day of each cycle.`,
        source: "fy-sim/1.0.0 month-only timing rule",
        material: true,
        likelyEffect: "Tests payment coverage at the earliest conservative point in the cycle.",
        scope: "CURRENT_PATH",
        affectedPeriods: [period]
      });
    }
    events.push({
      ...eventBase(period, `obligation:${obligation.id}:${period}`, date, "REQUIRED_OBLIGATION", sourceOrder++),
      datePrecision: obligation.due.type === "MONTH_ONLY" ? "MONTH" : "EXACT",
      signedCashMinor: -amount.minor,
      reserveDeltaMinor: obligation.includedInRoutineEnvelope ? -amount.minor : 0n,
      required: true,
      evidenceState: obligation.amount.evidence.state,
      scope: "CURRENT_PATH",
      description: obligation.label
    });
  }

  if (includedObligationsMinor > resolved.routineSpendingTotal.minor) {
    return err(
      simulationError(
        "INVALID_CONTEXT",
        "Required obligations included in routine spending exceed the routine envelope."
      )
    );
  }

  const spreadAmount = resolved.routineSpendingTotal.minor - includedObligationsMinor;
  const dayCount = Number(incomeDate.slice(8, 10));
  const quotient = spreadAmount / BigInt(dayCount);
  const remainder = spreadAmount % BigInt(dayCount);
  for (let day = 1; day <= dayCount; day += 1) {
    const amount = quotient + (BigInt(day) <= remainder ? 1n : 0n);
    if (amount === 0n) continue;
    const date = dateInMonth(period, day);
    events.push({
      ...eventBase(period, `routine:${period}:${String(day).padStart(2, "0")}`, date, "ROUTINE_SPENDING", sourceOrder++),
      datePrecision: "EXACT",
      signedCashMinor: -amount,
      reserveDeltaMinor: -amount,
      required: false,
      evidenceState: context.routineSpending.total.evidence.state,
      scope: "CURRENT_PATH",
      description: "Undated routine-spending envelope"
    });
  }
  collector.add({
    id: "routine-spending-daily-spread",
    category: "SYSTEM_ASSUMPTION",
    description: "Undated routine spending is spread across calendar days in integer pence.",
    source: "fy-sim/1.0.0 routine-spending rule",
    material: true,
    likelyEffect: "Determines the intra-cycle minimum cash date without changing the monthly total.",
    scope: "CURRENT_PATH",
    affectedPeriods: [period]
  });

  for (const oneOff of context.confirmedOneOffEvents.filter((event) => event.period === period)) {
    const amount = valueOrThrow(oneOff.amount, `confirmed one-off ${oneOff.id}`);
    const date = oneOff.date ?? dateInMonth(period, 1);
    events.push({
      ...eventBase(period, `confirmed-one-off:${oneOff.id}`, date, "CONFIRMED_ONE_OFF", sourceOrder++),
      datePrecision: oneOff.datePrecision,
      signedCashMinor: -amount.minor,
      reserveDeltaMinor: 0n,
      required: false,
      evidenceState: oneOff.amount.evidence.state,
      scope: "CURRENT_PATH",
      description: oneOff.label
    });
  }

  if (scenario?.change.type === "ONE_OFF_PURCHASE" && scenario.change.paymentPeriod === period) {
    const change = scenario.change;
    const date = change.paymentDate ?? dateInMonth(period, 1);
    events.push({
      ...eventBase(period, `scenario-one-off:${scenario.id}`, date, "HYPOTHETICAL_ONE_OFF", sourceOrder++),
      datePrecision: change.datePrecision,
      signedCashMinor: -change.amount.minor,
      reserveDeltaMinor: 0n,
      required: false,
      evidenceState: "HYPOTHETICAL",
      scope: { type: "SCENARIO", scenarioId: scenario.id },
      description: change.purpose
    });
    collector.add({
      id: `scenario-change-${scenario.id}`,
      category: "HYPOTHETICAL_CHANGE",
      description: `One additional ${change.amount.minor}-pence ${change.purpose} payment in ${period}.`,
      source: "scenario definition",
      material: true,
      likelyEffect: "Reduces cleared cash and the unallocated safety buffer by the purchase amount.",
      scope: { type: "SCENARIO", scenarioId: scenario.id },
      affectedPeriods: [period]
    });
    if (change.datePrecision === "MONTH") {
      collector.add({
        id: `scenario-month-only-${scenario.id}`,
        category: "SYSTEM_ASSUMPTION",
        description: "The month-only purchase is placed on the first day of the spending cycle.",
        source: "fy-sim/1.0.0 conservative timing rule",
        material: true,
        likelyEffect: "Tests the purchase before later income in the selected cycle.",
        scope: { type: "SCENARIO", scenarioId: scenario.id },
        affectedPeriods: [period]
      });
    }
  }

  events.push({
    ...eventBase(period, `income:${context.income.id}:${period}`, incomeDate, "INCOME", sourceOrder),
    datePrecision: "EXACT",
    signedCashMinor: resolved.incomeAmount.minor,
    reserveDeltaMinor: 0n,
    required: false,
    evidenceState: context.income.amount.evidence.state,
    scope: "CURRENT_PATH",
    description: "Monthly net income"
  });

  const ordered = orderEvents(events);
  if (!ordered.ok) {
    return err(simulationError("SIMULATION_INVARIANT_FAILED", ordered.error.code));
  }
  return ok(ordered.value);
}

function confidenceFrom(manifest: AssumptionManifest): Confidence {
  return manifest.acceptedEstimates.length > 0 || manifest.systemAssumptions.length > 0
    ? "MEDIUM"
    : "HIGH";
}

function calculateInputIdentity(input: ProjectionExecutionInput): string {
  return inputIdentity({
    baselineId: input.baselineId,
    context: input.context,
    rules: input.rules,
    calendarVersion: input.calendar.version,
    scenario: input.scenario
  });
}

function executeProjection(input: ProjectionExecutionInput): SimulationOutcome<Projection> {
  const { context, resolved, rules } = input;
  const collector = new AssumptionCollector();
  const initialPeriods = Array.from({ length: rules.detailedPeriods }, (_, index) =>
    addMonths(context.projectionStartPeriod, index)
  );
  const goalProjectionPeriods = Array.from(
    { length: rules.maxGoalProjectionAllocationEvents },
    (_, index) => addMonths(context.projectionStartPeriod, index)
  );

  assumptionForEvidence(
    collector,
    "current-cleared-balance",
    "Current cleared balance used as the opening cash position.",
    context.currentAccount.clearedBalance,
    [context.projectionStartPeriod]
  );
  assumptionForEvidence(
    collector,
    "opening-spending-reserve",
    "Cash reserved for the opening spending cycle.",
    context.currentAccount.reservedSpending,
    [context.projectionStartPeriod]
  );
  assumptionForEvidence(
    collector,
    "desired-safety-buffer",
    "Preferred unallocated safety-buffer level.",
    context.desiredSafetyBuffer,
    goalProjectionPeriods
  );
  assumptionForEvidence(
    collector,
    "monthly-net-income",
    "Confirmed monthly net income is already after current deductions.",
    context.income.amount,
    goalProjectionPeriods
  );
  assumptionForEvidence(
    collector,
    "routine-spending-envelope",
    "Monthly routine-spending envelope used to reserve each cycle.",
    context.routineSpending.total,
    goalProjectionPeriods
  );
  assumptionForEvidence(
    collector,
    "normal-goal-budget",
    "Normal monthly amount available to buffer restoration and goals.",
    context.goalAllocationPolicy.normalContributionBudget,
    goalProjectionPeriods
  );
  for (const goal of context.goals) {
    assumptionForEvidence(
      collector,
      `goal-opening-${goal.id}`,
      `${goal.label} opening balance.`,
      goal.openingBalance,
      goalProjectionPeriods
    );
    assumptionForEvidence(
      collector,
      `goal-target-${goal.id}`,
      `${goal.label} nominal target.`,
      goal.targetBalance,
      goalProjectionPeriods
    );
  }
  for (const obligation of context.requiredObligations) {
    assumptionForEvidence(
      collector,
      `required-obligation-${obligation.id}`,
      `${obligation.label} recurring required amount.`,
      obligation.amount,
      goalProjectionPeriods
    );
  }
  for (const event of context.confirmedOneOffEvents) {
    assumptionForEvidence(
      collector,
      `confirmed-one-off-${event.id}`,
      `${event.label} confirmed one-off amount.`,
      event.amount,
      [event.period]
    );
  }
  collector.add({
    id: "goal-allocation-policy",
    category: "CONFIRMED_FACT",
    description: "Ordered goal slots, caps, overflow destination, and locked transfers are current policy.",
    source: context.version,
    material: true,
    likelyEffect: "Determines how each available goal pool changes goal balances and dates.",
    scope: "CURRENT_PATH",
    affectedPeriods: goalProjectionPeriods
  });
  collector.add({
    id: "nominal-zero-growth",
    category: "SYSTEM_ASSUMPTION",
    description: "Interest, inflation, and investment growth are zero in Slice 1.",
    source: "simulation-rules-specification §7.5",
    material: true,
    likelyEffect: "Goal balances and targets remain nominal; no unmodelled growth changes completion dates.",
    scope: "CURRENT_PATH",
    affectedPeriods: goalProjectionPeriods
  });
  collector.add({
    id: "credit-excluded",
    category: "UNKNOWN_OR_EXCLUDED",
    description: "Available overdraft is excluded from cash and safety buffer.",
    source: "simulation rules",
    material: true,
    likelyEffect: "Prevents available borrowing from improving cash or affordability metrics.",
    scope: "CURRENT_PATH",
    affectedPeriods: initialPeriods
  });
  collector.add({
    id: "employer-pension-non-cash",
    category: "UNKNOWN_OR_EXCLUDED",
    description: "Employer pension contributions are non-spendable and excluded from the cash ledger.",
    source: "Sarah v1 context",
    material: false,
    likelyEffect: "Prevents non-spendable employer pension value from entering the cash ledger.",
    scope: "CURRENT_PATH",
    affectedPeriods: initialPeriods
  });

  let cash = resolved.clearedBalance.minor;
  let activeReserve = resolved.reservedSpending.minor;
  let nextReserve = 0n;
  const goals: MutableGoal[] = resolved.goals.map((goal) => ({
    id: goal.id,
    label: goal.label,
    balanceMinor: goal.openingBalance.minor,
    targetMinor: goal.targetBalance.minor,
    paused: goal.paused
  }));
  const completions = new Map<string, GoalCompletion>();
  for (const goal of goals) {
    if (goal.balanceMinor >= goal.targetMinor) {
      completions.set(goal.id, {
        status: "COMPLETED",
        goalId: goal.id,
        date: context.snapshotDate,
        period: yearMonthOf(context.snapshotDate)
      });
    }
  }

  const detailedPeriods: ProjectionPeriod[] = [];
  const ledger: LedgerEvent[] = [];
  const allocationHistory: Projection["allocationHistory"][number][] = [];
  let requiredPaymentsCovered = true;
  let cashBecameNegative = cash < 0n;
  let minimumClearedCash = cash;
  let minimumSafetyBuffer = cash - activeReserve;
  let minimumBalanceEventId: string | null = null;
  let minimumBalanceDate: LocalDate | null = null;
  let projectedThrough = context.projectionStartPeriod;

  for (let cycleIndex = 0; cycleIndex < rules.maxGoalProjectionAllocationEvents; cycleIndex += 1) {
    const period = addMonths(context.projectionStartPeriod, cycleIndex);
    projectedThrough = period;
    const openingCash = cash;
    const openingReserve = activeReserve;
    const openingGoalBalances = new Map(goals.map((goal) => [goal.id, goal.balanceMinor]));
    let periodIncome = 0n;
    let periodRequired = 0n;
    let periodConfirmedOneOff = 0n;
    let periodHypotheticalOneOff = 0n;
    let periodLowestCash = cash;
    let periodLowestSafety = cash - activeReserve;
    let periodLowestEventId: string | null = null;
    let periodLowestDate: LocalDate | null = null;
    let periodRequiredCovered = true;
    let bufferRestoration = 0n;
    let bufferAtAllocation = cash - activeReserve;
    const periodContributions = new Map(goals.map((goal) => [goal.id, 0n]));

    const pendingResult = staticEventsForPeriod(period, input, collector);
    if (!pendingResult.ok) return pendingResult;
    const pending = [...pendingResult.value];
    let incomeProcessed = false;

    const recordState = (event: PendingLedgerEvent): void => {
      const totalReserve = activeReserve + nextReserve;
      const safety = cash - totalReserve;
      const recorded: LedgerEvent = {
        ...event,
        runningCashMinor: cash,
        remainingReservedMinor: totalReserve,
        safetyBufferMinor: safety
      };
      ledger.push(recorded);
      if (cash < periodLowestCash) {
        periodLowestCash = cash;
        periodLowestEventId = event.id;
        periodLowestDate = event.date;
      }
      if (cash < minimumClearedCash) {
        minimumClearedCash = cash;
        minimumBalanceEventId = event.id;
        minimumBalanceDate = event.date;
      }
      if (safety < periodLowestSafety) periodLowestSafety = safety;
      if (safety < minimumSafetyBuffer) minimumSafetyBuffer = safety;
      if (cash < 0n) cashBecameNegative = true;
    };

    for (const event of pending) {
      if (event.type === "REQUIRED_OBLIGATION" && cash + event.signedCashMinor < 0n) {
        periodRequiredCovered = false;
        requiredPaymentsCovered = false;
      }

      if (event.type === "INCOME") {
        const preFundingBuffer = cash - activeReserve - nextReserve;
        cash += event.signedCashMinor;
        periodIncome += event.signedCashMinor;
        recordState(event);
        incomeProcessed = true;

        const reserveEvent: PendingLedgerEvent = {
          ...eventBase(
            period,
            `reserve-next-cycle:${period}`,
            event.date,
            "NEXT_CYCLE_RESERVE",
            Number.MAX_SAFE_INTEGER - 1
          ),
          datePrecision: "EXACT",
          signedCashMinor: 0n,
          reserveDeltaMinor: resolved.routineSpendingTotal.minor,
          required: false,
          evidenceState: context.routineSpending.total.evidence.state,
          scope: "CURRENT_PATH",
          dependsOn: [event.id],
          description: "Reserve next cycle's routine spending"
        };
        nextReserve += reserveEvent.reserveDeltaMinor;
        recordState(reserveEvent);

        const locked = context.goalAllocationPolicy.lockedAllocations.filter(
          (allocation) => allocation.period === period
        );
        let allocations: readonly Readonly<{ goalId: string; amount: Money }>[];
        if (locked.length > 0) {
          allocations = goals.map((goal) => ({
            goalId: goal.id,
            amount: gbp(
              locked
                .filter((allocation) => allocation.goalId === goal.id)
                .reduce((sum, allocation) => sum + allocation.amount.minor, 0n)
            )
          }));
        } else {
          const shortfall =
            resolved.desiredSafetyBuffer.minor > preFundingBuffer
              ? resolved.desiredSafetyBuffer.minor - preFundingBuffer
              : 0n;
          bufferRestoration =
            shortfall < resolved.normalContributionBudget.minor
              ? shortfall
              : resolved.normalContributionBudget.minor;
          const requestedPool = resolved.normalContributionBudget.minor - bufferRestoration;
          const protectedBuffer =
            preFundingBuffer + bufferRestoration > 0n ? preFundingBuffer + bufferRestoration : 0n;
          const available = cash - activeReserve - nextReserve - protectedBuffer;
          const safePool = available <= 0n ? 0n : available < requestedPool ? available : requestedPool;
          allocations = allocateGoalPool({
            goalPool: gbp(safePool),
            goals: goals.map((goal) => ({
              goalId: goal.id,
              balanceMinor: goal.balanceMinor,
              targetMinor: goal.targetMinor,
              paused: goal.paused
            })),
            slots: context.goalAllocationPolicy.orderedSlots,
            overflowGoalId: context.goalAllocationPolicy.overflowGoalId
          }).allocations;
        }

        for (const allocation of allocations) {
          if (allocation.amount.minor === 0n) continue;
          const goal = goals.find((candidate) => candidate.id === allocation.goalId);
          if (!goal) {
            return err(
              simulationError(
                "SIMULATION_INVARIANT_FAILED",
                `Allocation references unknown goal ${allocation.goalId}.`
              )
            );
          }
          if (cash - allocation.amount.minor < activeReserve + nextReserve) {
            return err(
              simulationError(
                "SIMULATION_INVARIANT_FAILED",
                "Goal allocation would consume reserved cash."
              )
            );
          }
          const needed = goal.targetMinor - goal.balanceMinor;
          const actual = allocation.amount.minor < needed ? allocation.amount.minor : needed;
          cash -= actual;
          goal.balanceMinor += actual;
          periodContributions.set(goal.id, (periodContributions.get(goal.id) ?? 0n) + actual);
          const transferEvent: PendingLedgerEvent = {
            ...eventBase(
              period,
              `goal-transfer:${goal.id}:${period}`,
              event.date,
              "GOAL_TRANSFER",
              Number.MAX_SAFE_INTEGER
            ),
            datePrecision: "EXACT",
            signedCashMinor: -actual,
            reserveDeltaMinor: 0n,
            required: false,
            evidenceState: "CONFIRMED",
            scope: input.scenario === null ? "CURRENT_PATH" : { type: "SCENARIO", scenarioId: input.scenario.id },
            dependsOn: [event.id],
            goalId: goal.id,
            description: `Goal contribution: ${goal.label}`
          };
          recordState(transferEvent);
          if (goal.balanceMinor >= goal.targetMinor && !completions.has(goal.id)) {
            completions.set(goal.id, {
              status: "COMPLETED",
              goalId: goal.id,
              date: event.date,
              period
            });
          }
        }
        bufferAtAllocation = cash - activeReserve - nextReserve;
        continue;
      }

      cash += event.signedCashMinor;
      activeReserve += event.reserveDeltaMinor;
      if (activeReserve < 0n) {
        return err(
          simulationError("SIMULATION_INVARIANT_FAILED", "Active spending reserve became negative.")
        );
      }
      if (event.type === "REQUIRED_OBLIGATION") periodRequired += -event.signedCashMinor;
      if (event.type === "CONFIRMED_ONE_OFF") periodConfirmedOneOff += -event.signedCashMinor;
      if (event.type === "HYPOTHETICAL_ONE_OFF") periodHypotheticalOneOff += -event.signedCashMinor;
      recordState(event);
    }

    if (!incomeProcessed) {
      return err(simulationError("SIMULATION_INVARIANT_FAILED", `No income event in ${period}.`));
    }
    if (activeReserve !== 0n) {
      return err(
        simulationError(
          "SIMULATION_INVARIANT_FAILED",
          `Active reserve did not reconcile to zero in ${period}: ${activeReserve}.`
        )
      );
    }

    const goalPeriodStates: GoalPeriodState[] = goals.map((goal) => ({
      goalId: goal.id,
      openingBalance: gbp(openingGoalBalances.get(goal.id) ?? 0n),
      contribution: gbp(periodContributions.get(goal.id) ?? 0n),
      closingBalance: gbp(goal.balanceMinor)
    }));
    const periodResult: ProjectionPeriod = {
      period,
      openingCash: signedGbp(openingCash),
      openingReservedCash: gbp(openingReserve),
      income: gbp(periodIncome),
      routineSpending: resolved.routineSpendingTotal,
      requiredObligations: gbp(periodRequired),
      confirmedOneOffs: gbp(periodConfirmedOneOff),
      hypotheticalOneOffs: gbp(periodHypotheticalOneOff),
      bufferRestoration: gbp(bufferRestoration),
      goalContributions: goalPeriodStates,
      closingCash: signedGbp(cash),
      closingReservedCash: gbp(nextReserve),
      closingSafetyBuffer: signedGbp(cash - nextReserve),
      lowestClearedCash: signedGbp(periodLowestCash),
      lowestSafetyBufferMinor: periodLowestSafety,
      lowestBalanceEventId: periodLowestEventId,
      lowestBalanceDate: periodLowestDate,
      requiredPaymentsCovered: periodRequiredCovered,
      bufferAtAllocationMinor: bufferAtAllocation
    };
    if (cycleIndex < rules.detailedPeriods) detailedPeriods.push(periodResult);
    allocationHistory.push({
      period,
      safetyBufferAfterAllocationMinor: bufferAtAllocation,
      goalBalances: goals.map((goal) => ({ goalId: goal.id, balance: gbp(goal.balanceMinor) }))
    });

    activeReserve = nextReserve;
    nextReserve = 0n;

    if (cycleIndex + 1 >= rules.detailedPeriods && completions.size === goals.length) break;
  }

  for (const goal of goals) {
    if (!completions.has(goal.id)) {
      completions.set(goal.id, {
        status: "NOT_REACHED_WITHIN_HORIZON",
        goalId: goal.id,
        projectedThrough,
        allocationEventsEvaluated: allocationHistory.length
      });
    }
  }

  const manifest = collector.manifest();
  const horizonEntry = allocationHistory[Math.min(rules.classificationAllocationEvents, allocationHistory.length) - 1];
  if (!horizonEntry) {
    return err(simulationError("SIMULATION_INVARIANT_FAILED", "Projection produced no periods."));
  }

  const result: Projection = {
    baselineId: input.baselineId,
    scenarioId: input.scenario?.id ?? null,
    parentScenarioId: input.scenario?.parentScenarioId ?? null,
    contextId: context.id,
    contextVersion: context.version,
    rulesVersion: rules.version,
    calendarVersion: input.calendar.version,
    projectionHorizon: {
      classificationAllocationEvents: rules.classificationAllocationEvents,
      detailedPeriods: rules.detailedPeriods,
      maxGoalProjectionAllocationEvents: rules.maxGoalProjectionAllocationEvents
    },
    inputIdentity: calculateInputIdentity(input),
    periods: detailedPeriods,
    ledger,
    goalCompletions: goals.map((goal) => completions.get(goal.id)!),
    goalBalancesAtClassificationHorizon: horizonEntry.goalBalances,
    allocationHistory,
    assumptions: manifest,
    confidence: confidenceFrom(manifest),
    requiredPaymentsCovered,
    cashBecameNegative,
    creditRequired: cashBecameNegative,
    creditUsed: gbp(0n),
    minimumClearedCash: signedGbp(minimumClearedCash),
    minimumSafetyBufferMinor: minimumSafetyBuffer,
    minimumBalanceEventId,
    minimumBalanceDate,
    projectedAllocationEvents: allocationHistory.length,
    projectedThrough
  };

  return ok(deepFreeze(result) as Projection);
}

function validateRules(rules: SimulationRules): SimulationError | null {
  if (
    rules.classificationAllocationEvents !== 6 ||
    rules.detailedPeriods !== 6 ||
    rules.maxGoalProjectionAllocationEvents !== 120
  ) {
    return simulationError(
      "INVALID_CONTEXT",
      "Slice 1 requires the versioned 6/6/120 MVP projection horizons."
    );
  }
  return null;
}

export function generateBaseline(request: BaselineRequest): SimulationOutcome<Projection> {
  const rulesError = validateRules(request.rules);
  if (rulesError) return err(rulesError);
  const resolved = resolveFinancialContext(request.context);
  if (!resolved.ok) return resolved;
  return executeProjection({
    baselineId: request.baselineId,
    context: request.context,
    resolved: resolved.value,
    rules: request.rules,
    calendar: request.calendar,
    scenario: null
  });
}

function validateScenario(
  definition: ScenarioDefinition,
  context: FinancialContextSnapshot
): SimulationError | null {
  if (definition.change.type !== "ONE_OFF_PURCHASE") {
    return simulationError(
      "UNSUPPORTED_SCENARIO_TYPE",
      `Scenario type ${definition.change.requestedType} is outside Slice 1.`
    );
  }
  const change: OneOffPurchaseChange = definition.change;
  if (change.amount.currency !== "GBP" || change.amount.minor <= 0n) {
    return simulationError("INVALID_MONEY", "Purchase amount must be positive GBP integer pence.");
  }
  const start = context.projectionStartPeriod;
  const final = addMonths(start, 119);
  if (change.paymentPeriod < start || change.paymentPeriod > final) {
    return simulationError("INVALID_CONTEXT", "Purchase period is outside the 120-event horizon.");
  }
  if (change.paymentDate !== null && yearMonthOf(change.paymentDate) !== change.paymentPeriod) {
    return simulationError("INVALID_CONTEXT", "Purchase date does not match its payment period.");
  }
  return null;
}

export function simulateOneOffPurchase(
  request: ScenarioRequest
): SimulationOutcome<ScenarioSimulationResult> {
  const scenarioError = validateScenario(request.scenario, request.context);
  if (scenarioError) return err(scenarioError);
  if (
    request.baseline.scenarioId !== null ||
    request.baseline.baselineId !== request.baselineId ||
    request.scenario.baselineId !== request.baselineId ||
    request.baseline.contextId !== request.context.id ||
    request.baseline.contextVersion !== request.context.version ||
    request.baseline.rulesVersion !== request.rules.version ||
    request.baseline.calendarVersion !== request.calendar.version
  ) {
    return err(simulationError("BASELINE_MISMATCH", "Scenario and baseline identities do not match."));
  }

  const regenerated = generateBaseline(request);
  if (!regenerated.ok) return regenerated;
  if (regenerated.value.inputIdentity !== request.baseline.inputIdentity) {
    return err(
      simulationError("BASELINE_MISMATCH", "Baseline input identity does not match the supplied inputs.")
    );
  }

  const resolved = resolveFinancialContext(request.context);
  if (!resolved.ok) return resolved;
  const projected = executeProjection({
    baselineId: request.baselineId,
    context: request.context,
    resolved: resolved.value,
    rules: request.rules,
    calendar: request.calendar,
    scenario: request.scenario
  });
  if (!projected.ok) return projected;

  const comparison = compareAndClassify({
    baseline: request.baseline,
    scenario: projected.value,
    definition: request.scenario,
    desiredSafetyBuffer: resolved.value.desiredSafetyBuffer,
    normalGoalBudget: resolved.value.normalContributionBudget,
    rules: request.rules
  });

  return ok(
    deepFreeze({
      baseline: request.baseline,
      scenario: projected.value,
      comparison
    }) as ScenarioSimulationResult
  );
}

export interface CreateOneOffPurchaseScenarioInput {
  readonly id: string;
  readonly baselineId: string;
  readonly derivedFromScenarioId?: string | null;
  readonly amount: Money;
  readonly purpose: string;
  readonly paymentPeriod: YearMonth;
  readonly paymentDate?: LocalDate | null;
  readonly datePrecision?: "EXACT" | "MONTH";
}

export function createOneOffPurchaseScenario(
  input: CreateOneOffPurchaseScenarioInput
): SimulationOutcome<ScenarioDefinition> {
  if (input.amount.currency !== "GBP" || input.amount.minor <= 0n) {
    return err(simulationError("INVALID_MONEY", "Purchase amount must be positive GBP."));
  }
  const scenario: ScenarioDefinition = {
    id: input.id,
    baselineId: input.baselineId,
    parentScenarioId: null,
    derivedFromScenarioId: input.derivedFromScenarioId ?? null,
    change: {
      type: "ONE_OFF_PURCHASE",
      amount: input.amount,
      purpose: input.purpose,
      paymentPeriod: input.paymentPeriod,
      paymentDate: input.paymentDate ?? null,
      datePrecision: input.datePrecision ?? "MONTH",
      fundingSource: "CURRENT_ACCOUNT",
      paymentPattern: "SINGLE",
      costTreatment: "ADDITIONAL_TO_ROUTINE_SPENDING"
    }
  };
  return ok(deepFreeze(scenario) as ScenarioDefinition);
}

export function periodByMonth(projection: Projection, period: string): ProjectionPeriod {
  const parsed = mustYearMonth(period);
  const result = projection.periods.find((item) => item.period === parsed);
  if (!result) throw new RangeError(`Detailed period ${period} was not projected.`);
  return result;
}

export function goalCompletion(projection: Projection, goalId: string): GoalCompletion {
  const completion = projection.goalCompletions.find((item) => item.goalId === goalId);
  if (!completion) throw new RangeError(`Unknown goal ${goalId}.`);
  return completion;
}
