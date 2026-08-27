"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type {
  FinancialContextPreviewDTO,
  FinancialOnboardingDraftDTO
} from "../../../application/onboarding/contracts";
import { ProductShell } from "../../product-shell/product-shell";

export interface GoalEditValues {
  readonly label: string;
  readonly currentBalance: string;
  readonly targetBalance: string;
  readonly contribution: string;
  readonly paused: boolean;
}

export function buildGoalDraft(
  draft: FinancialOnboardingDraftDTO,
  goalId: string,
  values: GoalEditValues,
  mode: "edit" | "create"
): FinancialOnboardingDraftDTO {
  if (mode === "create") {
    return {
      ...draft,
      goals: [...draft.goals, {
        id: goalId,
        label: values.label,
        currentBalance: {
          currency: "GBP",
          amount: values.currentBalance,
          evidenceState: "confirmed",
          evidenceSource: "User confirmed while adding this goal"
        },
        targetBalance: {
          currency: "GBP",
          amount: values.targetBalance,
          evidenceState: "confirmed",
          evidenceSource: "User confirmed while adding this goal"
        },
        normalContribution: { currency: "GBP", amount: values.contribution },
        paused: values.paused
      }],
      goalPolicy: {
        ...draft.goalPolicy,
        allocationOrder: [...draft.goalPolicy.allocationOrder, goalId]
      }
    };
  }
  return {
    ...draft,
    goals: draft.goals.map((goal) => goal.id === goalId
      ? {
          ...goal,
          label: values.label,
          currentBalance: { ...goal.currentBalance, amount: values.currentBalance },
          targetBalance: { ...goal.targetBalance, amount: values.targetBalance },
          normalContribution: { ...goal.normalContribution, amount: values.contribution },
          paused: values.paused
        }
      : goal)
  };
}

interface GoalEditIssue {
  readonly path: string;
  readonly message: string;
}

function responseIssues(value: unknown, fallback: string): readonly GoalEditIssue[] {
  const response = value as {
    error?: {
      message?: string;
      details?: { issues?: readonly GoalEditIssue[] };
    };
  } | null;
  return response?.error?.details?.issues ?? [{ path: "$", message: response?.error?.message ?? fallback }];
}

export function GoalEditSurface({
  draft,
  goalId,
  expectedCurrentContextVersionId,
  requestKey,
  mode = "edit"
}: Readonly<{
  draft: FinancialOnboardingDraftDTO;
  goalId: string;
  expectedCurrentContextVersionId: string;
  requestKey: string;
  mode?: "edit" | "create";
}>) {
  const creating = mode === "create";
  const originalGoal = draft.goals.find((goal) => goal.id === goalId);
  if (!creating && !originalGoal) throw new Error("The selected goal is not part of the current financial plan.");

  const [values, setValues] = useState<GoalEditValues>({
    label: originalGoal?.label ?? "",
    currentBalance: originalGoal?.currentBalance.amount ?? "0.00",
    targetBalance: originalGoal?.targetBalance.amount ?? "",
    contribution: originalGoal?.normalContribution.amount ?? "",
    paused: originalGoal?.paused ?? false
  });
  const [preview, setPreview] = useState<FinancialContextPreviewDTO | null>(null);
  const [issues, setIssues] = useState<readonly GoalEditIssue[]>([]);
  const [busy, setBusy] = useState(false);

  const update = <Key extends keyof GoalEditValues,>(key: Key, value: GoalEditValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setPreview(null);
    setIssues([]);
  };

  const revisedDraft = () => buildGoalDraft(draft, goalId, values, mode);

  const requestPreview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setIssues([]);
    try {
      const response = await fetch("/api/v1/financial-context/previews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: revisedDraft(),
          mode: "revision",
          expectedCurrentContextVersionId
        })
      });
      const body = await response.json();
      if (!response.ok) {
        setIssues(responseIssues(body, "The goal preview could not be created."));
        return;
      }
      setPreview(body as FinancialContextPreviewDTO);
    } catch {
      setIssues([{ path: "$", message: "The goal preview is temporarily unavailable." }]);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    setIssues([]);
    try {
      const response = await fetch("/api/v1/financial-context/current/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: revisedDraft(),
          mode: "revision",
          expectedCurrentContextVersionId,
          requestId: `goal-${creating ? "create" : "edit"}-${requestKey}`,
          reviewedCanonicalRequestHash: preview.candidate.canonicalRequestHash
        })
      });
      const body = await response.json();
      if (!response.ok) {
        setIssues(responseIssues(body, "The goal update could not be confirmed."));
        return;
      }
      window.location.assign("/goals");
    } catch {
      setIssues([{ path: "$", message: "The goal update is temporarily unavailable." }]);
    } finally {
      setBusy(false);
    }
  };

  const previewGoal = preview?.goals.find((goal) => goal.goalId === goalId) ?? null;

  return (
    <ProductShell active="goals" className="fy-goal-edit-shell" testId="goal-edit-surface">
      <Link className="fy-goal-edit-back" href="/goals">← Your goals</Link>
      <header className="fy-surface-heading fy-goal-edit-heading">
        <p>Goal settings</p>
        <h1>{creating ? "Add goal" : "Edit goal"}</h1>
        <span>{creating
          ? "Add the goal you are working towards. Your current plan stays unchanged until you review and confirm."
          : `Update the facts Future You uses for ${originalGoal?.label}. Your current plan stays unchanged until you review and confirm.`}</span>
      </header>

      <form className="fy-goal-edit-card" onSubmit={requestPreview} aria-busy={busy}>
        <div className="fy-goal-edit-fields">
          <label>
            Goal name
            <input
              value={values.label}
              maxLength={160}
              autoComplete="off"
              onChange={(event) => update("label", event.target.value)}
            />
          </label>
          <label>
            Amount saved
            <span className="fy-money-input"><b aria-hidden="true">£</b><input inputMode="decimal" value={values.currentBalance} onChange={(event) => update("currentBalance", event.target.value)}/></span>
          </label>
          <label>
            Target amount
            <span className="fy-money-input"><b aria-hidden="true">£</b><input inputMode="decimal" value={values.targetBalance} onChange={(event) => update("targetBalance", event.target.value)}/></span>
          </label>
          <label>
            Monthly contribution
            <span className="fy-money-input"><b aria-hidden="true">£</b><input inputMode="decimal" value={values.contribution} onChange={(event) => update("contribution", event.target.value)}/></span>
          </label>
        </div>
        <label className="fy-goal-pause-control">
          <input type="checkbox" checked={values.paused} onChange={(event) => update("paused", event.target.checked)}/>
          <span><strong>Pause regular contributions</strong><small>The saved balance remains in your plan.</small></span>
        </label>
        {!preview ? (
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Building preview…" : creating ? "Preview new goal" : "Preview goal update"}</button>
        ) : null}
      </form>

      {preview && previewGoal ? (
        <section className="fy-goal-edit-preview" aria-labelledby="goal-edit-preview-title">
          <p>Review before saving</p>
          <h2 id="goal-edit-preview-title">{creating ? "Your new goal" : "Your updated goal"}</h2>
          <div>
            <span>{previewGoal.label}</span>
            <strong>{previewGoal.currentBalance.display} of {previewGoal.targetBalance.display}</strong>
            <small>{previewGoal.normalContribution.display} per month</small>
          </div>
          <dl>
            <div><dt>Expected completion</dt><dd>{previewGoal.completion.status === "COMPLETED" ? previewGoal.completion.month : `Beyond ${previewGoal.completion.projectedThrough}`}</dd></div>
            <div><dt>Total monthly goal capacity</dt><dd>{preview.contextSummary.monthlyContributionCapacity.display}</dd></div>
          </dl>
          <p className="fy-goal-edit-immutability">Saving creates a new version of your financial plan. Earlier plans and what-if results remain unchanged.</p>
          <div className="fy-goal-edit-actions">
            <button className="secondary-button" type="button" disabled={busy} onClick={() => setPreview(null)}>Continue editing</button>
            <button className="primary-button" type="button" disabled={busy} onClick={confirm}>{busy ? "Saving goal…" : creating ? "Add goal" : "Save goal changes"}</button>
          </div>
        </section>
      ) : null}

      {issues.length > 0 ? (
        <div className="form-errors fy-goal-edit-errors" role="alert">
          <strong>Check this goal</strong>
          <ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}>{issue.message}</li>)}</ul>
        </div>
      ) : null}
    </ProductShell>
  );
}
