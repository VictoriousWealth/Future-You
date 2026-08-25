"use client";

import { useEffect, useRef, useState } from "react";
import type {
  FinancialContextPreviewDTO,
  FinancialOnboardingDraftDTO
} from "../../../application/onboarding/contracts";
import type { BrowserSupabaseConfiguration } from "../../auth/browser-supabase-client";
import { SignOutButton } from "../../auth/sign-out-button";
import { FutureYouWordmark } from "../../brand/future-you-wordmark";
import { FinancialContextPreviewView } from "./financial-context-preview-view";

interface GoalForm {
  id: string;
  label: string;
  currentBalance: string;
  targetBalance: string;
  contribution: string;
  committedTransfer: string;
}

interface ObligationForm {
  id: string;
  label: string;
  amount: string;
  dueType: "month_only" | "day_of_month";
  dueDay: string;
}

interface FormState {
  snapshotDate: string;
  actualCash: string;
  reserve: string;
  overdraft: string;
  income: string;
  paydayType: "last_working_day" | "fixed_day";
  paydayDay: string;
  routineSpending: string;
  obligationDeclaration: "none" | "provided";
  obligations: ObligationForm[];
  desiredBuffer: string;
  goals: GoalForm[];
  transferDeclaration: "" | "none" | "provided";
  overflowGoalId: string;
  workplace: string;
}

const STEP_TITLES = [
  "A picture of today",
  "Money currently available",
  "Income and payday",
  "Spending before and after payday",
  "Your preferred safety buffer",
  "The goals you care about",
  "Optional workplace",
  "Review your current path"
] as const;

const initialForm = (
  snapshotDate: string,
  draft: FinancialOnboardingDraftDTO | null
): FormState => {
  if (draft === null) {
    return {
      snapshotDate,
      actualCash: "",
      reserve: "",
      overdraft: "0",
      income: "",
      paydayType: "last_working_day",
      paydayDay: "28",
      routineSpending: "",
      obligationDeclaration: "none",
      obligations: [],
      desiredBuffer: "",
      goals: [{
        id: "goal-1",
        label: "",
        currentBalance: "",
        targetBalance: "",
        contribution: "",
        committedTransfer: ""
      }],
      transferDeclaration: "",
      overflowGoalId: "",
      workplace: ""
    };
  }
  const transferByGoal = new Map(
    draft.committedGoalTransfers.items.map((item) => [item.goalId, item.amount.amount])
  );
  return {
    snapshotDate: draft.snapshotDate,
    actualCash: draft.currentAccount.actualClearedBalance.amount,
    reserve: draft.currentAccount.remainingCurrentCycleReserve.amount,
    overdraft: draft.currentAccount.overdraftLimit.amount,
    income: draft.income.monthlyNetIncome.amount,
    paydayType: draft.income.paydayRule.type,
    paydayDay:
      draft.income.paydayRule.type === "fixed_day" ? String(draft.income.paydayRule.day) : "28",
    routineSpending: draft.routineSpending.futureMonthlyTotal.amount,
    obligationDeclaration: draft.requiredObligations.declaration,
    obligations: draft.requiredObligations.items.map((item) => ({
      id: item.id,
      label: item.label,
      amount: item.amount.amount,
      dueType: item.due.type,
      dueDay: item.due.type === "day_of_month" ? String(item.due.day) : "1"
    })),
    desiredBuffer: draft.desiredSafetyBuffer.amount,
    goals: draft.goals.map((goal) => ({
      id: goal.id,
      label: goal.label,
      currentBalance: goal.currentBalance.amount,
      targetBalance: goal.targetBalance.amount,
      contribution: goal.normalContribution.amount,
      committedTransfer: transferByGoal.get(goal.id) ?? ""
    })),
    transferDeclaration: draft.committedGoalTransfers.declaration,
    overflowGoalId: draft.goalPolicy.overflowGoalId ?? "",
    workplace: draft.workplace?.name ?? ""
  };
};

function money(amount: string) {
  return { currency: "GBP" as const, amount };
}

function fact(amount: string) {
  return {
    ...money(amount),
    evidenceState: "confirmed" as const,
    evidenceSource: "Manual onboarding confirmed by user"
  };
}

function buildDraft(
  form: FormState,
  draftKey: string,
  baseDraft: FinancialOnboardingDraftDTO | null
): FinancialOnboardingDraftDTO {
  const snapshotDate = form.snapshotDate;
  const activeGoals = form.goals;
  const transfers = activeGoals
    .filter((goal) => goal.committedTransfer.trim() !== "")
    .map((goal) => ({
      goalId: goal.id,
      amount: money(goal.committedTransfer),
      timing: "after_next_funding_event" as const,
      evidenceState: "confirmed" as const
    }));
  return {
    identity: baseDraft?.identity ?? {
        contextId: `context-manual-${draftKey}`,
        contextVersion: `manual-${draftKey}@${snapshotDate}`,
        currentAccountId: `current-account-${draftKey}`,
        incomeId: `net-income-${draftKey}`
      },
    snapshotDate,
    currentAccount: {
      actualClearedBalance: fact(form.actualCash),
      remainingCurrentCycleReserve: fact(form.reserve),
      overdraftLimit: money(form.overdraft || "0")
    },
    desiredSafetyBuffer: fact(form.desiredBuffer),
    income: {
      monthlyNetIncome: fact(form.income),
      paydayRule:
        form.paydayType === "last_working_day"
          ? { type: "last_working_day" }
          : { type: "fixed_day", day: Number(form.paydayDay) }
    },
    routineSpending: {
      futureMonthlyTotal: fact(form.routineSpending),
      items: baseDraft?.routineSpending.items ?? []
    },
    requiredObligations:
      form.obligationDeclaration === "provided"
        ? {
            declaration: "provided",
            items: form.obligations.map((obligation) => ({
              id: obligation.id,
              label: obligation.label,
              amount: fact(obligation.amount),
              due:
                obligation.dueType === "month_only"
                  ? { type: "month_only" as const }
                  : { type: "day_of_month" as const, day: Number(obligation.dueDay) },
              includedInRoutineEnvelope: true
            }))
          }
        : { declaration: "none", items: [] },
    goals: activeGoals.map((goal) => {
      const previous = baseDraft?.goals.find((item) => item.id === goal.id);
      return {
        id: goal.id,
        label: goal.label,
        currentBalance: fact(goal.currentBalance),
        targetBalance: fact(goal.targetBalance),
        normalContribution: money(goal.contribution),
        paused: previous?.paused ?? false
      };
    }),
    goalPolicy: {
      contributionBudgetEvidenceSource:
        baseDraft?.goalPolicy.contributionBudgetEvidenceSource ??
        "Derived from manual per-goal contribution caps",
      allocationOrder: activeGoals.map((goal) => goal.id),
      overflowGoalId: form.overflowGoalId || null
    },
    committedGoalTransfers:
      form.transferDeclaration === "provided"
        ? { declaration: "provided", items: transfers }
        : { declaration: "none", items: [] },
    confirmedOneOffEvents: [],
    informationalContext: baseDraft?.informationalContext ?? [],
    workplace: form.workplace.trim()
      ? {
          name: form.workplace.trim(),
          associationSource: "user_provided",
          verificationStatus: "unverified"
        }
      : null
  };
}

export function ManualOnboardingFlow({
  configuration,
  snapshotDate,
  draftKey,
  mode = "initial",
  expectedCurrentContextVersionId = null,
  initialDraft = null
}: {
  configuration: BrowserSupabaseConfiguration;
  snapshotDate: string;
  draftKey: string;
  mode?: "initial" | "revision";
  expectedCurrentContextVersionId?: string | null;
  initialDraft?: FinancialOnboardingDraftDTO | null;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => initialForm(snapshotDate, initialDraft));
  const [preview, setPreview] = useState<FinancialContextPreviewDTO | null>(null);
  const [issues, setIssues] = useState<readonly { path: string; message: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (issues.length > 0) errorRef.current?.focus();
  }, [issues]);

  const update = (field: keyof Omit<FormState, "goals" | "obligations">, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setPreview(null);
  };
  const updateGoal = (index: number, field: keyof GoalForm, value: string) => {
    setForm((current) => ({
      ...current,
      goals: current.goals.map((goal, goalIndex) =>
        goalIndex === index ? { ...goal, [field]: value } : goal
      )
    }));
    setPreview(null);
  };
  const setObligationDeclaration = (value: "none" | "provided") => {
    setForm((current) => ({
      ...current,
      obligationDeclaration: value,
      obligations:
        value === "provided" && current.obligations.length === 0
          ? [{ id: "required-1", label: "", amount: "", dueType: "month_only", dueDay: "1" }]
          : current.obligations
    }));
    setPreview(null);
  };
  const updateObligation = (index: number, field: keyof ObligationForm, value: string) => {
    setForm((current) => ({
      ...current,
      obligations: current.obligations.map((obligation, obligationIndex) =>
        obligationIndex === index ? { ...obligation, [field]: value } : obligation
      )
    }));
    setPreview(null);
  };
  const addObligation = () => {
    setForm((current) => ({
      ...current,
      obligations: [
        ...current.obligations,
        {
          id: `required-${current.obligations.length + 1}`,
          label: "",
          amount: "",
          dueType: "month_only",
          dueDay: "1"
        }
      ]
    }));
  };
  const addGoal = () => {
    setForm((current) => ({
      ...current,
      goals: [...current.goals, {
        id: `goal-${current.goals.length + 1}`,
        label: "",
        currentBalance: "",
        targetBalance: "",
        contribution: "",
        committedTransfer: ""
      }]
    }));
  };

  const requestPreview = async () => {
    setBusy(true);
    setIssues([]);
    try {
      const response = await fetch("/api/v1/financial-context/previews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: buildDraft(form, draftKey, initialDraft),
          mode,
          expectedCurrentContextVersionId
        })
      });
      const body = await response.json();
      if (!response.ok) {
        setIssues(body.error?.details?.issues ?? [{ path: "$", message: body.error?.message ?? "Preview failed." }]);
        return;
      }
      setPreview(body);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    setIssues([]);
    try {
      const response = await fetch(
        mode === "initial"
          ? "/api/v1/financial-context/versions"
          : "/api/v1/financial-context/current/revisions",
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: buildDraft(form, draftKey, initialDraft),
          mode,
          expectedCurrentContextVersionId,
          requestId: `${mode === "initial" ? "confirm" : "revise"}-${draftKey}`,
          reviewedCanonicalRequestHash: preview.candidate.canonicalRequestHash
        })
        }
      );
      const body = await response.json();
      if (!response.ok) {
        setIssues(body.error?.details?.issues ?? [{ path: "$", message: body.error?.message ?? "Confirmation failed." }]);
        return;
      }
      window.location.assign("/ask");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={`onboarding-page ${mode === "revision" ? "is-revision" : ""}`} aria-busy={busy}>
      <header className="onboarding-header">
        <div className="fy-wordmark" aria-label="Future You"><FutureYouWordmark/></div>
        <div>
          <p className="eyebrow">{mode === "initial" ? "Build current path" : "Correct current facts"}</p>
          <span>Step {step + 1} of {STEP_TITLES.length}</span>
        </div>
        <SignOutButton configuration={configuration} />
      </header>
      {mode === "revision" ? (
        <aside className="revision-notice" aria-labelledby="revision-notice-title">
          <span>Immutable correction</span>
          <h2 id="revision-notice-title">You’re creating a new version of your financial plan.</h2>
          <p>Your current version and every historical what-if remain unchanged. Preview comes before activation.</p>
        </aside>
      ) : null}
      <div
        className="step-progress"
        role="progressbar"
        aria-label="Financial context progress"
        aria-valuemin={1}
        aria-valuemax={STEP_TITLES.length}
        aria-valuenow={step + 1}
        aria-valuetext={`Step ${step + 1} of ${STEP_TITLES.length}: ${STEP_TITLES[step]}`}
      >
        <span style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }} />
      </div>
      <section className="onboarding-card">
        <h1 ref={headingRef} tabIndex={-1}>{STEP_TITLES[step]}</h1>
        {step === 0 && (
          <div className="intro-copy">
            <p>Tell Future You what is true today. We’ll use it to show where your current path leads before you test any new decision.</p>
            <p>Nothing becomes your financial context until you review and confirm the server-generated preview.</p>
          </div>
        )}
        {step === 1 && (
          <div className="form-stack">
            <label>Balance snapshot date<input aria-label="Balance snapshot date" type="date" value={form.snapshotDate} onChange={(event) => update("snapshotDate", event.target.value)} /></label>
            <label>Actual cleared current-account balance<input aria-label="Actual cleared balance" inputMode="decimal" value={form.actualCash} onChange={(event) => update("actualCash", event.target.value)} /></label>
            <label>Still reserved before your next payday<input aria-label="Remaining current-cycle reserve" inputMode="decimal" value={form.reserve} onChange={(event) => update("reserve", event.target.value)} /></label>
            <label>Overdraft limit <small>Optional; never counted as cash</small><input aria-label="Overdraft limit" inputMode="decimal" value={form.overdraft} onChange={(event) => update("overdraft", event.target.value)} /></label>
          </div>
        )}
        {step === 2 && (
          <div className="form-stack">
            <label>Monthly take-home pay<input aria-label="Monthly take-home pay" inputMode="decimal" value={form.income} onChange={(event) => update("income", event.target.value)} /></label>
            <label>Payday rule<select aria-label="Payday rule" value={form.paydayType} onChange={(event) => update("paydayType", event.target.value)}><option value="last_working_day">Last working day</option><option value="fixed_day">Fixed day each month</option></select></label>
            {form.paydayType === "fixed_day" && <label>Day of month<input aria-label="Payday day" inputMode="numeric" value={form.paydayDay} onChange={(event) => update("paydayDay", event.target.value)} /></label>}
          </div>
        )}
        {step === 3 && (
          <div className="form-stack">
            <p>Your remaining reserve covers only the period from today to payday. This separate amount is the full routine spending for future funded cycles.</p>
            <label>Full future monthly routine spending<input aria-label="Future monthly routine spending" inputMode="decimal" value={form.routineSpending} onChange={(event) => update("routineSpending", event.target.value)} /></label>
            <fieldset className="choice-group">
              <legend>Required recurring payments inside this amount</legend>
              <label><input type="radio" checked={form.obligationDeclaration === "none"} onChange={() => setObligationDeclaration("none")} /> None</label>
              <label><input type="radio" checked={form.obligationDeclaration === "provided"} onChange={() => setObligationDeclaration("provided")} /> I have required payments to list</label>
            </fieldset>
            {form.obligationDeclaration === "provided" && form.obligations.map((obligation, index) => (
              <fieldset className="goal-form" key={obligation.id}>
                <legend>Required payment {index + 1}</legend>
                <label>Name<input aria-label={`Required payment ${index + 1} name`} value={obligation.label} onChange={(event) => updateObligation(index, "label", event.target.value)} /></label>
                <label>Monthly amount<input aria-label={`Required payment ${index + 1} amount`} inputMode="decimal" value={obligation.amount} onChange={(event) => updateObligation(index, "amount", event.target.value)} /></label>
                <label>Due-date precision<select aria-label={`Required payment ${index + 1} due date`} value={obligation.dueType} onChange={(event) => updateObligation(index, "dueType", event.target.value)}><option value="month_only">Month only</option><option value="day_of_month">Known day of month</option></select></label>
                {obligation.dueType === "day_of_month" && <label>Day of month<input aria-label={`Required payment ${index + 1} due day`} inputMode="numeric" value={obligation.dueDay} onChange={(event) => updateObligation(index, "dueDay", event.target.value)} /></label>}
              </fieldset>
            ))}
            {form.obligationDeclaration === "provided" && <button type="button" className="secondary-button" onClick={addObligation}>Add required payment</button>}
          </div>
        )}
        {step === 4 && (
          <div className="form-stack">
            <p>This is a preference, not a hard affordability threshold.</p>
            <label>Desired unallocated safety buffer<input aria-label="Desired safety buffer" inputMode="decimal" value={form.desiredBuffer} onChange={(event) => update("desiredBuffer", event.target.value)} /></label>
          </div>
        )}
        {step === 5 && (
          <div className="form-stack">
            {form.goals.map((goal, index) => (
              <fieldset key={goal.id} className="goal-form">
                <legend>Goal {index + 1}</legend>
                <label>Name<input aria-label={`Goal ${index + 1} name`} value={goal.label} onChange={(event) => updateGoal(index, "label", event.target.value)} /></label>
                <label>Current balance<input aria-label={`Goal ${index + 1} current balance`} inputMode="decimal" value={goal.currentBalance} onChange={(event) => updateGoal(index, "currentBalance", event.target.value)} /></label>
                <label>Target balance<input aria-label={`Goal ${index + 1} target balance`} inputMode="decimal" value={goal.targetBalance} onChange={(event) => updateGoal(index, "targetBalance", event.target.value)} /></label>
                <label>Normal monthly contribution<input aria-label={`Goal ${index + 1} contribution`} inputMode="decimal" value={goal.contribution} onChange={(event) => updateGoal(index, "contribution", event.target.value)} /></label>
                {form.transferDeclaration === "provided" && <label>Already committed after next payday<input aria-label={`Goal ${index + 1} committed transfer`} inputMode="decimal" value={goal.committedTransfer} onChange={(event) => updateGoal(index, "committedTransfer", event.target.value)} /></label>}
              </fieldset>
            ))}
            <button type="button" className="secondary-button" onClick={addGoal}>Add another goal</button>
            <fieldset className="choice-group"><legend>Transfers at the next funding event</legend><label><input type="radio" checked={form.transferDeclaration === "none"} onChange={() => update("transferDeclaration", "none")} /> None</label><label><input type="radio" checked={form.transferDeclaration === "provided"} onChange={() => update("transferDeclaration", "provided")} /> I have confirmed transfers</label></fieldset>
            {form.transferDeclaration === "" && <p className="field-guidance">Choose one transfer declaration to continue.</p>}
            <label>Overflow destination <small>Optional</small><select aria-label="Overflow destination" value={form.overflowGoalId} onChange={(event) => update("overflowGoalId", event.target.value)}><option value="">Keep overflow as cash</option>{form.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.label || goal.id}</option>)}</select></label>
          </div>
        )}
        {step === 6 && (
          <div className="form-stack">
            <p>Workplace information is separate, optional and unverified. It cannot change this calculation.</p>
            <label>Employer or workplace <small>Optional</small><input aria-label="Employer or workplace" value={form.workplace} onChange={(event) => update("workplace", event.target.value)} /></label>
          </div>
        )}
        {step === 7 && (
          <div className="onboarding-review-stage">
            {!preview && <p>Future You will now model your current path on the server. {mode === "initial" ? "No financial context has been saved yet." : "Your current version will remain active until you confirm the preview."}</p>}
            {preview && <FinancialContextPreviewView preview={preview} />}
            {!preview && <button type="button" className="primary-button" disabled={busy} onClick={requestPreview}>{busy ? "Building preview…" : "Preview my current path"}</button>}
            {preview && <button type="button" className="primary-button" disabled={busy} onClick={confirm}>{busy ? "Confirming…" : "Confirm this financial context"}</button>}
          </div>
        )}
        {busy ? <p className="onboarding-busy" role="status">Your confirmed values are being handled securely…</p> : null}
        {issues.length > 0 && <div className="form-errors" role="alert" ref={errorRef} tabIndex={-1}><strong>Check these fields</strong><ul>{issues.map((item, index) => <li key={`${item.path}-${index}`}><code>{item.path}</code>: {item.message}</li>)}</ul></div>}
        <footer className="onboarding-actions">
          {step > 0 && <button type="button" className="secondary-button" onClick={() => setStep((current) => current - 1)}>Back</button>}
          {step < STEP_TITLES.length - 1 && <button type="button" className="primary-button" disabled={step === 5 && form.transferDeclaration === ""} onClick={() => setStep((current) => current + 1)}>{step === 0 ? "Build my current path" : "Continue"}</button>}
        </footer>
      </section>
    </main>
  );
}
